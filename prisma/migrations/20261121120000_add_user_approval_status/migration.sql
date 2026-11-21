-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "User_companyId_approvalStatus_idx" ON "User"("companyId", "approvalStatus");
