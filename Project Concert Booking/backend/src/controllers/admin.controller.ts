import type { BookingStatus, PaymentStatus } from "@prisma/client";
import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { withFlatSeats } from "./booking.controller";
import { asyncHandler } from "../utils/asyncHandler";

const CONCERT_SUMMARY_FIELDS = {
  id: true,
  name: true,
  nameEn: true,
  venue: { select: { name: true } },
} as const;
const ZONE_SUMMARY_FIELDS = { id: true, name: true, price: true } as const;
const SEAT_SUMMARY_FIELDS = { id: true, code: true, rowLabel: true } as const;

/** GET /api/v1/admin/stats — สถิติภาพรวมทั้งระบบ */
export const getAdminStats = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const [userCount, concertCount, bookingsByStatus, revenueResult, pendingPayments, unreadNotifications, concertsBySaleStatus] =
      await Promise.all([
        prisma.user.count(),
        prisma.concert.count(),
        prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.booking.aggregate({
          _sum: { totalPrice: true },
          where: { status: "COMPLETED" },
        }),
        prisma.payment.count({ where: { status: "PENDING_VERIFICATION" } }),
        prisma.notification.count({ where: { isRead: false } }),
        prisma.concert.groupBy({ by: ["saleStatus"], _count: { _all: true } }),
      ]);

    const byStatus: Record<BookingStatus, number> = {
      PENDING: 0,
      PENDING_VERIFICATION: 0,
      COMPLETED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    let totalBookings = 0;
    for (const group of bookingsByStatus) {
      byStatus[group.status] = group._count._all;
      totalBookings += group._count._all;
    }

    const bySaleStatus: Record<string, number> = {
      DRAFT: 0,
      OPEN: 0,
      CLOSED: 0,
      SOLD_OUT: 0,
    };
    for (const group of concertsBySaleStatus) {
      bySaleStatus[group.saleStatus] = group._count._all;
    }

    res.status(200).json({
      success: true,
      data: {
        stats: {
          users: userCount,
          concerts: concertCount,
          revenue: revenueResult._sum.totalPrice ?? 0,
          pendingPayments,
          unreadNotifications,
          concertsBySaleStatus: bySaleStatus,
          bookings: { total: totalBookings, byStatus },
        },
      },
    });
  },
);

/** GET /api/v1/admin/concerts — คอนเสิร์ตทุกสถานะในหลังบ้าน พร้อมสรุปที่นั่งคงเหลือรายโซน */
export const getAdminConcerts = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const concerts = await prisma.concert.findMany({
      include: {
        venue: { select: { name: true } },
        zones: { orderBy: { sortOrder: "asc" } },
      },
    });

    // เรียงตามวันแสดงวันแรก (ใกล้สุดก่อน)
    concerts.sort((a, b) => {
      const aFirst = a.dates.length > 0 ? Math.min(...a.dates.map((d) => d.getTime())) : Number.MAX_SAFE_INTEGER;
      const bFirst = b.dates.length > 0 ? Math.min(...b.dates.map((d) => d.getTime())) : Number.MAX_SAFE_INTEGER;
      return aFirst - bFirst;
    });

    res.status(200).json({
      success: true,
      data: {
        concerts: concerts.map((concert) => {
          const onSaleZones = concert.zones.filter((zone) => zone.isOnSale);
          const totalSeats = concert.zones.reduce((sum, zone) => sum + zone.totalSeats, 0);
          const availableSeats = concert.zones.reduce((sum, zone) => sum + zone.availableSeats, 0);

          return {
            id: concert.id,
            name: concert.name,
            description: concert.description,
            dates: concert.dates,
            saleStatus: concert.saleStatus,
            origin: concert.origin,
            artistType: concert.artistType,
            imageUrl: concert.imageUrl,
            emoji: concert.emoji,
            venue: concert.venue,
            totalSeats,
            availableSeats,
            soldOutZoneCount: onSaleZones.filter((zone) => zone.availableSeats === 0).length,
            onSaleZoneCount: onSaleZones.length,
            zones: concert.zones,
            createdAt: concert.createdAt,
            updatedAt: concert.updatedAt,
          };
        }),
      },
    });
  },
);

/** GET /api/v1/admin/concerts/:id/seats — ผังที่นั่งเรียลไทม์ พร้อมสถานะการจองรายที่นั่ง */
export const getConcertSeatMap = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const concertId = req.params.id;

    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
      select: {
        id: true,
        name: true,
        dates: true,
        saleStatus: true,
        venue: { select: { name: true } },
        zones: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            code: true,
            price: true,
            side: true,
            wide: true,
            sortOrder: true,
            isOnSale: true,
            totalSeats: true,
            availableSeats: true,
            seats: {
              select: {
                id: true,
                code: true,
                rowLabel: true,
                seatNumber: true,
                isAvailable: true,
              },
              orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }],
            },
          },
        },
      },
    });

    if (!concert) {
      throw new AppError("ไม่พบคอนเสิร์ตนี้", 404);
    }

    // ดึงสถานะการจองของทุกที่นั่งที่ถูกถือไว้ (ยกเว้นที่ถูกยกเลิก = ว่างตามจริง)
    const bookings = await prisma.booking.findMany({
      where: { concertId, status: { not: "CANCELLED" } },
      select: { status: true, seats: { select: { seatId: true } } },
    });

    const bookingStatusBySeat = new Map<string, BookingStatus>();
    for (const booking of bookings) {
      for (const bookingSeat of booking.seats) {
        bookingStatusBySeat.set(bookingSeat.seatId, booking.status);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        concert: {
          id: concert.id,
          name: concert.name,
          dates: concert.dates,
          saleStatus: concert.saleStatus,
          venue: concert.venue,
        },
        zones: concert.zones.map((zone) => ({
          id: zone.id,
          name: zone.name,
          code: zone.code,
          price: zone.price,
          side: zone.side,
          wide: zone.wide,
          sortOrder: zone.sortOrder,
          isOnSale: zone.isOnSale,
          totalSeats: zone.totalSeats,
          availableSeats: zone.availableSeats,
          seats: zone.seats.map((seat) => ({
            ...seat,
            bookingStatus: bookingStatusBySeat.get(seat.id) ?? null,
          })),
        })),
      },
    });
  },
);

/** GET /api/v1/admin/concerts/:id/tickets — รายการตั๋วของคอนเสิร์ต (กรองรายโซน/สถานะได้) */
export const getConcertTickets = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const concertId = req.params.id;
    const { zoneId, status } = req.query as { zoneId?: string; status?: BookingStatus };

    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
      select: {
        id: true,
        name: true,
        dates: true,
        saleStatus: true,
        venue: { select: { name: true } },
        zones: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, code: true, price: true, totalSeats: true, availableSeats: true },
        },
      },
    });

    if (!concert) {
      throw new AppError("ไม่พบคอนเสิร์ตนี้", 404);
    }

    const tickets = await prisma.booking.findMany({
      where: {
        concertId,
        ...(zoneId ? { zoneId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        user: { select: { email: true } },
        zone: { select: { id: true, name: true, code: true, price: true } },
        concert: { select: CONCERT_SUMMARY_FIELDS },
        seats: { include: { seat: { select: SEAT_SUMMARY_FIELDS } } },
        payment: {
          select: {
            id: true,
            status: true,
            note: true,
            reviewedAt: true,
            reviewer: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: {
        concert: {
          id: concert.id,
          name: concert.name,
          dates: concert.dates,
          saleStatus: concert.saleStatus,
          venue: concert.venue,
          zones: concert.zones,
        },
        tickets: tickets.map((ticket) => ({
          ...withFlatSeats(ticket),
          user: ticket.user,
          payment: ticket.payment
            ? {
                id: ticket.payment.id,
                status: ticket.payment.status,
                note: ticket.payment.note,
                reviewedAt: ticket.payment.reviewedAt,
                reviewedByEmail: ticket.payment.reviewer?.email ?? null,
              }
            : null,
        })),
      },
    });
  },
);

/** GET /api/v1/admin/concerts/:id/summary — สรุปรายได้/ที่นั่งแยกรายโซน */
export const getConcertSummary = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const concertId = req.params.id;

    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
      select: {
        id: true,
        name: true,
        dates: true,
        saleStatus: true,
        venue: { select: { name: true } },
        zones: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            code: true,
            price: true,
            totalSeats: true,
            availableSeats: true,
            isOnSale: true,
          },
        },
      },
    });

    if (!concert) {
      throw new AppError("ไม่พบคอนเสิร์ตนี้", 404);
    }

    const bookings = await prisma.booking.findMany({
      where: { concertId },
      select: { zoneId: true, status: true, totalPrice: true, quantity: true },
    });

    const emptyByStatus = (): Record<BookingStatus, number> => ({
      PENDING: 0,
      PENDING_VERIFICATION: 0,
      COMPLETED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    });

    interface ZoneAggregation {
      byStatus: Record<BookingStatus, number>;
      bookingCount: number;
      confirmedRevenue: number;
      pendingRevenue: number;
      ticketsSold: number;
    }

    const byZone = new Map<string, ZoneAggregation>();
    for (const booking of bookings) {
      let agg = byZone.get(booking.zoneId);
      if (!agg) {
        agg = {
          byStatus: emptyByStatus(),
          bookingCount: 0,
          confirmedRevenue: 0,
          pendingRevenue: 0,
          ticketsSold: 0,
        };
        byZone.set(booking.zoneId, agg);
      }

      agg.byStatus[booking.status] += 1;
      agg.bookingCount += 1;
      agg.ticketsSold += booking.quantity;

      if (booking.status === "COMPLETED") {
        // รายได้ที่ยืนยันแล้ว = จองสำเร็จ (สลิปผ่านการตรวจสอบ)
        agg.confirmedRevenue += booking.totalPrice;
      } else if (booking.status !== "CANCELLED") {
        // ยอดที่ยังถือที่นั่งไว้แต่ยังไม่ยืนยัน
        agg.pendingRevenue += booking.totalPrice;
      }
    }

    const zones = concert.zones.map((zone) => {
      const agg =
        byZone.get(zone.id) ??
        ({
          byStatus: emptyByStatus(),
          bookingCount: 0,
          confirmedRevenue: 0,
          pendingRevenue: 0,
          ticketsSold: 0,
        } satisfies ZoneAggregation);

      return {
        id: zone.id,
        name: zone.name,
        code: zone.code,
        price: zone.price,
        totalSeats: zone.totalSeats,
        availableSeats: zone.availableSeats,
        soldSeats: zone.totalSeats - zone.availableSeats,
        isOnSale: zone.isOnSale,
        bookingsByStatus: agg.byStatus,
        bookingCount: agg.bookingCount,
        confirmedRevenue: agg.confirmedRevenue,
        pendingRevenue: agg.pendingRevenue,
        ticketsSold: agg.ticketsSold,
      };
    });

    const totals = zones.reduce(
      (acc, zone) => ({
        confirmedRevenue: acc.confirmedRevenue + zone.confirmedRevenue,
        pendingRevenue: acc.pendingRevenue + zone.pendingRevenue,
        soldSeats: acc.soldSeats + zone.soldSeats,
        totalSeats: acc.totalSeats + zone.totalSeats,
        bookingCount: acc.bookingCount + zone.bookingCount,
      }),
      { confirmedRevenue: 0, pendingRevenue: 0, soldSeats: 0, totalSeats: 0, bookingCount: 0 },
    );

    res.status(200).json({
      success: true,
      data: {
        concert: {
          id: concert.id,
          name: concert.name,
          dates: concert.dates,
          saleStatus: concert.saleStatus,
          venue: concert.venue,
        },
        zones,
        totals,
      },
    });
  },
);

/** GET /api/v1/admin/notifications — แจ้งเตือนหลังบ้าน (เช่น บัตรโซนหมด/บัตรทั้งคอนหมด) */
export const getAdminNotifications = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { unread } = req.query as { unread?: string };
    const onlyUnread = unread === "true";

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: onlyUnread ? { isRead: false } : undefined,
        include: {
          concert: { select: { id: true, name: true } },
          zone: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notification.count({ where: { isRead: false } }),
    ]);

    res.status(200).json({
      success: true,
      data: { notifications, unreadCount },
    });
  },
);

/** PATCH /api/v1/admin/notifications/read — มาร์กว่าอ่านแจ้งเตือนแล้ว (ทั้งหมด หรือระบุรายการ) */
export const markNotificationsRead = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids } = (req.body ?? {}) as { ids?: string[] };

    const result = await prisma.notification.updateMany({
      where: ids && ids.length > 0 ? { id: { in: ids }, isRead: false } : { isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      message: `มาร์กอ่านแจ้งเตือนแล้ว ${result.count} รายการ`,
      data: { updated: result.count },
    });
  },
);

/** GET /api/v1/admin/bookings — การจองทั้งหมดของทุกผู้ใช้ (กรองตามสถานะได้) */
export const getAllBookings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { status } = req.query as { status?: BookingStatus };

    const bookings = await prisma.booking.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { email: true } },
        zone: { select: ZONE_SUMMARY_FIELDS },
        concert: { select: CONCERT_SUMMARY_FIELDS },
        seats: { include: { seat: { select: SEAT_SUMMARY_FIELDS } } },
        payment: {
          select: {
            id: true,
            status: true,
            slipImage: true,
            note: true,
            reviewedAt: true,
            reviewer: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    res.status(200).json({
      success: true,
      data: {
        bookings: bookings.map((booking) => ({
          ...withFlatSeats(booking),
          user: booking.user,
          payment: booking.payment
            ? {
                ...booking.payment,
                reviewedByEmail: booking.payment.reviewer?.email ?? null,
              }
            : null,
        })),
      },
    });
  },
);

/** GET /api/v1/admin/payments — รายการสลิปทั้งหมด (เรียงรอตรวจสอบก่อน) */
export const getAllPayments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { status } = req.query as { status?: PaymentStatus };

    const payments = await prisma.payment.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      include: {
        reviewer: { select: { id: true, email: true } },
        booking: {
          include: {
            user: { select: { email: true } },
            zone: { select: ZONE_SUMMARY_FIELDS },
            concert: { select: CONCERT_SUMMARY_FIELDS },
            seats: { include: { seat: { select: SEAT_SUMMARY_FIELDS } } },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        payments: payments.map((payment) => ({
          id: payment.id,
          slipImage: payment.slipImage,
          status: payment.status,
          note: payment.note,
          createdAt: payment.createdAt,
          reviewedAt: payment.reviewedAt,
          reviewedBy: payment.reviewer,
          booking: {
            ...withFlatSeats(payment.booking),
            user: payment.booking.user,
          },
        })),
      },
    });
  },
);

/** PATCH /api/v1/admin/payments/:id/approve — อนุมัติสลิป → บัตรจองสำเร็จ */
export const approvePayment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const paymentId = req.params.id;
    const adminId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) {
        throw new AppError("ไม่พบรายการชำระเงินนี้", 404);
      }
      if (payment.status !== "PENDING_VERIFICATION") {
        throw new AppError("สลิปนี้ถูกตรวจสอบไปแล้ว", 400);
      }

      const approved = await tx.payment.update({
        where: { id: paymentId },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: adminId },
      });

      const booking = await tx.booking.update({
        where: { id: approved.bookingId },
        data: { status: "COMPLETED" },
      });

      return { payment: approved, booking };
    });

    res.status(200).json({
      success: true,
      message: "อนุมัติการชำระเงินสำเร็จ — บัตรจองสำเร็จแล้ว",
      data: {
        payment: { ...result.payment, reviewedByEmail: req.user!.email },
        booking: result.booking,
      },
    });
  },
);

/** PATCH /api/v1/admin/payments/:id/reject — ปฏิเสธสลิป (ระบุเหตุผลได้) → บัตรเป็น REJECTED */
export const rejectPayment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const paymentId = req.params.id;
    const adminId = req.user!.id;
    const { note } = (req.body ?? {}) as { note?: string };

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) {
        throw new AppError("ไม่พบรายการชำระเงินนี้", 404);
      }
      if (payment.status !== "PENDING_VERIFICATION") {
        throw new AppError("สลิปนี้ถูกตรวจสอบไปแล้ว", 400);
      }

      const rejected = await tx.payment.update({
        where: { id: paymentId },
        data: { status: "REJECTED", note: note ?? "สลิปไม่ถูกต้อง กรุณาตรวจสอบและส่งสลิปใหม่", reviewedAt: new Date(), reviewedBy: adminId },
      });

      // ที่นั่งยังถูกถือไว้ให้ผู้จอง ส่งสลิปใหม่ได้ (สถานะบัตร = REJECTED)
      const booking = await tx.booking.update({
        where: { id: rejected.bookingId },
        data: { status: "REJECTED" },
      });

      return { payment: rejected, booking };
    });

    res.status(200).json({
      success: true,
      message: "ปฏิเสธสลิปสำเร็จ — ผู้จองสามารถส่งสลิปใหม่ได้",
      data: {
        payment: { ...result.payment, reviewedByEmail: req.user!.email },
        booking: result.booking,
      },
    });
  },
);
