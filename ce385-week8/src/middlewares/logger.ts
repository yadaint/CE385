// src/middlewares/logger.ts — บันทึกทุกคำขอลง console
// มีไว้เพื่อ "เห็นด้วยตา" ว่าคำขอเข้ามาจริง และจบด้วย status อะไร
import type { RequestHandler } from "express";

export const logger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();

  // res.on("finish") ยิงเมื่อ Express ส่ง response ออกไปเรียบร้อยแล้ว
  res.on("finish", () => {
    const ms = Date.now() - startedAt;
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms} ms)`);
  });

  next();
};