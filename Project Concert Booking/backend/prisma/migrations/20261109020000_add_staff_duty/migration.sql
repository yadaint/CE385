-- ตารางบันทึกเวรแอดมิน: ล็อกอินแล้วต้องเลือกว่า "วันนี้ใครเป็นคนทำงาน"
-- แถวที่ endedAt = NULL คือเวรที่เปิดอยู่ (กำลังทำงานอยู่ตอนนี้)

-- CreateTable
CREATE TABLE "StaffDuty" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "StaffDuty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffDuty_workDate_idx" ON "StaffDuty"("workDate");

-- CreateIndex
CREATE INDEX "StaffDuty_staffId_idx" ON "StaffDuty"("staffId");

-- AddForeignKey
ALTER TABLE "StaffDuty" ADD CONSTRAINT "StaffDuty_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
