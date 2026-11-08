// src/middlewares/async-handler.ts — ของเดิมจากสัปดาห์ที่ 5
// Express 4 ไม่รู้จัก Promise ที่ reject ข้างใน handler
// ถ้าไม่ห่อด้วยตัวนี้ คำขอจะค้างจนหมดเวลา ไม่มี error ออกมาให้เห็น
// (หมายเหตุ: Express 5 ดักให้เองแล้ว ไม่ต้องใช้ไฟล์นี้)
import type { RequestHandler } from "express";

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}