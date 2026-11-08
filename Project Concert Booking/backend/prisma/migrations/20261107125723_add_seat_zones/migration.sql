/*
  Warnings:

  - You are about to drop the column `availableSeats` on the `Concert` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Concert` table. All the data in the column will be lost.
  - You are about to drop the column `totalSeats` on the `Concert` table. All the data in the column will be lost.
  - Added the required column `zoneId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "zoneId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Concert" DROP COLUMN "availableSeats",
DROP COLUMN "price",
DROP COLUMN "totalSeats";

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Zone_concertId_idx" ON "Zone"("concertId");

-- CreateIndex
CREATE INDEX "Booking_zoneId_idx" ON "Booking"("zoneId");

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
