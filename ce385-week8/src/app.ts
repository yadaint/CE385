// src/app.ts — ที่ประกอบร่าง
// ไฟล์นี้ตอบคำถามเดียว: "คำขอหนึ่งใบเดินผ่านอะไรบ้าง ตามลำดับไหน"
// ไม่มี app.listen ที่นี่ เพื่อให้เอา app ไปใช้กับการทดสอบได้ด้วย
import express from "express";
import { logger } from "./middlewares/logger.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { studentsRouter } from "./routes/students.route.js";

export const app = express();

/* ---------- 1) middleware ที่ทุกคำขอต้องผ่าน ---------- */
app.use(express.json());   // แปลง JSON ใน body ให้เป็น object · ลืมบรรทัดนี้ req.body จะเป็น undefined
app.use(logger);           // บันทึกทุกคำขอ

/* ---------- 2) เส้นสำหรับเช็กว่าเซิร์ฟเวอร์ยังมีชีวิต ---------- */
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/* ---------- 3) ทรัพยากรของเรา ---------- */
// ใส่เวอร์ชันไว้ใน path ตั้งแต่วันแรก — วันที่ต้องแก้สัญญาแบบไม่เข้ากันกับของเดิม
// จะได้เปิด /api/v2 ขึ้นมาขนานกันได้ โดยไม่ทำให้ของเก่าพัง
app.use("/api/v1/students", studentsRouter);

/* ---------- 4) สองตัวนี้ต้องอยู่ท้ายสุดเสมอ ---------- */
app.use(notFoundHandler);   // ไม่มี route ไหนรับ → 404
app.use(errorHandler);      // มี error โผล่มาจากที่ไหนก็ตาม → มาจบที่นี่