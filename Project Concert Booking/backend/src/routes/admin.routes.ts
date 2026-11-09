import { Router } from "express";

import {
  approvePayment,
  createStaff,
  getAllBookings,
  getAllPayments,
  getAdminConcerts,
  getAdminNotifications,
  getAdminStats,
  getConcertSeatMap,
  getConcertSummary,
  getConcertTickets,
  getStaffList,
  getTodayDuty,
  markNotificationsRead,
  removeStaff,
  rejectPayment,
  setTodayDuty,
  verifyStaffAccess,
} from "../controllers/admin.controller";
import { uploadCoverImage } from "../config/upload";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createStaffSchema } from "../schemas/auth.schema";
import {
  adminBookingQuerySchema,
  adminConcertParamsSchema,
  adminNotificationQuerySchema,
  adminPaymentParamsSchema,
  adminPaymentQuerySchema,
  adminTicketQuerySchema,
  markNotificationsReadSchema,
  rejectPaymentSchema,
  removeStaffSchema,
  setDutySchema,
  staffAccessSchema,
} from "../schemas/admin.schema";

const router = Router();

// ทุกเส้นทางในหลังบ้านต้องเป็น ADMIN เท่านั้น
router.use(authenticate, authorize("ADMIN"));

router.get("/stats", getAdminStats);
router.get("/concerts", getAdminConcerts);
router.get("/bookings", validate({ query: adminBookingQuerySchema }), getAllBookings);
router.get("/payments", validate({ query: adminPaymentQuerySchema }), getAllPayments);
router.get("/notifications", validate({ query: adminNotificationQuerySchema }), getAdminNotifications);

// เพิ่มบัญชีแอดมินใหม่ — อีเมลสร้างอัตโนมัติจากรหัสพนักงาน: admin{รหัส}@domain
router.post("/staff", validate({ body: createStaffSchema }), createStaff);

// เวรประจำวัน — ล็อกอินแล้วต้องเลือกว่า "วันนี้ใครเป็นคนทำงาน" และแสดงผู้ที่อยู่เวรอยู่
router.get("/staff", getStaffList);
router.get("/staff/duty/today", getTodayDuty);
router.post("/staff/duty", validate({ body: setDutySchema }), setTodayDuty);

// เพิ่ม/ลดแอดมิน — ต้องแนบรหัสยืนยัน 8 ตัว (ADMIN_ACCESS_CODE) ถูกต้องทุกครั้ง
router.post("/staff/verify-access", validate({ body: staffAccessSchema }), verifyStaffAccess);
router.post("/staff/remove", validate({ body: removeStaffSchema }), removeStaff);

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
