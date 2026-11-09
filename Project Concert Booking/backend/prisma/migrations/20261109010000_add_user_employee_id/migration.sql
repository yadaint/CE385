-- รหัสพนักงาน (เฉพาะบัญชีแอดมิน) — ใช้ได้ 1 บัญชีเท่านั้น
-- และถูกใช้สร้างอีเมลแบบอัตโนมัติ: admin{รหัส}@domain

-- AlterTable
ALTER TABLE "User" ADD COLUMN "employeeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");
