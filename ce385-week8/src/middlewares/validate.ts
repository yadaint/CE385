// src/middlewares/validate.ts — ตัวตรวจข้อมูลรวมศูนย์
// แนวคิด: route ไม่ต้องเขียน if ตรวจข้อมูลเองแม้แต่บรรทัดเดียว
import type { RequestHandler } from "express";
import type { ZodError, ZodType } from "zod";

interface Schemas {
  params?: ZodType;  // ส่วนที่อยู่ใน path เช่น /:id
  query?: ZodType;   // ส่วนที่อยู่หลัง ? เช่น ?page=2
  body?: ZodType;    // ส่วนที่อยู่ในตัวคำขอ (JSON)
}

// ผิดที่ path หรือ query = "คำขอเขียนมาผิดรูป"        → 400 Bad Request
// ผิดที่ body           = "รูปแบบถูก แต่เนื้อหาใช้ไม่ได้" → 422 Unprocessable Entity
const STATUS_OF: Record<keyof Schemas, number> = { params: 400, query: 400, body: 422 };

export function validate(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    const valid: Record<string, unknown> = {};

    // ตรวจตามลำดับ params → query → body
    // เจอผิดที่แรกแล้วหยุดทันที ไม่ต้องตรวจต่อ — นี่คือ fail-fast
    for (const source of ["params", "query", "body"] as const) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source]);

      if (!result.success) {
        // ติดป้ายไว้ว่าผิดที่ส่วนไหน เพื่อให้ตัวดักรวมศูนย์เลือก status code ได้ถูก
        (result.error as ZodError & { httpStatus?: number }).httpStatus = STATUS_OF[source];
        next(result.error);   // ไม่ตอบเองที่นี่ — ส่งต่อให้ error-handler
        return;
      }

      valid[source] = result.data;   // ได้ข้อมูลที่แปลงชนิดเรียบร้อยแล้ว
    }

    res.locals.valid = valid;
    next();   // ผ่านด่านแล้ว ส่งต่อให้ handler ตัวถัดไป
  };
}