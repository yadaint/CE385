import { z } from "zod";

const isoDateSchema = z
  .string({ required_error: "กรุณาระบุวันที่" })
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "วันที่ต้องเป็นรูปแบบ ISO 8601 ที่ถูกต้อง (เช่น 2026-12-01T19:00:00.000Z)",
  })
  .transform((value) => new Date(value));

export const originSchema = z.enum(["THAI", "INTERNATIONAL"], {
  errorMap: () => ({ message: "ต้นสังกัดต้องเป็น THAI หรือ INTERNATIONAL" }),
});

export const artistTypeSchema = z.enum(["SOLO", "GROUP"], {
  errorMap: () => ({ message: "รูปแบบศิลปินต้องเป็น SOLO หรือ GROUP" }),
});

/**
 * การตั้งค่าโซนจากทีมงาน: ระบุรหัสโซน (ตามผังของสถานที่) ราคาบัตร
 * และว่าโซนนั้นเปิดขายหรือไม่ (โซนปิดขายจะเป็นสีเทา เลือกไม่ได้)
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
    .string({ required_error: "กรุณากรอกชื่อคอนเสิร์ต" })
    .trim()
    .min(1, "กรุณากรอกชื่อคอนเสิร์ต")
    .max(255, "ชื่อคอนเสิร์ตต้องไม่เกิน 255 ตัวอักษร"),
  // ชื่อภาษาอังกฤษ (ไม่บังคับ — ถ้าไม่กรอก ระบบใช้ชื่อไทยแสดงทั้งสองภาษา)
  nameEn: z.string().trim().max(255, "ชื่อภาษาอังกฤษต้องไม่เกิน 255 ตัวอักษร").optional(),
  description: z
    .string({ required_error: "กรุณากรอกรายละเอียด" })
    .trim()
    .min(1, "กรุณากรอกรายละเอียด")
    .max(2000, "รายละเอียดต้องไม่เกิน 2000 ตัวอักษร"),
  // วันที่แสดงทั้งหมด — คอนเสิร์ตหนึ่งงานจัดได้หลายวัน
  dates: z
    .array(isoDateSchema, { required_error: "ต้องมีวันที่แสดงอย่างน้อย 1 วัน" })
    .min(1, "ต้องมีวันที่แสดงอย่างน้อย 1 วัน")
    .max(10, "เพิ่มวันที่แสดงได้สูงสุด 10 วัน"),
  // สถานที่จัดงาน — ผังโซนจะมาจากผัง FIX ประจำสถานที่นั้น
  venueId: z
    .string({ required_error: "กรุณาเลือกสถานที่จัดงาน" })
    .min(1, "กรุณาเลือกสถานที่จัดงาน"),
  // ยอมรับทั้ง URL เต็มและพาธจากการอัปโหลด (เช่น /uploads/covers/xxx.png)
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) => /^https?:\/\/.+/.test(value) || value.startsWith("/uploads/"),
      "URL รูปภาพไม่ถูกต้อง",
    )
    .optional(),
  // วันและเวลาสุดท้ายของการขายบัตร (ไม่บังคับ — ถ้าไม่กรอก ระบบจะไม่จำกัดเวลาขาย)
  saleEndDate: z.coerce
    .date({ invalid_type_error: "วันสุดท้ายของการขายไม่ถูกต้อง" })
    .refine((date) => date.getTime() > Date.now(), "วันสุดท้ายของการขายต้องเป็นวันที่ในอนาคต")
    .optional(),
  emoji: z.string().trim().max(16, "อิโมจิต้องไม่เกิน 16 ตัวอักษร").optional(),
  origin: originSchema.default("THAI"),
  artistType: artistTypeSchema.default("GROUP"),
  zones: z
    .array(zoneSettingSchema, { required_error: "ต้องกำหนดราคาโซนอย่างน้อย 1 โซน" })
    .min(1, "ต้องกำหนดราคาโซนอย่างน้อย 1 โซน")
    .max(12, "คอนเสิร์ตหนึ่งงานมีโซนที่นั่งได้สูงสุด 12 โซน"),
});

export const concertParamsSchema = z.object({
  id: z.string({ required_error: "ต้องระบุรหัสคอนเสิร์ต" }).min(1, "ต้องระบุรหัสคอนเสิร์ต"),
});

/**
 * PATCH /concerts/:id — แก้ไขข้อมูลคอนเสิร์ต (ทุกฟิลด์เป็นทางเลือก ส่งเฉพาะฟิลด์ที่ต้องการแก้)
 * หมายเหตุ: เปลี่ยนสถานที่ (venueId) ไม่ได้ เพราะผังโซน/ที่นั่งถูกสร้างตามสถานที่เดิมแล้ว
 */
export const updateConcertSchema = z
  .object({
    name: z.string().trim().min(1, "ชื่อคอนเสิร์ตห้ามว่าง").max(255, "ชื่อคอนเสิร์ตต้องไม่เกิน 255 ตัวอักษร").optional(),
    // ชื่อภาษาอังกฤษ (ไม่บังคับ — ถ้าไม่กรอก ระบบใช้ชื่อไทยแสดงทั้งสองภาษา)
    nameEn: z.string().trim().max(255, "ชื่อภาษาอังกฤษต้องไม่เกิน 255 ตัวอักษร").nullish(),
    description: z.string().trim().min(1, "รายละเอียดห้ามว่าง").max(2000, "รายละเอียดต้องไม่เกิน 2000 ตัวอักษร").optional(),
    dates: z
      .array(isoDateSchema)
      .min(1, "ต้องมีวันที่แสดงอย่างน้อย 1 วัน")
      .max(10, "เพิ่มวันที่แสดงได้สูงสุด 10 วัน")
      .optional(),
    imageUrl: z
      .string()
      .trim()
      .refine(
        (value) => /^https?:\/\/.+/.test(value) || value.startsWith("/uploads/"),
        "URL รูปภาพไม่ถูกต้อง",
      )
      .nullish(),
    emoji: z.string().trim().max(16, "อิโมจิต้องไม่เกิน 16 ตัวอักษร").nullish(),
    // แก้วันสุดท้ายของการขายได้ (null = ล้างคำหมาย)
    saleEndDate: z.coerce.date({ invalid_type_error: "วันสุดท้ายของการขายไม่ถูกต้อง" }).nullish(),
    origin: originSchema.optional(),
    artistType: artistTypeSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "กรุณาระบุข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 ฟิลด์",
  });

/** PATCH /concerts/:id/sale-status — เปิด/ปิด/ยกเลิกการขายบัตร (DRAFT/SOLD_OUT จัดการโดยระบบ) */
export const saleStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "CANCELLED"], {
    errorMap: () => ({
      message: "สถานะต้องเป็น OPEN (เปิดขาย) / CLOSED (ปิดขายชั่วคราว) / CANCELLED (ยกเลิกถาวร)",
    }),
  }),
});

/** PATCH /concerts/:id/zones — ปรับราคา/เปิด-ปิดขายรายโซนของคอนเสิร์ตที่สร้างแล้ว */
export const updateZoneSettingSchema = z.object({
  zoneId: z.string({ required_error: "ต้องระบุรหัสโซน" }).min(1, "ต้องระบุรหัสโซน"),
  price: z.coerce
    .number({ invalid_type_error: "ราคาต้องเป็นตัวเลข" })
    .min(0, "ราคาต้องไม่ติดลบ")
    .max(10_000_000, "ราคาสูงผิดปกติ")
    .optional(),
  isOnSale: z.boolean().optional(),
});

export const updateConcertZonesSchema = z.object({
  zones: z.array(updateZoneSettingSchema).min(1, "ต้องระบุโซนอย่างน้อย 1 โซน"),
});

/** Query params สำหรับกรองรายการคอนเสิร์ต (ทั้งหมดเป็นทางเลือก) */
export const concertQuerySchema = z.object({
  origin: originSchema.optional(),
  artistType: artistTypeSchema.optional(),
});

export type ZoneSettingInput = z.infer<typeof zoneSettingSchema>;
export type CreateConcertInput = z.infer<typeof createConcertSchema>;
export type UpdateConcertInput = z.infer<typeof updateConcertSchema>;
export type SaleStatusInput = z.infer<typeof saleStatusSchema>;
export type UpdateConcertZonesInput = z.infer<typeof updateConcertZonesSchema>;
export type ConcertQuery = z.infer<typeof concertQuerySchema>;
