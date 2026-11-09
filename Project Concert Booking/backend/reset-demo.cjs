// ล้างข้อมูลคอนเสิร์ต/การจอง (ใช้ก่อน seed ใหม่ — ผู้ใช้/แอดมินไม่ถูกลบ)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany({});
  await prisma.bookingSeat.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.zone.deleteMany({});
  await prisma.concert.deleteMany({});
  console.log("reset OK (payments/bookings/seats/zones/concerts cleared)");
}

main()
  .catch((err) => {
    console.error("ERROR:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
