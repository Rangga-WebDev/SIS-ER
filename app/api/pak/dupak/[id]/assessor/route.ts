/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivePakAssignment } from "@/lib/pak-access";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import type { DupakStatus } from "@/lib/app-types";
import {
  DUPAK_TEMPLATE_ROWS,
  type DupakCreditData,
} from "@/lib/dupak-template";

export const runtime = "nodejs";

const numericText = z
  .string()
  .trim()
  .max(20, "Nilai terlalu panjang.")
  .regex(/^$|^[0-9]+([.,][0-9]+)?$/, "Nilai harus berupa angka.");

const assessorSchema = z.object({
  assessorData: z.record(
    z.string(),
    z.object({
      oldAssessor: numericText.optional(),
      newAssessor: numericText.optional(),
    }),
  ),
});

const itemRowCodes = new Set(
  DUPAK_TEMPLATE_ROWS.filter((row) => row.type === "ITEM").map(
    (row) => row.code,
  ),
);

const SCORABLE_STATUSES: DupakStatus[] = [
  "DITUGASKAN_KE_TIM_PAK",
  "SEDANG_DINILAI",
  "DIKIRIM_ULANG_SETELAH_REVISI",
  "DITERIMA_TIM_PAK",
];

function toCreditData(value: unknown): DupakCreditData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as DupakCreditData;
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { user, error } = await requireUser("TIM_PAK");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Tim PAK yang dapat mengisi penilaian." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

    const assignment = await getActivePakAssignment(user.id, id);

    if (!assignment) {
      return NextResponse.json(
        { message: "Anda tidak memiliki penugasan aktif pada pengajuan ini." },
        { status: 403 },
      );
    }

    if (assignment.assessment?.isRatified) {
      return NextResponse.json(
        { message: "Penilaian sudah disahkan dan terkunci." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const data = assessorSchema.parse(body);

    const submission = await prisma.dupakSubmission.findUnique({
      where: {
        id,
      },
      include: {
        lecturer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { message: "Pengajuan DUPAK tidak ditemukan." },
        { status: 404 },
      );
    }

    const fromStatus = submission.status as DupakStatus;

    if (!SCORABLE_STATUSES.includes(fromStatus)) {
      return NextResponse.json(
        { message: "Pengajuan tidak berada pada tahap penilaian." },
        { status: 409 },
      );
    }

    const creditData = toCreditData(submission.creditData);
    let updatedRows = 0;

    for (const [rowCode, value] of Object.entries(data.assessorData)) {
      if (!itemRowCodes.has(rowCode)) continue;

      const current = creditData[rowCode] || {};

      creditData[rowCode] = {
        ...current,
        oldAssessor: value.oldAssessor?.trim() || "",
        newAssessor: value.newAssessor?.trim() || "",
      };

      updatedRows += 1;
    }

    if (updatedRows === 0) {
      return NextResponse.json(
        { message: "Tidak ada baris penilaian yang valid untuk disimpan." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.dupakSubmission.update({
        where: {
          id: submission.id,
        },
        data: {
          creditData: creditData as Prisma.InputJsonValue,
          ...(fromStatus === "DITUGASKAN_KE_TIM_PAK" ||
          fromStatus === "DIKIRIM_ULANG_SETELAH_REVISI"
            ? { status: "SEDANG_DINILAI" }
            : {}),
        },
      });

      if (
        fromStatus === "DITUGASKAN_KE_TIM_PAK" ||
        fromStatus === "DIKIRIM_ULANG_SETELAH_REVISI"
      ) {
        await recordStatusHistory({
          tx,
          submissionId: submission.id,
          fromStatus,
          toStatus: "SEDANG_DINILAI",
          reason: "Tim PAK mulai mengisi penilaian.",
          changedById: user.id,
          changedByEmail: user.email,
          changedByRole: user.role,
        });
      }

      // Draft penilaian tercatat pada assessment penugasan.
      await tx.pakAssessment.upsert({
        where: {
          assignmentId: assignment.id,
        },
        update: {
          assessorId: user.id,
          assessorEmail: user.email,
        },
        create: {
          assignmentId: assignment.id,
          assessorId: user.id,
          assessorEmail: user.email,
        },
      });
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "PAK_ASSESSMENT_DRAFT_SAVE",
      entity: "DupakSubmission",
      entityId: submission.id,
      newValue: { updatedRows },
      metadata: {
        assignmentId: assignment.id,
        lecturerName: submission.lecturer.fullName,
      },
    });

    return NextResponse.json({
      message: "Penilaian tersimpan sebagai draft.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data penilaian tidak valid." },
        { status: 400 },
      );
    }

    console.error("PAK_SCORE_SAVE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan penilaian." },
      { status: 500 },
    );
  }
}
