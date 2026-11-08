/*
  Warnings:

  - You are about to drop the column `venue` on the `Concert` table. All the data in the column will be lost.
  - Added the required column `venueId` to the `Concert` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Concert" DROP COLUMN "venue",
ADD COLUMN     "venueId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Zone" ADD COLUMN     "isOnSale" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueZone" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "side" "ZoneSide" NOT NULL DEFAULT 'CENTER',
    "wide" BOOLEAN NOT NULL DEFAULT false,
    "mapRow" INTEGER NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "seatsPerRow" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venue_name_key" ON "Venue"("name");

-- CreateIndex
CREATE INDEX "VenueZone_venueId_idx" ON "VenueZone"("venueId");

-- AddForeignKey
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueZone" ADD CONSTRAINT "VenueZone_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
