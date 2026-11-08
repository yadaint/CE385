import { Router } from "express";

import {
  createConcert,
  deleteConcert,
  getAllConcerts,
  getConcertById,
  updateConcert,
  updateConcertSaleStatus,
  updateConcertZones,
} from "../controllers/concert.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  concertParamsSchema,
  createConcertSchema,
  saleStatusSchema,
  updateConcertSchema,
  updateConcertZonesSchema,
} from "../schemas/concert.schema";

const router = Router();

// ─── สาธารณะ ───────────────────────────────────────────────
router.get("/", getAllConcerts);
router.get("/:id", validate({ params: concertParamsSchema }), getConcertById);

// ─── เฉพาะ ADMIN ───────────────────────────────────────────
// สร้างคอนเสิร์ตใหม่ (สถานะเริ่มต้น = DRAFT ต้องกด "เปิดขาย" อีกทีถึงจะขึ้นหน้าจอง)
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate({ body: createConcertSchema }),
  createConcert,
);

// แก้ไขข้อมูลคอนเสิร์ต (ชื่อ/รายละเอียด/วันที่/รูป/อิโมจิ/ประเภท)
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: concertParamsSchema, body: updateConcertSchema }),
  updateConcert,
);

// เปิด/ปิดการขายบัตร (OPEN = ขึ้นหน้าจอง, CLOSED = ซ่อนจากหน้าจอง)
router.patch(
  "/:id/sale-status",
  authenticate,
  authorize("ADMIN"),
  validate({ params: concertParamsSchema, body: saleStatusSchema }),
  updateConcertSaleStatus,
);

// ปรับราคา/เปิด-ปิดขายรายโซนของคอนที่สร้างแล้ว
router.patch(
  "/:id/zones",
  authenticate,
  authorize("ADMIN"),
  validate({ params: concertParamsSchema, body: updateConcertZonesSchema }),
  updateConcertZones,
);

// ลบคอนเสิร์ต — ลบได้เฉพาะแบบร่าง (DRAFT) เท่านั้น (cascade ลบโซน/ที่นั่ง/การจองที่ผูกอยู่)
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: concertParamsSchema }),
  deleteConcert,
);

export default router;
