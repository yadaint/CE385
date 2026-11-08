-- CreateEnum
CREATE TYPE "ZoneSide" AS ENUM ('LEFT', 'CENTER', 'RIGHT');

-- AlterTable
ALTER TABLE "Zone" ADD COLUMN     "side" "ZoneSide" NOT NULL DEFAULT 'CENTER',
ADD COLUMN     "wide" BOOLEAN NOT NULL DEFAULT false;
