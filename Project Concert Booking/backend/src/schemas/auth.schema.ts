import { z } from "zod";

import { accessCodeSchema } from "./admin.schema";

/** ตรวจเลขบัตรประชาชนไทย 13 หลักด้วย checksum ตามมาตรฐานกรมการปกครอง */
export const isValidThaiNationalId = (value: string): boolean => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(digits[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === Number(digits[12]);
};

/** ตรวจว่าอายุไม่ต่ำกว่า 12 ปีและไม่เกิน 120 ปี */
export const isReasonableBirthDate = (value: Date): boolean => {
  const now = new Date();
  const age = now.getFullYear() - value.getFullYear();
  if (value.getTime() > now.getTime()) return false;
  return age >= 12 && age <= 120;
};

/** กติกาเดียวกันทั้งรหัสผ่านผู้ใช้และพนักงาน — อย่างน้อย 8 ตัว มีตัวเล็ก/ใหญ่/ตัวเลข */
const passwordSchema = z
  .string({ required_error: "กรุณากรอกรหัสผ่าน" })
  .min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
  .max(72, "รหัสผ่านต้องไม่เกิน 72 ตัวอักษร")
  .regex(/[a-z]/, "รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว")
  .regex(/[A-Z]/, "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว")
  .regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");

export const registerSchema = z.object({
  email: z
    .string({ required_error: "กรุณากรอกอีเมล" })
    .trim()
    .toLowerCase()
    .min(1, "กรุณากรอกอีเมล")
    .email("อีเมลไม่ถูกต้อง")
    .max(255, "อีเมลต้องไม่เกิน 255 ตัวอักษร"),
  password: passwordSchema,

  // ─── ข้อมูลผู้สมัคร ───
  firstName: z
    .string({ required_error: "กรุณากรอกชื่อจริง" })
    .trim()
    .min(1, "กรุณากรอกชื่อจริง")
    .max(100, "ชื่อจริงต้องไม่เกิน 100 ตัวอักษร"),
  lastName: z
    .string({ required_error: "กรุณากรอกนามสกุล" })
    .trim()
    .min(1, "กรุณากรอกนามสกุล")
    .max(100, "นามสกุลต้องไม่เกิน 100 ตัวอักษร"),
  phone: z
    .string({ required_error: "กรุณากรอกเบอร์โทรศัพท์" })
    .trim()
    .regex(/^0\d{8,9}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678)"),
  dateOfBirth: z.coerce
    .date({ invalid_type_error: "กรุณาเลือกวันเดือนปีเกิด" })
    .refine((date) => isReasonableBirthDate(date), "วันเดือนปีเกิดไม่ถูกต้อง"),
  nationalId: z
    .string({ required_error: "กรุณากรอกเลขบัตรประชาชน" })
    .trim()
    .refine(
      (value) => isValidThaiNationalId(value),
      "เลขบัตรประชาชนไม่ถูกต้อง (ต้องเป็น 13 หลักตามมาตรฐาน)",
    ),
  /** เลขหลังบัตรประชาชน (Laser code) เช่น JT0-123456-78 — ตัวอักษร+ตัวเลข */
  nationalIdBack: z
    .string({ required_error: "กรุณากรอกเลขหลังบัตรประชาชน" })
    .trim()
    .refine(
      (value) => /^[A-Za-z]{1,2}\d{9,12}$/.test(value.replace(/[-\s]/g, "")),
      "เลขหลังบัตรประชาชนไม่ถูกต้อง (เช่น JT0-123456-78)",
    ),
});

/**
 * สร้างบัญชีแอดมินใหม่ (จากหลังบ้าน โดยแอดมินที่ล็อกอินอยู่)
 * ไม่รับอีเมล — ระบบสร้างให้เองจากรหัสพนักงาน: admin{รหัส}@ADMIN_EMAIL_DOMAIN
 */
export const createStaffSchema = z.object({
  firstName: z
    .string({ required_error: "กรุณากรอกชื่อจริง" })
    .trim()
    .min(1, "กรุณากรอกชื่อจริง")
    .max(100, "ชื่อจริงต้องไม่เกิน 100 ตัวอักษร"),
  lastName: z
    .string({ required_error: "กรุณากรอกนามสกุล" })
    .trim()
    .min(1, "กรุณากรอกนามสกุล")
    .max(100, "นามสกุลต้องไม่เกิน 100 ตัวอักษร"),
  phone: z
    .string({ required_error: "กรุณากรอกเบอร์โทรศัพท์" })
    .trim()
    .regex(/^0\d{8,9}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678)"),
  dateOfBirth: z.coerce
    .date({ invalid_type_error: "กรุณาเลือกวันเดือนปีเกิด" })
    .refine((date) => isReasonableBirthDate(date), "วันเดือนปีเกิดไม่ถูกต้อง"),
  /** รหัสพนักงาน — ตัวเลข 4 หลักเท่านั้น (เช่น 0001) ใช้สร้างอีเมล: admin{รหัส}@domain */
  employeeId: z
    .string({ required_error: "กรุณากรอกรหัสพนักงาน" })
    .trim()
    .regex(/^\d{4}$/, "รหัสพนักงานต้องเป็นตัวเลข 4 หลักเท่านั้น (เช่น 0001)"),
  password: passwordSchema,
  /** รหัสยืนยันการเพิ่มแอดมิน (8 ตัว — ฟิคไว้ที่ ADMIN_ACCESS_CODE ต้องถูกทุกครั้ง) */
  accessCode: accessCodeSchema,
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "กรุณากรอกอีเมล" })
    .trim()
    .toLowerCase()
    .min(1, "กรุณากรอกอีเมล")
    .email("อีเมลไม่ถูกต้อง"),
  password: z.string({ required_error: "กรุณากรอกรหัสผ่าน" }).min(1, "กรุณากรอกรหัสผ่าน"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
