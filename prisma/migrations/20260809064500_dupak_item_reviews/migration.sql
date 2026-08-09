-- CreateEnum
CREATE TYPE "DupakReviewStatus" AS ENUM ('SESUAI', 'PERLU_REVISI', 'TIDAK_SESUAI', 'DIREVISI_DOSEN');

-- AlterTable
ALTER TABLE "PakAssessment" ADD COLUMN     "lastPosition" TEXT;

-- CreateTable
CREATE TABLE "DupakItemEntry" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "rowCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subCategory" TEXT,
    "description" TEXT,
    "activityYear" TEXT,
    "credit" TEXT,
    "evidenceUrl" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DupakItemEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DupakItemReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "rowCode" TEXT NOT NULL,
    "entryKey" TEXT NOT NULL DEFAULT '',
    "assessedCredit" TEXT,
    "status" "DupakReviewStatus",
    "comment" TEXT,
    "assessorId" TEXT,
    "assessorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DupakItemReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DupakReviewHistory" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "rowCode" TEXT NOT NULL,
    "entryKey" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DupakReviewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DupakItemEntry_submissionId_rowCode_idx" ON "DupakItemEntry"("submissionId", "rowCode");

-- CreateIndex
CREATE INDEX "DupakItemEntry_submissionId_idx" ON "DupakItemEntry"("submissionId");

-- CreateIndex
CREATE INDEX "DupakItemReview_submissionId_rowCode_idx" ON "DupakItemReview"("submissionId", "rowCode");

-- CreateIndex
CREATE INDEX "DupakItemReview_assignmentId_idx" ON "DupakItemReview"("assignmentId");

-- CreateIndex
CREATE INDEX "DupakItemReview_status_idx" ON "DupakItemReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DupakItemReview_assignmentId_rowCode_entryKey_key" ON "DupakItemReview"("assignmentId", "rowCode", "entryKey");

-- CreateIndex
CREATE INDEX "DupakReviewHistory_submissionId_rowCode_idx" ON "DupakReviewHistory"("submissionId", "rowCode");

-- CreateIndex
CREATE INDEX "DupakReviewHistory_assignmentId_idx" ON "DupakReviewHistory"("assignmentId");

-- CreateIndex
CREATE INDEX "DupakReviewHistory_createdAt_idx" ON "DupakReviewHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "DupakItemEntry" ADD CONSTRAINT "DupakItemEntry_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DupakSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DupakItemReview" ADD CONSTRAINT "DupakItemReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DupakSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DupakItemReview" ADD CONSTRAINT "DupakItemReview_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PakAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DupakReviewHistory" ADD CONSTRAINT "DupakReviewHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DupakSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
