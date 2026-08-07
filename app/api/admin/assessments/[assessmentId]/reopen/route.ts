/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import type { DupakStatus } from "@/lib/app-types";

export const runtime = "nodejs";

const reopenSchema = z.object({
  reason: z.string().trim().min(5, "Alasan pembukaan kembali wajib diisi."),
});

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      assessmentId: string;
    }>;
  },
) {
  const { user, error } = await requireUser("ADMIN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Admin Tim PAK yang dapat membuka kembali penilaian." },
      { status: 403 },
    );
  }

  try {
    const { assessmentId } = await context.params;
    const body = await request.json();
    const data = reopenSchema.parse(body);

    const assessment = await prisma.pakAssessment.findUnique({
      where: {
        id: assessmentId,
      },
      include: {
        assignment: {
          include: {
            pakUser: {
              select: {
                id: true,
                email: true,
              },
            },
            submission: {
              include: {
                lecturer: {
                  select: {
                    fullName: true,
                  },
                },
                examinationMinute: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { message: "Penilaian tidak ditemukan." },
        { status: 404 },
      );
    }

    if (!assessment.isRatified) {
      return NextResponse.json(
        { message: "Penilaian belum disahkan, tidak perlu dibuka kembali." },
        { status: 409 },
      );
    }

    const submission = assessment.assignment.submission;

    if (submission.examinationMinute?.status === "FINAL") {
      return NextResponse.json(
        {
          message:
            "Berita acara sudah disahkan. Buka kembali berita acara terlebih dahulu.",
        },
        { status: 409 },
      );
    }

    const fromStatus = submission.status as DupakStatus;

    await prisma.$transaction(async (tx) => {
      await tx.pakAssessment.update({
        where: {
          id: assessment.id,
        },
        data: {
          isRatified: false,
          lockedAt: null,
          reopenedAt: new Date(),
          reopenReason: data.reason,
        },
      });

      await tx.pakAssignment.update({
        where: {
          id: assessment.assignmentId,
        },
        data: {
          status: "ACTIVE",
        },
      });

      if (
        fromStatus === "PENILAIAN_DISAHKAN" ||
        fromStatus === "BERITA_ACARA_DRAFT"
      ) {
        await recordStatusHistory({
          tx,
          submissionId: submission.id,
          fromStatus,
          toStatus: "SEDANG_DINILAI",
          reason: `Penilaian dibuka kembali oleh Admin: ${data.reason}`,
          changedById: user.id,
          changedByEmail: user.email,
          changedByRole: user.role,
        });

        await tx.dupakSubmission.update({
          where: {
            id: submission.id,
          },
          data: {
            status: "SEDANG_DINILAI",
          },
        });
      }
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "PAK_ASSESSMENT_REOPEN",
      entity: "PakAssessment",
      entityId: assessment.id,
      oldValue: { isRatified: true },
      newValue: { isRatified: false },
      reason: data.reason,
      metadata: {
        submissionId: submission.id,
        lecturerName: submission.lecturer.fullName,
      },
    });

    await createNotification({
      userId: assessment.assignment.pakUser.id,
      title: "Penilaian Dibuka Kembali",
      message: `Admin membuka kembali penilaian DUPAK ${submission.lecturer.fullName}. Alasan: ${data.reason}`,
      type: "SYSTEM",
      href: "/pak/tugas",
      metadata: {
        submissionId: submission.id,
      },
    });

    return NextResponse.json({
      message: "Penilaian berhasil dibuka kembali.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data tidak valid." },
        { status: 400 },
      );
    }

    console.error("PAK_ASSESSMENT_REOPEN_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal membuka kembali penilaian." },
      { status: 500 },
    );
  }
}
