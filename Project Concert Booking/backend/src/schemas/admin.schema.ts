import { z } from "zod";

/** Params สำหรับเส้นทางที่อ้างถึงรายการชำระเงิน */
export const adminPaymentParamsSchema = z.object({
  id: z
    .string({ required_error: "ต้องระบุรหัสรายการชำระเงิน" })
    .min(1, "ต้องระบุรหัสรายการชำระเงิน"),
});

/** Params สำหรับเส้นทางที่อ้างถึงคอนเสิร์ตในหลังบ้าน */
export const adminConcertParamsSchema = z.object({
  id: z
    .string({ required_error: "ต้องระบุรหัสคอนเสิร์ต" })
    .min(1, "ต้องระบุรหัสคอนเสิร์ต"),
});

/** Query กรองรายการตั๋วของคอนเสิร์ต (รายโซน / รายสถานะ) */
export const adminTicketQuerySchema = z.object({
  zoneId: z.string().min(1).optional(),
  status: z
    .enum(["PENDING", "PENDING_VERIFICATION", "COMPLETED", "REJECTED", "CANCELLED"], {
      errorMap: () => ({ message: "สถานะการจองไม่ถูกต้อง" }),
    })
    .optional(),
});

/** Query กรองรายการสลิปรอตรวจสอบ */
export const adminPaymentQuerySchema = z.object({
  status: z
    .enum(["PENDING_VERIFICATION", "APPROVED", "REJECTED"], {
      errorMap: () => ({ message: "สถานะสลิปต้องเป็น PENDING_VERIFICATION / APPROVED / REJECTED" }),
    })
    .optional(),
});

/** Query กรองการจองทั้งหมดในหลังบ้าน */
export const adminBookingQuerySchema = z.object({
  status: z
    .enum(["PENDING", "PENDING_VERIFICATION", "COMPLETED", "REJECTED", "CANCELLED"], {
      errorMap: () => ({ message: "สถานะการจองไม่ถูกต้อง" }),
    })
    .optional(),
});

/** Body สำหรับปฏิเสธสลิป (ระบุเหตุผลให้ผู้จองทราบ — ไม่บังคับ) */
export const rejectPaymentSchema = z.object({
  note: z.string().trim().max(500, "หมายเหตุต้องไม่เกิน 500 ตัวอักษร").optional(),
});

/** Body สำหรับมาร์กอ่านแจ้งเตือน (ไม่ส่ง ids = มาร์กทั้งหมด) */
export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
});

/** Query กรองแจ้งเตือนเฉพาะยังไม่อ่าน */
export const adminNotificationQuerySchema = z.object({
  unread: z.enum(["true", "false"]).optional(),
});
