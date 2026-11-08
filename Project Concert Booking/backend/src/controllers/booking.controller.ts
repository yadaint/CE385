import { Prisma } from "@prisma/client";
import type { BookingStatus } from "@prisma/client";
import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { MAX_TICKETS_PER_BOOKING, type CreateBookingInput } from "../schemas/booking.schema";
import { asyncHandler } from "../utils/asyncHandler";

const MAX_TRANSACTION_RETRIES = 3;

const RANDOM_ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"; // ตัด I/O กันสับสนกับ 1/0

/** สุ่มรหัส 3 ตัว คละเลขและตัวอักษรอังกฤษ */
const generateRandomRef = (length = 3): string => {
  let ref = "";
  for (let i = 0; i < length; i += 1) {
    ref += RANDOM_ALNUM[Math.floor(Math.random() * RANDOM_ALNUM.length)];
  }
  return ref;
};

/**
 * รหัสตั๋วรายที่นั่ง — รวม 10 ตัวอักษร:
 * {THA|NAT} (คอนไทย/ต่างประเทศ) + รหัสโซน 2 ตัว (เช่น GD) +
 * เลขที่นั่ง 2 ตัว (01-99) + รหัสสุ่ม 3 ตัว
 * เช่น THAGD014K7X (1 ที่นั่ง = 1 บัตร)
 */
const generateTicketCode = (origin: "THAI" | "INTERNATIONAL", zoneCode: string, seatNumber: number): string =>
  `${origin === "THAI" ? "THA" : "NAT"}${zoneCode}${String(seatNumber).padStart(2, "0")}${generateRandomRef(3)}`;

const CONCERT_SUMMARY_FIELDS = {
  id: true,
  name: true,
  venue: { select: { name: true } },
} as const;
const ZONE_SUMMARY_FIELDS = { id: true, name: true, price: true } as const;
const SEAT_SUMMARY_FIELDS = { id: true, code: true, rowLabel: true } as const;
const PAYMENT_SUMMARY_FIELDS = {
  id: true,
  slipImage: true,
  status: true,
  note: true,
  createdAt: true,
} as const;

/** แปลงแถวของ `bookingSeats` ให้เป็นรายการที่นั่งอย่างง่ายสำหรับ API response (แนบรหัสตั๋วรายที่นั่ง) */
export const withFlatSeats = <T extends { seats: Array<{ ticketCode?: string | null; seat: object }> }>(
  booking: T,
) => ({
  ...booking,
  seats: booking.seats.map((bookingSeat) => ({
    ...bookingSeat.seat,
    ticketCode: bookingSeat.ticketCode ?? null,
  })),
});

/**
 * จองที่นั่งเฉพาะตัวภายใน Prisma Interactive Transaction ระดับ isolation
 * SERIALIZABLE เพื่อไม่ให้สองคำขอพร้อมกันจองที่นั่งตัวเดียวกันได้
 *
 * ขั้นตอนภายใน transaction:
 *   1. โหลดที่นั่งที่ขอทั้งหมด (404 ถ้ามีที่นั่งใดหาย)
 *   2. บังคับกฎโซนเดียวกัน + สถานะว่าง (409 เมื่อขัดแย้ง)
 *   3. Mark ที่นั่งเป็น taken (`isAvailable: false`)
 *   4. ลดตัวนับ `availableSeats` ของโซน
 *   5. สร้าง Booking พร้อมแถว BookingSeat
 *
 * หาก PostgreSQL ยกเลิก transaction เพราะ concurrent write
 * (Prisma error P2034) จะ retry ทั้ง transaction สูงสุด
 * MAX_TRANSACTION_RETRIES ครั้ง
 */
const performBookingTransaction = (userId: string, seatIds: string[], showDate: Date) =>
  prisma.$transaction(
    async (tx) => {
      const seats = await tx.seat.findMany({
        where: { id: { in: seatIds } },
        include: { zone: true },
      });

      if (seats.length !== seatIds.length) {
        throw new AppError("ไม่พบที่นั่งบางส่วนที่คุณเลือก", 404);
      }

      const zoneIds = new Set(seats.map((seat) => seat.zoneId));
      if (zoneIds.size !== 1) {
        throw new AppError("ที่นั่งทั้งหมดใน 1 การจองต้องอยู่ในโซนเดียวกัน", 400);
      }

      const zone = seats[0]!.zone;
      const quantity = seats.length;

      // ตรวจว่าวันที่ที่เลือกอยู่ในรอบการแสดงของคอนเสิร์ตนี้จริง + คอนต้องเปิดขายแล้วเท่านั้น
      const concert = await tx.concert.findUnique({
        where: { id: zone.concertId },
        select: {
          id: true,
          name: true,
          dates: true,
          saleStatus: true,
          origin: true,
          saleEndDate: true,
        },
      });
      if (!concert) {
        throw new AppError("ไม่พบคอนเสิร์ตนี้", 404);
      }
      if (concert.saleStatus !== "OPEN") {
        throw new AppError("คอนเสิร์ตนี้ยังไม่เปิดให้จอง หรือปิดการขายแล้ว", 403);
      }
      // ถึงวันสุดท้ายของการขายแล้ว → ปิดการจองทันที (ไม่รอ auto-close job)
      if (concert.saleEndDate && concert.saleEndDate.getTime() <= Date.now()) {
        await tx.concert.update({
          where: { id: concert.id },
          data: { saleStatus: "CLOSED" },
        });
        throw new AppError("คอนเสิร์ตนี้หมดเวลาการขายแล้ว (ถึงวันสุดท้ายที่กำหนด)", 403);
      }
      if (!concert.dates.some((date) => date.getTime() === showDate.getTime())) {
        throw new AppError("วันที่ที่เลือกไม่อยู่ในรอบการแสดงของคอนเสิร์ตนี้", 400);
      }

      const takenSeats = seats.filter((seat) => !seat.isAvailable);
      if (takenSeats.length > 0) {
        throw new AppError(
          `ที่นั่ง ${takenSeats.map((seat) => seat.code).join(", ")} ถูกจองไปแล้ว กรุณาเลือกที่นั่งใหม่`,
          409,
        );
      }

      if (zone.availableSeats < quantity) {
        throw new AppError(
          `ที่นั่งในโซน ${zone.name} ไม่พอ — เหลือเพียง ${zone.availableSeats} ที่นั่ง`,
          409,
        );
      }

      // Mark ที่นั่งทั้งหมดว่าถูกจอง
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { isAvailable: false },
      });

      const updatedZone = await tx.zone.update({
        where: { id: zone.id },
        data: { availableSeats: { decrement: quantity } },
      });

      // กรรมการสำรอง: ห้ามบันทึกจำนวนที่นั่งติดลบเด็ดขาด
      if (updatedZone.availableSeats < 0) {
        throw new AppError("เกิดข้อขัดแย้งในการจัดสรรที่นั่ง — กรุณาลองอีกครั้ง", 409);
      }

      // ─── แจ้งเตือนหลังบ้านเมื่อบัตรหมด ────────────────────────
      // โซนหมด (availableSeats = 0) → บันทึกแจ้งเตือนรายโซน (ครั้งเดียวต่อโซน)
      if (updatedZone.availableSeats === 0) {
        const concertName = concert.name;
        const alreadyNotified = await tx.notification.findFirst({
          where: { zoneId: zone.id, type: "ZONE_SOLD_OUT" },
          select: { id: true },
        });
        if (!alreadyNotified) {
          await tx.notification.create({
            data: {
              type: "ZONE_SOLD_OUT",
              title: "บัตรในโซนหมดแล้ว",
              message: `โซน "${zone.name}" ของคอนเสิร์ต "${concertName}" มีบัตรหมดแล้ว (ทั้งหมด ${zone.totalSeats} ที่นั่ง)`,
              concertId: zone.concertId,
              zoneId: zone.id,
            },
          });
        }

        // ทุกโซนที่เปิดขายหมดเกลี้ยง → เปลี่ยนสถานะคอนเสิร์ตเป็น SOLD_OUT + แจ้งเตือน
        const remainingBookable = await tx.zone.count({
          where: {
            concertId: zone.concertId,
            isOnSale: true,
            availableSeats: { gt: 0 },
          },
        });
        const onSaleCount = await tx.zone.count({
          where: { concertId: zone.concertId, isOnSale: true },
        });

        if (onSaleCount > 0 && remainingBookable === 0) {
          await tx.concert.update({
            where: { id: zone.concertId },
            data: { saleStatus: "SOLD_OUT" },
          });

          const concertNotified = await tx.notification.findFirst({
            where: { concertId: zone.concertId, type: "CONCERT_SOLD_OUT" },
            select: { id: true },
          });
          if (!concertNotified) {
            await tx.notification.create({
              data: {
                type: "CONCERT_SOLD_OUT",
                title: "บัตรทั้งคอนเสิร์ตหมดแล้ว",
                message: `คอนเสิร์ต "${concertName}" บัตรทุกโซนหมดแล้ว — ระบบตั้งสถานะเป็น SOLD_OUT อัตโนมัติ`,
                concertId: zone.concertId,
              },
            });
          }
        }
      }

      // สร้างรหัสตั๋วรายที่นั่ง — 1 ที่นั่ง = 1 บัตร (10 ตัวอักษร)
      // {THA|NAT} + รหัสโซน + เลขที่นั่ง 2 หลัก + สุ่ม 3 ตัว
      const bookedSeats = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);
      let seatTicketCodes = bookedSeats.map((seat) =>
        generateTicketCode(concert.origin, zone.code, seat.seatNumber),
      );

      // กันรหัสซ้ำ: เช็คทั้ง BookingSeat และ Booking แล้วสุ่มใหม่เฉพาะตัวที่ชน (สูงสุด 5 รอบ)
      for (let round = 0; round < 5; round++) {
        const seatClash = await tx.bookingSeat.findMany({
          where: { ticketCode: { in: seatTicketCodes } },
          select: { ticketCode: true },
        });
        const bookingClash = await tx.booking.findMany({
          where: { ticketCode: { in: seatTicketCodes } },
          select: { ticketCode: true },
        });
        const used = new Set([...seatClash, ...bookingClash].map((row) => row.ticketCode));

        if (used.size === 0) break;

        seatTicketCodes = seatTicketCodes.map((code) =>
          used.has(code) ? generateTicketCode(concert.origin, zone.code, Number(code.slice(5, 7))) : code,
        );
      }

      const booking = await tx.booking.create({
        data: {
          userId,
          concertId: zone.concertId,
          zoneId: zone.id,
          showDate,
          ticketCode: seatTicketCodes[0],
          quantity,
          totalPrice: Number((zone.price * quantity).toFixed(2)),
          status: "PENDING",
          seats: {
            create: bookedSeats.map((seat, index) => ({
              seatId: seat.id,
              ticketCode: seatTicketCodes[index],
            })),
          },
        },
        include: {
          zone: { select: ZONE_SUMMARY_FIELDS },
          concert: { select: CONCERT_SUMMARY_FIELDS },
          seats: { include: { seat: { select: SEAT_SUMMARY_FIELDS } } },
          payment: { select: PAYMENT_SUMMARY_FIELDS },
        },
      });

      return booking;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
    },
  );

const bookSeatsWithRetry = async (
  userId: string,
  seatIds: string[],
  showDate: Date,
): Promise<ReturnType<typeof performBookingTransaction>> => {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt++) {
    try {
      return await performBookingTransaction(userId, seatIds, showDate);
    } catch (error) {
      const isWriteConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

      // P2034 = transaction ล้มเหลวเพราะการเขียนพร้อมกัน → retry
      // ยกเว้นถ้าเป็นรอบสุดท้ายแล้ว
      if (!isWriteConflict || attempt === MAX_TRANSACTION_RETRIES) {
        throw error;
      }
    }
  }

  throw new AppError("ผู้ใช้จำนวนมากเข้าใช้พร้อมกัน การจองล้มเหลว — กรุณาลองอีกครั้ง", 409);
};

/** POST /api/v1/bookings — จองที่นั่งที่เลือกเฉพาะตัว พร้อมเลือกวันที่แสดง (สถานะเริ่มต้น = รอชำระเงิน) */
export const createBooking = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id; // รับประกันโดย middleware `authenticate`

    // ระบบจองสำหรับผู้ใช้ทั่วไปเท่านั้น — แอดมินดูแลหลังบ้าน ไม่ทำการจอง
    if (req.user!.role === "ADMIN") {
      throw new AppError("บัญชีแอดมินไม่สามารถจองบัตรได้ — กรุณาใช้บัญชีผู้ใช้ทั่วไป", 403);
    }

    const { showDate, seatIds } = req.body as CreateBookingInput;

    // ตัด seat id ที่ซ้ำออก (กันข้อผิดพลาดจากฝั่งขอ)
    const uniqueSeatIds = Array.from(new Set(seatIds));

    if (uniqueSeatIds.length > MAX_TICKETS_PER_BOOKING) {
      throw new AppError(`จองได้สูงสุด ${MAX_TICKETS_PER_BOOKING} ที่นั่งต่อการจอง`, 422);
    }

    const bookingRecord = await bookSeatsWithRetry(userId, uniqueSeatIds, showDate);

    res.status(201).json({
      success: true,
      message: "จองที่นั่งสำเร็จ — กรุณาชำระเงินและแนบสลิปเพื่อยืนยันการจอง",
      data: { booking: withFlatSeats(bookingRecord) },
    });
  },
);

/**
 * POST /api/v1/bookings/:id/slip — แนบสลิปการชำระเงิน (เฉพาะเจ้าของการจอง)
 * รับไฟล์รูปภาพ (multipart/form-data, field name = slipImage)
 * เมื่อส่งสลิป → บัตรเปลี่ยนเป็น "รอตรวจสอบสลิป" และรอแอดมินอนุมัติ
 */
export const uploadBookingSlip = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id;
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      throw new AppError("กรุณาแนบรูปสลิปการชำระเงิน", 400);
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking || booking.userId !== userId) {
      throw new AppError("ไม่พบการจองนี้", 404);
    }

    if (booking.status === "COMPLETED") {
      throw new AppError("การจองนี้ชำระเงินสำเร็จแล้ว ไม่จำเป็นต้องส่งสลิป", 400);
    }

    if (booking.status === "CANCELLED") {
      throw new AppError("การจองนี้ถูกยกเลิกไปแล้ว ไม่สามารถส่งสลิปได้", 400);
    }

    const slipPath = `/uploads/slips/${file.filename}`;

    // มีสลิปเดิมอยู่แล้ว (เคยถูกปฏิเสธ) → อัปเดตสลิปใหม่และเข้าคิวตรวจสอบใหม่
    if (booking.payment) {
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          slipImage: slipPath,
          status: "PENDING_VERIFICATION",
          note: null,
          reviewedAt: null,
          reviewedBy: null,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          slipImage: slipPath,
          status: "PENDING_VERIFICATION",
        },
      });
    }

    const bookingRecord = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "PENDING_VERIFICATION" },
      include: {
        zone: { select: ZONE_SUMMARY_FIELDS },
        concert: { select: CONCERT_SUMMARY_FIELDS },
        seats: { include: { seat: { select: SEAT_SUMMARY_FIELDS } } },
        payment: { select: PAYMENT_SUMMARY_FIELDS },
      },
    });

    res.status(201).json({
      success: true,
      message: "ส่งสลิปเรียบร้อย — รอแอดมินตรวจสอบการชำระเงิน",
      data: { booking: withFlatSeats(bookingRecord) },
    });
  },
);

/** GET /api/v1/bookings/check/:id — ตรวจสอบสถานะตั๋วด้วยรหัสการจอง (สาธารณะ ไม่ต้องล็อกอิน) */
export const checkBooking = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        zone: { select: ZONE_SUMMARY_FIELDS },
        concert: { select: CONCERT_SUMMARY_FIELDS },
        seats: { include: { seat: { select: SEAT_SUMMARY_FIELDS } } },
        payment: { select: { status: true, note: true } },
      },
    });

    if (!booking) {
      throw new AppError("ไม่พบรหัสการจองนี้ในระบบ กรุณาตรวจสอบรหัสอีกครั้ง", 404);
    }

    // ไม่ส่งข้อมูลส่วนตัวของผู้จองกลับไป (เช่น userId) เพราะเป็นเส้นทางสาธารณะ
    const { userId: _userId, ...safeBooking } = withFlatSeats(booking);

    const statusMessages: Record<BookingStatus, string> = {
      PENDING: "บัตรอยู่ในสถานะรอชำระเงิน — กรุณาแนบสลิปการชำระเงิน",
      PENDING_VERIFICATION: "บัตรอยู่ในสถานะรอตรวจสอบสลิป — แอดมินกำลังตรวจสอบการชำระเงิน",
      COMPLETED: "จองสำเร็จ! บัตรมีผลใช้งานปกติ",
      REJECTED: "สลิปไม่ผ่านการตรวจสอบ กรุณาส่งสลิปใหม่",
      CANCELLED: "บัตรนี้ถูกยกเลิกแล้ว",
    };

    res.status(200).json({
      success: true,
      message: statusMessages[booking.status],
      data: { booking: safeBooking },
    });
  },
);

/** GET /api/v1/bookings/my-bookings — ประวัติการจองของผู้ใช้ที่ล็อกอินอยู่ */
export const getMyBookings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const bookingRecords = await prisma.booking.findMany({
      where: { userId },
      include: {
        zone: { select: ZONE_SUMMARY_FIELDS },
        concert: { select: CONCERT_SUMMARY_FIELDS },
        seats: { include: { seat: { select: SEAT_SUMMARY_FIELDS } } },
        payment: { select: PAYMENT_SUMMARY_FIELDS },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { bookings: bookingRecords.map((record) => withFlatSeats(record)) },
    });
  },
);

/** PATCH /api/v1/bookings/:id/cancel — ยกเลิกการจองและปล่อยที่นั่งคืน */
export const cancelBooking = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id;
    const userId = req.user!.id;

    const bookingRecord = await prisma.$transaction(
      async (tx) => {
        const existingBooking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { seats: { include: { seat: true } } },
        });

        if (!existingBooking || existingBooking.userId !== userId) {
          throw new AppError("ไม่พบการจองนี้", 404);
        }

        if (existingBooking.status === "CANCELLED") {
          throw new AppError("การจองนี้ถูกยกเลิกไปแล้ว", 400);
        }

        const cancelled = await tx.booking.update({
          where: { id: bookingId },
          data: { status: "CANCELLED" },
          include: {
            zone: { select: ZONE_SUMMARY_FIELDS },
            concert: { select: CONCERT_SUMMARY_FIELDS },
            seats: { include: { seat: { select: SEAT_SUMMARY_FIELDS } } },
          },
        });

        const seatIds = existingBooking.seats.map((bookingSeat) => bookingSeat.seatId);

        // ปล่อยที่นั่งกลับคืนภายใน transaction เดียวกัน
        await tx.seat.updateMany({
          where: { id: { in: seatIds } },
          data: { isAvailable: true },
        });

        await tx.zone.update({
          where: { id: cancelled.zoneId },
          data: { availableSeats: { increment: cancelled.quantity } },
        });

        return cancelled;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15_000,
      },
    );

    res.status(200).json({
      success: true,
      message: "ยกเลิกการจองสำเร็จ — ปล่อยที่นั่งกลับคืนแล้ว",
      data: { booking: withFlatSeats(bookingRecord) },
    });
  },
);
