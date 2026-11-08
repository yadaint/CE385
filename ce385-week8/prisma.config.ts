// prisma.config.ts — ไฟล์ตั้งค่าของเครื่องมือ Prisma (Prisma 7 ขึ้นไป)
// เดิม (Prisma 6) เคยใส่ url ไว้ใน schema.prisma ตรง ๆ
// Prisma 7 ย้ายมาอยู่ที่นี่ เพราะไฟล์ .ts อ่าน process.env ได้
import "dotenv/config"; // โหลดค่าจาก .env เข้า process.env ก่อนใช้งาน
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",      // ไฟล์ที่บอกว่าฐานข้อมูลมีตารางอะไร
  migrations: {
    path: "prisma/migrations",         // ที่เก็บประวัติการเปลี่ยนแปลงฐานข้อมูล
    seed: "tsx prisma/seed.ts",        // คำสั่งที่ prisma db seed จะเรียก
  },
  datasource: {
    url: env("DATABASE_URL"),          // อ่านสายเชื่อมต่อจาก .env
  },
});