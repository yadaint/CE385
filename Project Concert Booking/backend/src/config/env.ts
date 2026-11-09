import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * ตรวจสอบ environment variables ด้วย Zod ตั้งแต่ startup
 * เพื่อให้แอปหยุดทำงานทันทีพร้อมข้อความที่ชัดเจนเมื่อตั้งค่าผิด
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string({ required_error: "ต้องระบุ DATABASE_URL" })
    .min(1, "ต้องระบุ DATABASE_URL"),
  JWT_SECRET: z
    .string({ required_error: "ต้องระบุ JWT_SECRET" })
    .min(16, "JWT_SECRET ต้องมีความยาวอย่างน้อย 16 ตัวอักษร"),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(86_400),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  /** โดเมนอีเมลของทีมงาน — ใช้สร้างอีเมลแอดมินอัตโนมัติ: admin{รหัสพนักงาน}@โดเมนนี้ */
  ADMIN_EMAIL_DOMAIN: z
    .string()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "ADMIN_EMAIL_DOMAIN ไม่ใช่รูปแบบโดเมนที่ถูกต้อง")
    .default("concerthub.dev"),
  /** รหัสยืนยันเพิ่ม/ลดแอดมิน (8 ตัวอักษร ฟิคไว้) — ต้องใส่ถูกทุกครั้งจึงมีสิทธิ์ */
  ADMIN_ACCESS_CODE: z
    .string()
    .min(8, "ADMIN_ACCESS_CODE ต้องมีอย่างน้อย 8 ตัวอักษร")
    .default("Main0110"),
  /** อีเมลกลางของทีมแอดมิน — ทุกคนใช้อีเมลนี้เข้าหลังบ้าน ตัวตนจริงระบุด้วยรหัสผ่านส่วนตัว */
  ADMIN_LOGIN_EMAIL: z
    .string()
    .email("ADMIN_LOGIN_EMAIL ไม่ใช่รูปแบบอีเมลที่ถูกต้อง")
    .default("admin@concerthub.dev"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ ค่า environment variables ไม่ถูกต้อง:");
  for (const issue of parsedEnv.error.issues) {
    console.error(`   → ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsedEnv.data;
