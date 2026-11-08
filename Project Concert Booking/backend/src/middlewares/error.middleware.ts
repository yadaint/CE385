import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";

import { env } from "../config/env";
import { AppError } from "../errors/AppError";

interface FieldError {
  field: string;
  message: string;
}

/** 404 handler สำหรับเส้นทางที่ไม่ตรง — ต้องลงทะเบียนหลังเส้นทางทั้งหมด */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `ไม่พบเส้นทาง: ${req.method} ${req.originalUrl}`,
  });
};

/** Global error handler — แปลงทุก error ให้เป็น JSON response รูปแบบเดียวกัน */
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // 1. Zod validation errors → 422 พร้อมรายละเอียดรายฟิลด์
  if (error instanceof ZodError) {
    const fieldErrors: FieldError[] = error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join(".") : "body",
      message: issue.message,
    }));

    res.status(422).json({
      success: false,
      message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
      errors: fieldErrors,
    });
    return;
  }

  // 2.5. Multer (อัปโหลดสลิป)
  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "ไฟล์สลิปใหญ่เกินไป (สูงสุด 5MB)"
        : `อัปโหลดไฟล์ไม่สำเร็จ: ${error.message}`;

    res.status(400).json({ success: false, message });
    return;
  }

  // 3. Application errors (ความผิดพลาดที่คาดหมายและควบคุมได้)
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  // 3. Known Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        success: false,
        message: "มีข้อมูลนี้อยู่ในระบบแล้ว",
      });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลที่ต้องการ",
      });
      return;
    }
  }

  // 4. Unexpected errors
  console.error("💥 Unhandled error:", error);

  res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === "production"
        ? "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์"
        : error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
  });
};
