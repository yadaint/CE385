import { z } from "zod";

export const MAX_TICKETS_PER_BOOKING = 10;

export const createBookingSchema = z.object({
  // วันที่แสดงที่ผู้ใช้เลือกจอง (ต้องตรงกับวันที่ในรอบการแสดงของคอนเสิร์ต)
  showDate: z
    .string({ required_error: "กรุณาเลือกวันที่ที่ต้องการจอง" })
    .min(1, "กรุณาเลือกวันที่ที่ต้องการจอง")
    .refine((value) => !Number.isNaN(Date.parse(value)), "วันที่ไม่ถูกต้อง กรุณาเลือกใหม่")
    .transform((value) => new Date(value).toISOString()),
  seatIds: z
    .array(z.string({ required_error: "รหัสที่นั่งต้องเป็นข้อความ" }).min(1), {
      required_error: "กรุณาระบุที่นั่งที่ต้องการจอง",
    })
    .min(1, "กรุณาเลือกที่นั่งอย่างน้อย 1 ที่นั่งบนผัง")
    .max(
      MAX_TICKETS_PER_BOOKING,
      `จองได้สูงสุด ${MAX_TICKETS_PER_BOOKING} ที่นั่งต่อการจอง`,
    ),
});
