-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'AGENT');

-- AlterTable: convert role from String to Role enum
-- Data is safe: only CLIENT and AGENT exist in production
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CLIENT';
