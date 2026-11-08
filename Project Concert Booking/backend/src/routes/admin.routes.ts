import { Router } from "express";

import {
  approvePayment,
  getAllBookings,
  getAllPayments,
  getAdminConcerts,
  getAdminNotifications,
  getAdminStats,
  getConcertSeatMap,
  getConcertSummary,
  getConcertTickets,
  markNotificationsRead,
  rejectPayment,
} from "../controllers/admin.controller";
import { uploadCoverImage } from "../config/upload";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  adminBookingQuerySchema,
  adminConcertParamsSchema,
  adminNotificationQuerySchema,
  adminPaymentParamsSchema,
  adminPaymentQuerySchema,
  adminTicketQuerySchema,
  markNotificationsReadSchema,
  rejectPaymentSchema,
} from "../schemas/admin.schema";

const router = Router();

// ทุกเส้นทางในหลังบ้านต้องเป็น ADMIN เท่านั้น
router.use(authenticate, authorize("ADMIN"));

router.get("/stats", getAdminStats);
router.get("/concerts", getAdminConcerts);
router.get("/bookings", validate({ query: adminBookingQuerySchema }), getAllBookings);
router.get("/payments", validate({ query: adminPaymentQuerySchema }), getAllPayments);
router.get("/notifications", validate({ query: adminNotificationQuerySchema }), getAdminNotifications);

// อัปโหลดรูปปกคอนเสิร์ต — ขนาดแนะนำ 1200x675 px (16:9) ไม่เกิน 5MB → คืน URL ไฟล์
router.post("/uploads/cover", uploadCoverImage.single("cover"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "กรุณาเลือกรูปปกคอนเสิร์ต" });
    return;
  }
  res.status(201).json({
    success: true,
    message: "อัปโหลดรูปปกสำเร็จ",
    data: { url: `/uploads/covers/${req.file.filename}` },
  });
});

// ผังที่นั่งเรียลไทม์ / รายการตั๋ว / สรุปรายได้ — จำเพาะต่อคอนเสิร์ต
router.get(
  "/concerts/:id/seats",
  validate({ params: adminConcertParamsSchema }),
  getConcertSeatMap,
);
router.get(
  "/concerts/:id/tickets",
  validate({ params: adminConcertParamsSchema, query: adminTicketQuerySchema }),
  getConcertTickets,
);
router.get(
  "/concerts/:id/summary",
  validate({ params: adminConcertParamsSchema }),
  getConcertSummary,
);
router.patch(
  "/notifications/read",
  validate({ body: markNotificationsReadSchema }),
  markNotificationsRead,
);
router.patch(
  "/payments/:id/approve",
  validate({ params: adminPaymentParamsSchema }),
  approvePayment,
);
router.patch(
  "/payments/:id/reject",
  validate({ params: adminPaymentParamsSchema, body: rejectPaymentSchema }),
  rejectPayment,
);

export default router;
