// prisma/seed.ts — ใส่ข้อมูลตั้งต้นลงตารางว่าง
// รันด้วย: npx prisma db seed   (หรือ npm run seed)
import { prisma } from "../src/lib/prisma.js";

const students = [
  { code: "66010001", name: "สมชาย ใจดี",        email: "somchai@dpu.ac.th",   score: 78 },
  { code: "66010002", name: "สมหญิง รักเรียน",   email: "somying@dpu.ac.th",   score: 92 },
  { code: "66010003", name: "วีรภาพ ตั้งใจ",      email: "weeraphap@dpu.ac.th", score: 65 },
  { code: "66010004", name: "ปรียา ขยันทำ",      email: "preeya@dpu.ac.th",    score: 88 },
  { code: "66010005", name: "ธนกร ไม่ยอมแพ้",    email: "thanakorn@dpu.ac.th", score: 54, active: false },
];

async function main() {
  // ล้างของเก่าก่อน เพื่อให้รัน seed ซ้ำได้เรื่อย ๆ ผลลัพธ์เหมือนกันทุกครั้ง
  await prisma.student.deleteMany();

  // skipDuplicates: ถ้าเจอ code หรือ email ซ้ำให้ข้ามไป ไม่ต้องล้ม
  const result = await prisma.student.createMany({ data: students, skipDuplicates: true });

  console.log(`เพิ่มข้อมูลนักศึกษาแล้ว ${result.count} คน`);
}

main()
  .catch((error) => { console.error("seed ไม่สำเร็จ:", error); process.exit(1); })
  .finally(() => prisma.$disconnect());