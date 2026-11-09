import { z } from "zod";

/** โดเมนอีเมลของทีมงาน — ต้องตรงกับ ADMIN_EMAIL_DOMAIN ฝั่ง backend (default: concerthub.dev) */
export const STAFF_EMAIL_DOMAIN = "concerthub.dev";

/** สร้างอีเมลแอดมินจากรหัสพนักงาน: admin{รหัส}@โดเมน — ใช้แสดงพรีวิวสด ๆ บนฟอร์ม */
export const buildStaffEmail = (employeeId: string): string =>
  `admin${employeeId.trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;

export const createStaffSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อจริง")
    .max(100, "ชื่อจริงต้องไม่เกิน 100 ตัวอักษร"),
  lastName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกนามสกุล")
    .max(100, "นามสกุลต้องไม่เกิน 100 ตัวอักษร"),
  phone: z.string().trim().regex(/^0\d{8,9}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678)"),
  dateOfBirth: z.string().min(1, "กรุณาเลือกวันเดือนปีเกิด"),
  employeeId: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "รหัสพนักงานต้องเป็นตัวเลข 4 หลักเท่านั้น (เช่น 0001)"),
  password: z
    .string()
    .min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
    .max(72, "รหัสผ่านต้องไม่เกิน 72 ตัวอักษร")
    .regex(/[a-z]/, "รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว")
    .regex(/[A-Z]/, "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว")
    .regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"),
});

export type CreateStaffFormData = z.infer<typeof createStaffSchema>;
