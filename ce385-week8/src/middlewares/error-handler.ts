// src/middlewares/error-handler.ts — ตัวดักข้อผิดพลาดรวมศูนย์
// กฎเหล็ก: ในระบบนี้มี "ที่เดียว" ที่แปลง error เป็น HTTP response
// ทุกที่ที่เหลือมีหน้าที่แค่ next(error) หรือ throw ออกมา
// ต้องมี 4 พารามิเตอร์ (err, req, res, next) Express จึงจะรู้ว่าเป็นตัวดัก error
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";

/** รูปแบบข้อผิดพลาดชุดเดียวที่ใช้ทั้งระบบ — ฝั่ง client แกะที่เดียวจบ */
interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/* ---------- ไม่มี route ไหนรับคำขอนี้ ---------- */
export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorBody = {
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `ไม่มีเส้นทาง ${req.method} ${req.originalUrl} ในระบบนี้`,
    },
  };
  res.status(404).json(body);
};

/* ---------- ตัวดักหลัก ---------- */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 1) ข้อมูลที่ส่งมาไม่ผ่าน schema
  //    400 ถ้าผิดที่ path/query · 422 ถ้าผิดที่ body (validate() ติดป้าย httpStatus มาให้)
  if (err instanceof ZodError) {
    const status = (err as ZodError & { httpStatus?: number }).httpStatus ?? 422;
    const body: ErrorBody = {
      error: {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
        details: err.issues.map((issue) => ({
          field: issue.path.join(".") || "(ทั้งก้อน)",
          message: issue.message,
        })),
      },
    };
    res.status(status).json(body);
    return;
  }

  // 2) ข้อผิดพลาดที่เราตั้งใจโยนเอง → ใช้ status ที่ระบุไว้
  if (err instanceof AppError) {
    const body: ErrorBody = { error: { code: err.code, message: err.message } };
    res.status(err.statusCode).json(body);
    return;
  }

  // 3) ข้อผิดพลาดจากฐานข้อมูล — Prisma มีรหัสของตัวเอง แปลงเป็น HTTP ให้ถูกความหมาย
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const map: Record<string, { status: number; code: string; message: string }> = {
      // ชนกับ @unique — เช่นรหัสนักศึกษาหรืออีเมลซ้ำ
      P2002: { status: 409, code: "DUPLICATE",      message: "ข้อมูลนี้มีอยู่แล้วในระบบ" },
      // update / delete แถวที่ไม่มีอยู่
      P2025: { status: 404, code: "NOT_FOUND",      message: "ไม่พบข้อมูลที่ต้องการแก้ไขหรือลบ" },
      // เชื่อมต่อฐานข้อมูลไม่ได้
      P1001: { status: 503, code: "DB_UNAVAILABLE", message: "ติดต่อฐานข้อมูลไม่ได้" },
    };

    const hit = map[err.code];
    if (hit) {
      const target = (err.meta as { target?: string[] } | undefined)?.target;
      const body: ErrorBody = {
        error: {
          code: hit.code,
          message: hit.message,
          details: target ? { field: target.join(", ") } : undefined,
        },
      };
      res.status(hit.status).json(body);
      return;
    }
  }

  // 4) ที่เหลือคือสิ่งที่เราไม่ได้คาดไว้ = bug ของเรา
  //    ตอบ 500 แบบกลาง ๆ ไม่รั่วรายละเอียดภายในออกไปให้ client
  //    แต่พิมพ์ลง console ให้ครบ เพื่อให้ผู้พัฒนาตามแก้ได้
  console.error("[UNHANDLED]", err);
  const body: ErrorBody = {
    error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในระบบ" },
  };
  res.status(500).json(body);
};