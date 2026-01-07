-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('POD_SHARE', 'HOSTEL', 'SHARED_APARTMENT', 'PRIVATE_ROOM');

-- CreateEnum
CREATE TYPE "PlaceStatus" AS ENUM ('DRAFT', 'LIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" VARCHAR(150) NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "accommodationType" "AccommodationType" NOT NULL,
    "retailPrice" DOUBLE PRECISION NOT NULL,
    "minimumBid" DOUBLE PRECISION NOT NULL,
    "autoAcceptAboveMinimum" BOOLEAN NOT NULL DEFAULT true,
    "blackoutDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PlaceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "placeId" TEXT NOT NULL,

    CONSTRAINT "place_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "place_images" ADD CONSTRAINT "place_images_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
