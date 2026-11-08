-- Migration นี้เพิ่มค่า enum ใหม่ก่อนเท่านั้น
-- (PostgreSQL ไม่อนุญาตให้ใช้ค่า enum ที่เพิ่มเพิ่งใน transaction เดียวกับการเพิ่มค่า
--  จึงต้องแยกออกจาก migration ที่สร้างตาราง Payment และแก้ default ของ Booking.status)

ALTER TYPE "BookingStatus" ADD VALUE 'PENDING';
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "BookingStatus" ADD VALUE 'REJECTED';

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED');
