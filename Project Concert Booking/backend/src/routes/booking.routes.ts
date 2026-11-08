import { Router } from "express";

import {
  cancelBooking,
  checkBooking,
  createBooking,
  getMyBookings,
  uploadBookingSlip,
} from "../controllers/booking.controller";
import { uploadSlipImage } from "../config/upload";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { bookingParamsSchema, createBookingSchema } from "../schemas/booking.schema";

const router = Router();

// ตรวจสอบสถานะตั๋วด้วยรหัสการจอง — สาธารณะ ไม่ต้องเข้าสู่ระบบ
// (ต้องลงทะเบียนก่อน router.use(authenticate))
router.get("/check/:id", validate({ params: bookingParamsSchema }), checkBooking);

// เส้นทางที่เหลือทั้งหมดต้องมี JWT ที่ถูกต้อง
router.use(authenticate);

// จอง + แนบสลิป — เฉพาะผู้ใช้ทั่วไป (แอดมินไม่ทำการจอง)
router.post("/", authorize("USER"), validate({ body: createBookingSchema }), createBooking);
router.post(
  "/:id/slip",
  authorize("USER"),
  uploadSlipImage.single("slipImage"),
  uploadBookingSlip,
);

router.get("/my-bookings", getMyBookings);

router.patch(
  "/:id/cancel",
  authorize("USER"),
  validate({ params: bookingParamsSchema }),
  cancelBooking,
);

export default router;
