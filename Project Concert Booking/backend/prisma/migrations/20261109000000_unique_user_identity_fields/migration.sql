-- เมล/เบอร์โทร/เลขบัตรประชาชน (หน้า-หลัง) ใช้ได้ 1 บัญชีเท่านั้น
-- ผู้ใช้ที่เคยสมัครแล้วต้องลบบัญชีเดิมออกก่อน จึงจะสมัครด้วยข้อมูลชุดเดิมได้อีก
-- (คอลัมน์เป็น nullable — ค่า NULL หลายแถวไม่ถือว่าซ้ำกันตามกติกา PostgreSQL)

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_nationalId_key" ON "User"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "User_nationalIdBack_key" ON "User"("nationalIdBack");
