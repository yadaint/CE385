// src/lib/prisma.ts — จุดเดียวในโปรแกรมที่สร้าง PrismaClient
// ทำไมต้องมีไฟล์นี้: ถ้าใครอยากคุยกับฐานข้อมูลก็ import ตัวนี้ไปใช้
// จะได้มี connection pool ชุดเดียว ไม่ใช่เปิดใหม่ทุกไฟล์
import "dotenv/config";                            // โหลด .env ก่อนอ่าน process.env
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // ล้มให้ดังตั้งแต่ตอนเปิดโปรแกรม ดีกว่าไปพังตอนมีคนยิง request เข้ามา
  throw new Error("ไม่พบค่า DATABASE_URL — คัดลอก .env.example เป็น .env แล้วกรอกให้ครบก่อน");
}

// adapter คือ "หัวแปลง" ที่ให้ Prisma คุยกับไดรเวอร์ pg ของ PostgreSQL
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });