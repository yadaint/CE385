import { z } from "zod";

export const originSchema = z.enum(["THAI", "INTERNATIONAL"], {
  errorMap: () => ({ message: "ต้นสังกัดต้องเป็น คอนไทย หรือ คอนต่างประเทศ" }),
});

export const artistTypeSchema = z.enum(["SOLO", "GROUP"], {
  errorMap: () => ({ message: "รูปแบบศิลปินต้องเป็น คอนเดี่ยว หรือ คอนกลุ่ม" }),
});

const isoDateSchema = z
  .string()
  .min(1, "กรุณาระบุวันที่แสดง")
  .refine((value) => !Number.isNaN(Date.parse(value)), "วันที่ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");

/**
 * การตั้งค่าโซนจากทีมงาน: ระบุรหัสโซน (ตามผังของสถานที่) ราคาบัตร
 * และว่าโซนนั้นเปิดขายหรือไม่ (โซนปิดขายจะเป็นสีเทา เลือกซื้อไม่ได้)
 */
export const zoneSettingSchema = z.object({
  code: z
    .string({ required_error: "กรุณาระบุรหัสโซน" })
    .trim()
    .length(2, "รหัสโซนต้องมี 2 ตัวอักษร")
    .regex(/^[A-Za-z]{2}$/, "รหัสโซนต้องเป็นตัวอักษร A-Z จำนวน 2 ตัว")
    .transform((value) => value.toUpperCase()),
  price: z.coerce
    .number({ invalid_type_error: "ราคาต้องเป็นตัวเลข" })
    .min(0, "ราคาต้องไม่ติดลบ")
    .max(10_000_000, "ราคาสูงผิดปกติ"),
  isOnSale: z.boolean().default(true),
});

export const createConcertSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อคอนเสิร์ต")
    .max(255, "ชื่อคอนเสิร์ตต้องไม่เกิน 255 ตัวอักษร"),
  // ชื่อภาษาอังกฤษ (ไม่บังคับ — ถ้าไม่กรอก ระบบใช้ชื่อไทยแสดงทั้งสองภาษา)
  nameEn: z.string().trim().max(255, "ชื่อภาษาอังกฤษต้องไม่เกิน 255 ตัวอักษร").optional(),
  description: z
    .string()
    .trim()
    .min(1, "กรุณากรอกรายละเอียด")
    .max(2000, "รายละเอียดต้องไม่เกิน 2000 ตัวอักษร"),
  // สถานที่จัดงาน — ผังโซนจะมาจากผัง FIX ประจำสถานที่นั้น
  venueId: z
    .string({ required_error: "กรุณาเลือกสถานที่จัดงาน" })
    .min(1, "กรุณาเลือกสถานที่จัดงาน"),
  // วันที่แสดงทั้งหมด — คอนเสิร์ตหนึ่งงานจัดได้หลายวัน
  dates: z
    .array(isoDateSchema)
    .min(1, "ต้องมีวันที่แสดงอย่างน้อย 1 วัน")
    .max(10, "เพิ่มวันที่แสดงได้สูงสุด 10 วัน"),
  imageUrl: z
    .string()
    .trim()
    .url("URL รูปภาพไม่ถูกต้อง")
    .optional()
    .or(z.literal("")),
  emoji: z.string().trim().max(16, "อิโมจิต้องไม่เกิน 16 ตัวอักษร").optional().or(z.literal("")),
  origin: originSchema.default("THAI"),
  artistType: artistTypeSchema.default("GROUP"),
  zones: z
    .array(zoneSettingSchema)
    .min(1, "ต้องกำหนดโซนอย่างน้อย 1 โซน")
    .max(12, "คอนเสิร์ตหนึ่งงานมีโซนที่นั่งได้สูงสุด 12 โซน"),
});

export const concertParamsSchema = z.object({
  id: z.string({ required_error: "ต้องระบุรหัสคอนเสิร์ต" }).min(1, "ต้องระบุรหัสคอนเสิร์ต"),
});

/** Query params สำหรับกรองรายการคอนเสิร์ต (ทั้งหมดเป็นทางเลือก) */
export const concertQuerySchema = z.object({
  origin: originSchema.optional(),
  artistType: artistTypeSchema.optional(),
});

export type ZoneSettingInput = z.infer<typeof zoneSettingSchema>;
export type CreateConcertInput = z.infer<typeof createConcertSchema>;
export type ConcertQuery = z.infer<typeof concertQuerySchema>;
