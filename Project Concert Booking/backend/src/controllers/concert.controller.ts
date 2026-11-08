import type { ArtistType, Origin } from "@prisma/client";
import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import type {
  ConcertQuery,
  CreateConcertInput,
  SaleStatusInput,
  UpdateConcertInput,
  UpdateConcertZonesInput,
} from "../schemas/concert.schema";
import { asyncHandler } from "../utils/asyncHandler";
import { buildSeatRows } from "../utils/seats";

/** ปิดขายอัตโนมัติ: OPEN → CLOSED เมื่อถึงวันสุดท้ายของการขาย (saleEndDate) */
export const closeExpiredConcertSales = async (): Promise<number> => {
  const result = await prisma.concert.updateMany({
    where: { saleStatus: "OPEN", saleEndDate: { lte: new Date() } },
    data: { saleStatus: "CLOSED" },
  });
  return result.count;
};

/** GET /api/v1/concerts — สาธารณะ (กรองตาม origin / artistType ได้ผ่าน query params) */
export const getAllConcerts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // ปิดขายอัตโนมัติก่อนแสดงรายการ (เผื่อ interval ยังไม่ทำงาน)
    await closeExpiredConcertSales();

    // validate({ query: concertQuerySchema }) ตรวจและแปลง query params ให้แล้ว
    const { origin, artistType } = req.query as ConcertQuery & {
      origin?: Origin;
      artistType?: ArtistType;
    };

    // ผู้ใช้ทั่วไปเห็นเฉพาะคอนที่ "เปิดขายแล้ว" (OPEN) หรือ "บัตรหมด" (SOLD_OUT)
    // คอนสถานะ DRAFT / CLOSED จะไม่ปรากฏบนหน้าจอง
    const concerts = await prisma.concert.findMany({
      where: {
        saleStatus: { in: ["OPEN", "SOLD_OUT"] },
        ...(origin ? { origin } : {}),
        ...(artistType ? { artistType } : {}),
      },
      include: {
        venue: { select: { name: true } },
        zones: { orderBy: { sortOrder: "asc" } },
      },
    });

    // เรียงตามวันแสดงวันแรกของแต่ละงาน (ใกล้สุดก่อน)
    concerts.sort((a, b) => {
      const aFirst = a.dates.length > 0 ? Math.min(...a.dates.map((d) => d.getTime())) : Number.MAX_SAFE_INTEGER;
      const bFirst = b.dates.length > 0 ? Math.min(...b.dates.map((d) => d.getTime())) : Number.MAX_SAFE_INTEGER;
      return aFirst - bFirst;
    });

    res.status(200).json({
      success: true,
      data: { concerts },
    });
  },
);

/** GET /api/v1/concerts/:id — สาธารณะ (รวมโซนและที่นั่งรายที่นั่งทั้งหมด) */
export const getConcertById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const concert = await prisma.concert.findUnique({
      where: { id },
      include: {
        venue: { select: { name: true } },
        zones: {
          orderBy: { sortOrder: "asc" },
          include: {
            seats: { orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }] },
          },
        },
      },
    });
    if (!concert) {
      throw new AppError("ไม่พบคอนเสิร์ตนี้", 404);
    }

    // คอนที่ยังไม่เปิดขาย (DRAFT) หรือถูกปิดขาย (CLOSED) — ผู้ใช้ทั่วไปเข้าดูไม่ได้
    if (concert.saleStatus === "DRAFT" || concert.saleStatus === "CLOSED") {
      throw new AppError("คอนเสิร์ตนี้ยังไม่เปิดให้จอง — กรุณาติดตามการเปิดขายอีกครั้ง", 403);
    }

    res.status(200).json({
      success: true,
      data: { concert },
    });
  },
);

/**
 * POST /api/v1/concerts — เฉพาะ ADMIN (บังคับโดย middleware ในเส้นทาง)
 *
 * ทีมงานเลือก "สถานที่จัดงาน" → ระบบใช้ผังโซน FIX ประจำสถานที่นั้น
 * (ชื่อโซน/รหัส/ตำแหน่ง/จำนวนแถว-ที่นั่ง มาจากสถานที่ ไม่ต้องกรอกเอง)
 * ทีมงานกำหนดเพียง: ราคาบัตรรายโซน + เปิด/ปิดขายรายโซน
 * (โซนที่ปิดขาย = isOnSale: false จะแสดงเป็นสีเทาบนผัง เลือกซื้อไม่ได้)
 */
export const createConcert = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      nameEn,
      description,
      dates,
      venueId,
      origin,
      artistType,
      imageUrl,
      emoji,
      saleEndDate,
      zones,
    } = req.body as CreateConcertInput;

    // โหลดผังโซน FIX ประจำสถานที่ที่เลือก
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { zones: { orderBy: { mapRow: "asc" } } },
    });
    if (!venue) {
      throw new AppError("ไม่พบสถานที่จัดงานที่เลือก", 404);
    }

    // แมปราคา/สถานะเปิดขายจาก payload ตามรหัสโซนของสถานที่
    const settingByCode = new Map(zones.map((zone) => [zone.code, zone]));

    const concert = await prisma.concert.create({
      data: {
        name,
        nameEn: nameEn?.trim() ? nameEn.trim() : null,
        description,
        dates: [...dates].sort((a, b) => a.getTime() - b.getTime()),
        venueId: venue.id,
        origin,
        artistType,
        imageUrl: imageUrl ?? null,
        emoji: emoji ?? null,
        saleEndDate: saleEndDate ?? null,
        zones: {
          create: venue.zones.map((venueZone) => {
            const setting = settingByCode.get(venueZone.code);
            const totalSeats = venueZone.rowCount * venueZone.seatsPerRow;
            const isOnSale = setting?.isOnSale ?? true;

            return {
              name: venueZone.name,
              code: venueZone.code,
              side: venueZone.side,
              wide: venueZone.wide,
              sortOrder: venueZone.mapRow,
              price: setting?.price ?? 0,
              totalSeats,
              availableSeats: isOnSale ? totalSeats : 0,
              isOnSale,
              // สร้างที่นั่งรายที่นั่งเฉพาะโซนที่เปิดขาย
              seats: isOnSale
                ? { create: buildSeatRows(totalSeats, venueZone.seatsPerRow) }
                : undefined,
            };
          }),
        },
      },
      include: {
        zones: { orderBy: { sortOrder: "asc" } },
        venue: { select: { name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: "สร้างคอนเสิร์ตสำเร็จ",
      data: { concert },
    });
  },
);

/**
 * PATCH /api/v1/concerts/:id — เฉพาะ ADMIN: แก้ไขข้อมูลคอนเสิร์ตที่สร้างไว้แล้ว
 * ส่งเฉพาะฟิลด์ที่ต้องการแก้ (name/description/dates/imageUrl/emoji/origin/artistType)
 * เปลี่ยนสถานที่ไม่ได้ เพราะโซนและที่นั่งถูกสร้างตามผังของสถานที่เดิม
 */
export const updateConcert = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = req.body as UpdateConcertInput;

    const existing = await prisma.concert.findUnique({
      where: { id },
      select: { id: true, saleStatus: true },
    });
    if (!existing) {
      throw new AppError("ไม่พบคอนเสิร์ตนี้", 404);
    }

    // คอนที่ "ปิดการขาย" หรือ "ยกเลิกการขาย" แล้ว แก้ไขข้อมูลไม่ได้อีก (ป้องกันปัญหาหลังการขาย)
    if (existing.saleStatus === "CLOSED" || existing.saleStatus === "CANCELLED") {
      throw new AppError(
        existing.saleStatus === "CANCELLED"
          ? "ยกเลิกการขายแล้ว — ไม่สามารถแก้ไขข้อมูลคอนเสิร์ตได้อีก"
          : "ปิดการขายแล้ว — ต้องกดเปิดขายก่อนจึงจะแก้ไขข้อมูลได้",
        403,
      );
    }

    const concert = await prisma.concert.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nameEn !== undefined ? { nameEn: data.nameEn?.trim() ? data.nameEn.trim() : null } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.dates !== undefined
          ? { dates: [...data.dates].sort((a, b) => a.getTime() - b.getTime()) }
          : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl ?? null } : {}),
        ...(data.emoji !== undefined ? { emoji: data.emoji ?? null } : {}),
        ...(data.saleEndDate !== undefined ? { saleEndDate: data.saleEndDate ?? null } : {}),
        ...(data.origin !== undefined ? { origin: data.origin } : {}),
        ...(data.artistType !== undefined ? { artistType: data.artistType } : {}),
      },
      include: {
        venue: { select: { name: true } },
        zones: { orderBy: { sortOrder: "asc" } },
      },
    });

    res.status(200).json({
      success: true,
      message: "แก้ไขข้อมูลคอนเสิร์ตสำเร็จ",
      data: { concert },
    });
  },
);

/** DELETE /api/v1/concerts/:id — เฉพาะ ADMIN: ลบคอนเสิร์ตแบบร่าง (DRAFT เท่านั้น) */
export const deleteConcert = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const concert = await prisma.concert.findUnique({
      where: { id },
      select: { id: true, name: true, saleStatus: true },
    });
    if (!concert) {
      throw new AppError("ไม่พบคอนเสิร์ตนี้", 404);
    }
    if (concert.saleStatus !== "DRAFT") {
      throw new AppError(
        "ลบได้เฉพาะคอนเสิร์ตแบบร่าง (DRAFT) เท่านั้น — คอนที่เปิดขายแล้วให้ใช้ปุ่มปิดขายแทน",
        400,
      );
    }

    // โซน/ที่นั่ง/การจอง/สลิป ถูก cascade ลบตามความสัมพันธ์ใน schema
    await prisma.concert.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `ลบคอนเสิร์ตแบบร่าง "${concert.name}" สำเร็จ`,
    });
  },
);

/** PATCH /api/v1/concerts/:id/sale-status — เฉพาะ ADMIN: เปิด/ปิด/ยกเลิกการขายบัตร
 * OPEN     = เปิดขาย → คอนจะปรากฏบนหน้าจองของผู้ใช้
 * CLOSED   = ปิดขาย → คอนหายไปจากหน้าจอง แต่ยังอยู่ในหลังบ้าน (เปิดใหม่ได้)
 * CANCELLED = ยกเลิกการขายถาวร → ป้องกันปัญหาระหว่างเปิดขาย แก้ไขข้อมูลไม่ได้อีก
 * (ต้องมีโซนเปิดขายและมีที่นั่งคงเหลืออย่างน้อย 1 ที่นั่ง จึงจะเปิดขายได้)
 */
export const updateConcertSaleStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body as SaleStatusInput;

    const concert = await prisma.concert.findUnique({
      where: { id },
      include: { zones: { select: { id: true, name: true, isOnSale: true, availableSeats: true } } },
    });
    if (!concert) {
      throw new AppError("ไม่พบคอนเสิร์ตนี้", 404);
    }
    if (concert.saleStatus === "CANCELLED") {
      throw new AppError("คอนเสิร์ตนี้ถูกยกเลิกการขายแล้ว — เปลี่ยนสถานะไม่ได้อีก", 400);
    }
    if (status === "CANCELLED" && concert.saleStatus !== "OPEN") {
      throw new AppError("ยกเลิกการขายได้เฉพาะคอนเสิร์ตที่กำลังเปิดขายอยู่เท่านั้น", 400);
    }
    if (status === "OPEN") {
      const canOpen = concert.zones.some((zone) => zone.isOnSale && zone.availableSeats > 0);
      if (!canOpen) {
        throw new AppError("เปิดขายไม่ได้ — ไม่มีโซนเปิดขายที่ยังมีที่นั่งเหลือ", 400);
      }
    }

    await prisma.concert.update({
      where: { id },
      data: { saleStatus: status },
    });

    const message =
      status === "OPEN"
        ? "เปิดขายบัตรสำเร็จ — คอนเสิร์ตปรากฏบนหน้าจองแล้ว"
        : status === "CLOSED"
          ? "ปิดขายชั่วคราวสำเร็จ — ซ่อนจากหน้าจองของผู้ใช้"
          : "ยกเลิกการขายสำเร็จ — คอนเสิร์ตถูกยกเลิกถาวร และแก้ไขข้อมูลไม่ได้อีก";

    res.status(200).json({
      success: true,
      message,
      data: { concert: await prisma.concert.findUnique({ where: { id } }) },
    });
  },
);

/**
 * PATCH /api/v1/concerts/:id/zones — เฉพาะ ADMIN: ปรับราคา/เปิด-ปิดขายรายโซน
 * (หลังจากสร้างคอนเสิร์ตแล้ว โซนและที่นั่งตายตัว แก้ได้เฉพาะราคาและสถานะการขาย)
 */
export const updateConcertZones = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { zones } = req.body as UpdateConcertZonesInput;

    const existing = await prisma.concert.findUnique({
      where: { id },
      include: { zones: { select: { id: true } } },
    });
    if (!existing) {
      throw new AppError("ไม่พบคอนเสิร์ตนี้", 404);
    }

    const zoneIds = new Set(existing.zones.map((zone) => zone.id));
    const unknown = zones.filter((zone) => !zoneIds.has(zone.zoneId));
    if (unknown.length > 0) {
      throw new AppError("ระบุรหัสโซนไม่ถูกต้อง — พบโซนที่ไม่อยู่ในคอนเสิร์ตนี้", 400);
    }

    await prisma.$transaction(
      zones.map((zone) =>
        prisma.zone.update({
          where: { id: zone.zoneId },
          data: {
            ...(zone.price !== undefined ? { price: zone.price } : {}),
            ...(zone.isOnSale !== undefined ? { isOnSale: zone.isOnSale } : {}),
          },
        }),
      ),
    );

    const concert = await prisma.concert.findUnique({
      where: { id },
      include: {
        venue: { select: { name: true } },
        zones: { orderBy: { sortOrder: "asc" } },
      },
    });

    res.status(200).json({
      success: true,
      message: "อัปเดตการตั้งค่าโซนสำเร็จ",
      data: { concert },
    });
  },
);
