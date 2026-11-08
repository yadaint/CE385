// src/server.ts — จุดเริ่มโปรแกรม
// หน้าที่เดียว: เปิดพอร์ต
// แยกจาก app.ts เพราะการ "ประกอบร่าง" กับการ "เปิดพอร์ต" คือสองเรื่อง
import "dotenv/config";
import { app } from "./app.js";
import { prisma } from "./lib/prisma.js";

const PORT = Number(process.env.PORT ?? 3000);

const server = app.listen(PORT, () => {
  console.log(`เซิร์ฟเวอร์พร้อมรับคำขอที่ http://localhost:${PORT}`);
  console.log(`ลองยิงดู: curl http://localhost:${PORT}/api/v1/students`);
});

/* ---------- ปิดโปรแกรมให้เรียบร้อย ---------- */
// กด Ctrl+C แล้วต้องคืน connection ให้ฐานข้อมูลก่อนตาย
// ไม่ทำก็ไม่พังทันที แต่ถ้ารีสตาร์ทบ่อย ๆ connection จะค้างจนเต็ม pool
const shutdown = async () => {
  console.log("\nกำลังปิดเซิร์ฟเวอร์...");
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);