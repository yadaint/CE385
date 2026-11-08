import { z } from "zod";

/** ตรวจเลขบัตรประชาชนไทย 13 หลักด้วย checksum (ตรงกับฝั่ง backend) */
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

/** ตรวจเลขหลังบัตรประชาชน (Laser code เช่น JT0-123456-78 = 2 ตัวอักษร + 9-12 ตัวเลข) */
export const isValidNationalIdBack = (value: string): boolean =>
  /^[A-Za-z]{1,2}\d{9,12}$/.test(value.replace(/[-\s]/g, ""));

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "กรุณากรอกอีเมล")
    .email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "กรุณากรอกอีเมล")
      .email("อีเมลไม่ถูกต้อง"),
    password: z
      .string()
      .min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
      .max(72, "รหัสผ่านต้องไม่เกิน 72 ตัวอักษร")
      .regex(/[a-z]/, "รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว")
      .regex(/[A-Z]/, "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว")
      .regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),

    // ─── ข้อมูลผู้สมัคร ───
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
    phone: z
      .string()
      .trim()
      .min(1, "กรุณากรอกเบอร์โทรศัพท์")
      .regex(/^0\d{8,9}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678)"),
    dateOfBirth: z
      .string()
      .min(1, "กรุณาเลือกวันเดือนปีเกิด")
      .refine((value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        const now = new Date();
        const age = now.getFullYear() - date.getFullYear();
        return date.getTime() <= now.getTime() && age >= 12 && age <= 120;
      }, "วันเดือนปีเกิดไม่ถูกต้อง"),
    nationalId: z
      .string()
      .trim()
      .min(1, "กรุณากรอกเลขบัตรประชาชน")
      .refine((value) => isValidThaiNationalId(value), "เลขบัตรประชาชนไม่ถูกต้อง"),
    nationalIdBack: z
      .string()
      .trim()
      .min(1, "กรุณากรอกเลขหลังบัตรประชาชน")
      .refine(
        (value) => isValidNationalIdBack(value),
        "เลขหลังบัตรประชาชนไม่ถูกต้อง (เช่น JT0-123456-78)",
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
