/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import type { DupakStatus } from "@/lib/app-types";
import { computeAssessmentCompleteness, toCreditData } from "@/lib/pak-access";

export const runtime = "nodejs";

const decisionSchema = z
  .object({
    decision: z.enum(["PERLU_REVISI", "DITERIMA"]),
    internalNote: z.string().trim().max(3000).optional(),
    lecturerRevisionNote: z.string().trim().max(3000).optional(),
  })
  .refine(
    (data) =>
      data.decision === "DITERIMA" ||
      Boolean(data.lecturerRevisionNote?.trim()),
    {
      message: "Catatan revisi untuk dosen wajib diisi.",
      path: ["lecturerRevisionNote"],
    },
  );

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      assignmentId: string;
    }>;
  },
) {
  const { user, error } = await requireUser("TIM_PAK");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Tim PAK yang dapat memberi keputusan." },
      { status: 403 },
    );
  }

  try {
    const { assignmentId } = await context.params;
    const body = await request.json();
    const data = decisionSchema.parse(body);

    const assignment = await prisma.pakAssignment.findFirst({
      where: {
        id: assignmentId,
        pakUserId: user.id,
        status: "ACTIVE",
      },
      include: {
        assessment: true,
        submission: {
          include: {
            lecturer: {
              select: {
                id: true,
                fullName: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Penugasan aktif tidak ditemukan untuk akun Anda." },
        { status: 403 },
      );
    }

    if (assignment.assessment?.isRatified) {
      return NextResponse.json(
        { message: "Penilaian sudah disahkan dan terkunci." },
        { status: 409 },
      );
    }

    const submission = assignment.submission;
    const fromStatus = submission.status as DupakStatus;

    const assessableStatuses: DupakStatus[] = [
      "DITUGASKAN_KE_TIM_PAK",
      "SEDANG_DINILAI",
      "DIKIRIM_ULANG_SETELAH_REVISI",
      "DITERIMA_TIM_PAK",
    ];

    if (!assessableStatuses.includes(fromStatus)) {
      return NextResponse.json(
        { message: "Pengajuan tidak berada pada tahap penilaian." },
        { status: 409 },
      );
    }

    const completeness = computeAssessmentCompleteness(
      toCreditData(submission.creditData),
    );

    if (data.decision === "DITERIMA" && !completeness.isComplete) {
      return NextResponse.json(
        {
          message:
            completeness.proposedCount === 0
              ? "Belum ada angka kredit pengusul yang dapat dinilai."
              : `Masih ada ${completeness.missingRows.length} baris kegiatan yang belum dinilai Tim Penilai.`,
          missingRows: completeness.missingRows.slice(0, 10),
        },
        { status: 400 },
      );
    }

    const toStatus: DupakStatus =
      data.decision === "PERLU_REVISI"
        ? "PERLU_REVISI_TIM_PAK"
        : "DITERIMA_TIM_PAK";

    await prisma.$transaction(async (tx) => {
      await tx.pakAssessment.upsert({
        where: {
          assignmentId: assignment.id,
        },
        update: {
          decision: data.decision,
          totalScore: completeness.totalScore,
          internalNote: data.internalNote || null,
          lecturerRevisionNote:
            data.decision === "PERLU_REVISI"
              ? data.lecturerRevisionNote || null
              : null,
          assessorId: user.id,
          assessorEmail: user.email,
        },
        create: {
          assignmentId: assignment.id,
          decision: data.decision,
          totalScore: completeness.totalScore,
          internalNote: data.internalNote || null,
          lecturerRevisionNote:
            data.decision === "PERLU_REVISI"
              ? data.lecturerRevisionNote || null
              : null,
          assessorId: user.id,
          assessorEmail: user.email,
        },
      });

      if (fromStatus !== toStatus) {
        await recordStatusHistory({
          tx,
          submissionId: submission.id,
          fromStatus,
          toStatus,
          reason:
            data.decision === "PERLU_REVISI"
              ? data.lecturerRevisionNote || null
              : "Penilaian diterima Tim PAK.",
          changedById: user.id,
          changedByEmail: user.email,
          changedByRole: user.role,
        });

        await tx.dupakSubmission.update({
          where: {
            id: submission.id,
          },
          data: {
            status: toStatus,
          },
        });
      }
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action:
        data.decision === "PERLU_REVISI"
          ? "PAK_ASSESSMENT_REQUEST_REVISION"
          : "PAK_ASSESSMENT_ACCEPT",
      entity: "PakAssignment",
      entityId: assignment.id,
      oldValue: { status: fromStatus },
      newValue: { status: toStatus, decision: data.decision },
      reason: data.lecturerRevisionNote || data.internalNote || null,
      metadata: {
        submissionId: submission.id,
        lecturerName: submission.lecturer.fullName,
      },
    });

    if (data.decision === "PERLU_REVISI") {
      // Catatan internal tidak pernah dikirim ke dosen.
      await createNotification({
        userId: submission.lecturer.userId,
        title: "DUPAK Perlu Revisi",
        message: `Tim PAK meminta revisi pengajuan DUPAK Anda. Catatan: ${data.lecturerRevisionNote}`,
        type: "SYSTEM",
        href: "/dosen/dupak",
        metadata: {
          submissionId: submission.id,
        },
      });
    } else {
      await createNotification({
        userId: submission.lecturer.userId,
        title: "DUPAK Diterima Tim PAK",
        message:
          "Pengajuan DUPAK Anda diterima Tim PAK dan menunggu pengesahan penilaian.",
        type: "SYSTEM",
        href: "/dosen/dupak",
        metadata: {
          submissionId: submission.id,
        },
      });

      await notifyAdmins({
        title: "Penilaian Tim PAK: Diterima",
        message: `Tim PAK menerima DUPAK ${submission.lecturer.fullName}. Menunggu pengesahan penilaian.`,
        type: "SYSTEM",
        href: `/admin/dupak/${submission.id}`,
        metadata: {
          submissionId: submission.id,
        },
      });
    }

    return NextResponse.json({
      message:
        data.decision === "PERLU_REVISI"
          ? "Keputusan Perlu Revisi tersimpan dan dosen telah diberi tahu."
          : "Keputusan Diterima tersimpan. Silakan sahkan penilaian.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data keputusan tidak valid." },
        { status: 400 },
      );
    }

    console.error("PAK_DECISION_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan keputusan penilaian." },
      { status: 500 },
    );
  }
}
