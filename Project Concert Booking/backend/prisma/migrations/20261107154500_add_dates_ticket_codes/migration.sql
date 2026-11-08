-- เพิ่มระบบวันที่แสดงหลายวัน (Concert.dates) + รหัสตั๋ว (Booking.ticketCode)
-- รูปแบบรหัสตั๋ว: PJY + รหัสโซน 2 ตัว + เลขสุ่ม 5 ตัว (สร้างในโค้ด)
-- พร้อมรูปปก/อิโมจิประจำคอนเสิร์ต และรหัสโซน 2 ตัวอักษร

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "showDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ticketCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Concert" DROP COLUMN "date",
ADD COLUMN     "dates" TIMESTAMP(3)[],
ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Zone" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_ticketCode_key" ON "Booking"("ticketCode");
