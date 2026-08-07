/** @format */

import { prisma } from "@/lib/prisma";
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

export function toCreditData(value: unknown): DupakCreditData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as DupakCreditData;
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
