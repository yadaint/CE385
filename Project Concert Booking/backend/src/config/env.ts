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
