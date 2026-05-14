/*
  Warnings:

  - A unique constraint covering the columns `[lecturerId,requirementId,occurrenceKey]` on the table `DocumentSubmission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DocumentInputType" AS ENUM ('FILE', 'URL', 'FILE_AND_URL', 'METADATA_ONLY');

-- DropIndex
DROP INDEX "DocumentSubmission_lecturerId_requirementId_key";

-- AlterTable
ALTER TABLE "DocumentRequirement" ADD COLUMN     "helperText" TEXT,
ADD COLUMN     "inputType" "DocumentInputType" NOT NULL DEFAULT 'FILE',
ADD COLUMN     "isYearly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresExternalUrl" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresLetterDate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresLetterNumber" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sampleUrl" TEXT,
ADD COLUMN     "yearEnd" INTEGER,
ADD COLUMN     "yearStart" INTEGER;

-- AlterTable
ALTER TABLE "DocumentSubmission" ADD COLUMN     "academicYear" INTEGER,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "letterDate" TIMESTAMP(3),
ADD COLUMN     "letterNumber" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "occurrenceKey" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "skpPredicate" TEXT,
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "fileSize" DROP NOT NULL,
ALTER COLUMN "mimeType" DROP NOT NULL,
ALTER COLUMN "storagePath" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "DocumentCategory_order_idx" ON "DocumentCategory"("order");

-- CreateIndex
CREATE INDEX "DocumentRequirement_inputType_idx" ON "DocumentRequirement"("inputType");

-- CreateIndex
CREATE INDEX "DocumentRequirement_isYearly_idx" ON "DocumentRequirement"("isYearly");

-- CreateIndex
CREATE INDEX "DocumentSubmission_requirementId_idx" ON "DocumentSubmission"("requirementId");

-- CreateIndex
CREATE INDEX "DocumentSubmission_academicYear_idx" ON "DocumentSubmission"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSubmission_lecturerId_requirementId_occurrenceKey_key" ON "DocumentSubmission"("lecturerId", "requirementId", "occurrenceKey");

-- CreateIndex
CREATE INDEX "VerificationLog_status_idx" ON "VerificationLog"("status");
