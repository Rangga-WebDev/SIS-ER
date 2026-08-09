/** @format */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
export {
  canKomiteSee,
  canSenateSee,
  evaluateDupakAccess,
  KOMITE_VISIBLE_STATUSES,
  SENAT_VISIBLE_STATUSES,
} from "@/lib/access-policy";
import {
  canKomiteSee,
  canSenateSee,
  evaluateDupakAccess,
} from "@/lib/access-policy";
import {
  DUPAK_TEMPLATE_ROWS,
  getAssessorTotal,
  getProposerTotal,
  type DupakCreditData,
} from "@/lib/dupak-template";
import {
  buildReviewUnits,
  computeReviewValidation,
  type DupakItemReviewData,
  type ReviewValidation,
} from "@/lib/dupak-review";

export function toCreditData(value: unknown): DupakCreditData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as DupakCreditData;
}

// Memuat unit penilaian + review milik satu penugasan lalu memvalidasi
// kelengkapannya (dipakai keputusan dan pengesahan Tim PAK).
export async function loadReviewValidation(options: {
  assignmentId: string;
  submissionId: string;
  creditData: DupakCreditData;
  tx?: Prisma.TransactionClient;
}): Promise<ReviewValidation> {
  const db = options.tx || prisma;

  const [entries, reviews, evidences] = await Promise.all([
    db.dupakItemEntry.findMany({
      where: { submissionId: options.submissionId },
      select: {
        id: true,
        rowCode: true,
        title: true,
        credit: true,
        orderIndex: true,
      },
    }),
    db.dupakItemReview.findMany({
      where: { assignmentId: options.assignmentId },
      select: {
        rowCode: true,
        entryKey: true,
        assessedCredit: true,
        status: true,
        comment: true,
      },
    }),
    db.dupakEvidence.findMany({
      where: { dupakSubmissionId: options.submissionId },
      select: { rowCode: true, evidenceUrl: true },
    }),
  ]);

  const units = buildReviewUnits({
    creditData: options.creditData,
    entries,
    evidences,
  });

  return computeReviewValidation(units, reviews as DupakItemReviewData[]);
}

export function computeAssessmentCompleteness(creditData: DupakCreditData) {
  const itemRows = DUPAK_TEMPLATE_ROWS.filter((row) => row.type === "ITEM");

  const proposedRows = itemRows.filter(
    (row) => getProposerTotal(creditData[row.code]) > 0,
  );

  const missingRows = proposedRows.filter(
    (row) => getAssessorTotal(creditData[row.code]) <= 0,
  );

  const totalScore = itemRows.reduce(
    (sum, row) => sum + getAssessorTotal(creditData[row.code]),
    0,
  );

  return {
    proposedCount: proposedRows.length,
    missingRows: missingRows.map((row) => row.label),
    isComplete: proposedRows.length > 0 && missingRows.length === 0,
    totalScore,
  };
}

export async function getActivePakAssignment(
  pakUserId: string,
  submissionId: string,
) {
  return prisma.pakAssignment.findFirst({
    where: {
      pakUserId,
      submissionId,
      status: "ACTIVE",
    },
    include: {
      assessment: true,
    },
  });
}

// Penugasan aktif milik penilai untuk DUPAK dosen tertentu (basis akses detail dosen).
export async function getActivePakAssignmentForLecturer(
  pakUserId: string,
  lecturerId: string,
) {
  return prisma.pakAssignment.findFirst({
    where: {
      pakUserId,
      status: "ACTIVE",
      submission: {
        lecturerId,
      },
    },
    select: {
      id: true,
      submissionId: true,
    },
  });
}

export async function hasDupakAccess({
  role,
  userId,
  submissionId,
}: {
  role: string;
  userId: string;
  submissionId: string;
}) {
  if (role === "ADMIN") return true;

  const submission = await prisma.dupakSubmission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      status: true,
      lecturer: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!submission) return false;

  const hasActivePakAssignment =
    role === "TIM_PAK"
      ? Boolean(await getActivePakAssignment(userId, submissionId))
      : false;

  return evaluateDupakAccess({
    role,
    userId,
    lecturerUserId: submission.lecturer.userId,
    status: submission.status,
    hasActivePakAssignment,
  });
}
