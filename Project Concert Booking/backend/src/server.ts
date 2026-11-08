import app from "./app";
import { env } from "./config/env";
import { closeExpiredConcertSales } from "./controllers/concert.controller";
import { prisma } from "./lib/prisma";

/** ตรวจปิดขายอัตโนมัติ: คอนที่เปิดขายจนถึงวันสุดท้าย (saleEndDate) → ปิดขายทันที */
const runExpiredSaleCheck = (): void => {
  void closeExpiredConcertSales()
    .then((count) => {
      if (count > 0) {
        console.log(`⏰ ปิดขายอัตโนมัติ ${count} คอนเสิร์ต (ครบกำหนดวันสุดท้ายของการขาย)`);
      }
    })
    .catch((err) => console.error("auto-close sales failed:", err.message));
};

// ตรวจครั้งแรกตอนเปิดเซิร์ฟเวอร์ + ทุก 60 วินาที
runExpiredSaleCheck();
const saleCheckTimer = setInterval(runExpiredSaleCheck, 60_000);

const server = app.listen(env.PORT, () => {
  console.log(`🚀 API server ทำงานที่ http://localhost:${env.PORT} (${env.NODE_ENV})`);
  console.log(`📚 API base URL: http://localhost:${env.PORT}/api/v1`);
});

const shutdown = (signal: string): void => {
  console.log(`\nได้รับสัญญาณ ${signal} — กำลังปิดระบบอย่างปลอดภัย...`);
  clearInterval(saleCheckTimer);

  server.close(() => {
    void prisma
      .$disconnect()
      .then(() => {
        console.log("✅ ปิด HTTP server และคืนการเชื่อมต่อฐานข้อมูลเรียบร้อยแล้ว");
        process.exit(0);
      })
      .catch(() => process.exit(1));
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
