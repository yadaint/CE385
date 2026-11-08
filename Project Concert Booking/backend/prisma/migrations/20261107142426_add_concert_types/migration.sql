-- CreateEnum
CREATE TYPE "Origin" AS ENUM ('THAI', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "ArtistType" AS ENUM ('SOLO', 'GROUP');

-- AlterTable
ALTER TABLE "Concert" ADD COLUMN     "artistType" "ArtistType" NOT NULL DEFAULT 'GROUP',
ADD COLUMN     "origin" "Origin" NOT NULL DEFAULT 'THAI';
