-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('LOLOS_VERIFIKASI', 'PERLU_PERBAIKAN_ADMIN', 'DITOLAK_ADMIN');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "AssessmentDecision" AS ENUM ('PERLU_REVISI', 'DITERIMA');

-- CreateEnum
CREATE TYPE "MinuteStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "IntegrityResult" AS ENUM ('MEMENUHI', 'PERLU_KLARIFIKASI', 'PERLU_PERBAIKAN', 'TIDAK_MEMENUHI');

-- CreateEnum
CREATE TYPE "SenateDecision" AS ENUM ('DISETUJUI', 'DIKEMBALIKAN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DupakStatus" ADD VALUE 'PERLU_PERBAIKAN_ADMIN';
ALTER TYPE "DupakStatus" ADD VALUE 'DITOLAK_ADMIN';
ALTER TYPE "DupakStatus" ADD VALUE 'LOLOS_VERIFIKASI_ADMIN';
ALTER TYPE "DupakStatus" ADD VALUE 'DITUGASKAN_KE_TIM_PAK';
ALTER TYPE "DupakStatus" ADD VALUE 'SEDANG_DINILAI';
ALTER TYPE "DupakStatus" ADD VALUE 'PERLU_REVISI_TIM_PAK';
ALTER TYPE "DupakStatus" ADD VALUE 'DIKIRIM_ULANG_SETELAH_REVISI';
ALTER TYPE "DupakStatus" ADD VALUE 'DITERIMA_TIM_PAK';
ALTER TYPE "DupakStatus" ADD VALUE 'PENILAIAN_DISAHKAN';
ALTER TYPE "DupakStatus" ADD VALUE 'BERITA_ACARA_DRAFT';
ALTER TYPE "DupakStatus" ADD VALUE 'BERITA_ACARA_DISAHKAN';
ALTER TYPE "DupakStatus" ADD VALUE 'PEMERIKSAAN_INTEGRITAS';
ALTER TYPE "DupakStatus" ADD VALUE 'PEMERIKSAAN_SENAT';
ALTER TYPE "DupakStatus" ADD VALUE 'SELESAI';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'TIM_PAK';
ALTER TYPE "Role" ADD VALUE 'KOMITE_INTEGRITAS_AKADEMIK';
ALTER TYPE "Role" ADD VALUE 'TIM_SENAT';

-- CreateTable
CREATE TABLE "AdminVerification" (
    "id" TEXT NOT NULL,
    "decision" "VerificationDecision" NOT NULL,
    "internalNote" TEXT,
    "lecturerNote" TEXT,
    "submissionId" TEXT NOT NULL,
    "adminId" TEXT,
    "adminEmail" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PakAssignment" (
    "id" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "submissionId" TEXT NOT NULL,
    "pakUserId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedByEmail" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "assignmentNote" TEXT,
    "reassignedFromId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PakAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PakAssessment" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "assessorId" TEXT,
    "assessorEmail" TEXT,
    "decision" "AssessmentDecision",
    "totalScore" DOUBLE PRECISION,
    "internalNote" TEXT,
    "lecturerRevisionNote" TEXT,
    "isRatified" BOOLEAN NOT NULL DEFAULT false,
    "ratifiedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PakAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExaminationMinute" (
    "id" TEXT NOT NULL,
    "nomor" TEXT,
    "examinationDate" TIMESTAMP(3),
    "content" JSONB,
    "status" "MinuteStatus" NOT NULL DEFAULT 'DRAFT',
    "submissionId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdByEmail" TEXT,
    "ratifiedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExaminationMinute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityReview" (
    "id" TEXT NOT NULL,
    "result" "IntegrityResult" NOT NULL,
    "note" TEXT,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrityReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SenateReview" (
    "id" TEXT NOT NULL,
    "decision" "SenateDecision" NOT NULL,
    "note" TEXT,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SenateReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "fromStatus" "DupakStatus",
    "toStatus" "DupakStatus" NOT NULL,
    "reason" TEXT,
    "submissionId" TEXT NOT NULL,
    "changedById" TEXT,
    "changedByEmail" TEXT,
    "changedByRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminVerification_submissionId_idx" ON "AdminVerification"("submissionId");

-- CreateIndex
CREATE INDEX "AdminVerification_decision_idx" ON "AdminVerification"("decision");

-- CreateIndex
CREATE INDEX "PakAssignment_submissionId_idx" ON "PakAssignment"("submissionId");

-- CreateIndex
CREATE INDEX "PakAssignment_pakUserId_idx" ON "PakAssignment"("pakUserId");

-- CreateIndex
CREATE INDEX "PakAssignment_status_idx" ON "PakAssignment"("status");

-- CreateIndex
CREATE INDEX "PakAssignment_deadline_idx" ON "PakAssignment"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "PakAssignment_submissionId_pakUserId_status_key" ON "PakAssignment"("submissionId", "pakUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PakAssessment_assignmentId_key" ON "PakAssessment"("assignmentId");

-- CreateIndex
CREATE INDEX "PakAssessment_decision_idx" ON "PakAssessment"("decision");

-- CreateIndex
CREATE INDEX "PakAssessment_isRatified_idx" ON "PakAssessment"("isRatified");

-- CreateIndex
CREATE UNIQUE INDEX "ExaminationMinute_submissionId_key" ON "ExaminationMinute"("submissionId");

-- CreateIndex
CREATE INDEX "ExaminationMinute_status_idx" ON "ExaminationMinute"("status");

-- CreateIndex
CREATE INDEX "IntegrityReview_submissionId_idx" ON "IntegrityReview"("submissionId");

-- CreateIndex
CREATE INDEX "IntegrityReview_result_idx" ON "IntegrityReview"("result");

-- CreateIndex
CREATE INDEX "SenateReview_submissionId_idx" ON "SenateReview"("submissionId");

-- CreateIndex
CREATE INDEX "SenateReview_decision_idx" ON "SenateReview"("decision");

-- CreateIndex
CREATE INDEX "StatusHistory_submissionId_idx" ON "StatusHistory"("submissionId");

-- CreateIndex
CREATE INDEX "StatusHistory_toStatus_idx" ON "StatusHistory"("toStatus");

-- CreateIndex
CREATE INDEX "StatusHistory_createdAt_idx" ON "StatusHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminVerification" ADD CONSTRAINT "AdminVerification_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DupakSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PakAssignment" ADD CONSTRAINT "PakAssignment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DupakSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PakAssignment" ADD CONSTRAINT "PakAssignment_pakUserId_fkey" FOREIGN KEY ("pakUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PakAssessment" ADD CONSTRAINT "PakAssessment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PakAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExaminationMinute" ADD CONSTRAINT "ExaminationMinute_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DupakSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityReview" ADD CONSTRAINT "IntegrityReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DupakSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenateReview" ADD CONSTRAINT "SenateReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DupakSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DupakSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
