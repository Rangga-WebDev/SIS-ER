/** @format */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import type { DupakStatus } from "@/lib/app-types";
import {
  computeAssessmentCompleteness,
  loadReviewValidation,
  toCreditData,
} from "@/lib/pak-access";

export const runtime = "nodejs";

class RatificationError extends Error {
  constructor(
    message: string,
    readonly status = 409,
    readonly missingRows?: string[],
  ) {
    super(message);
    this.name = "RatificationError";
  }
}

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
      { message: "Hanya Tim PAK yang dapat mengesahkan penilaian." },
      { status: 403 },
    );
  }

  try {
    const { assignmentId } = await context.params;

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

    if (
      !assignment.assessment ||
      assignment.assessment.decision !== "DITERIMA"
    ) {
      return NextResponse.json(
        {
          message:
            "Penilaian hanya dapat disahkan setelah keputusan Diterima disimpan.",
        },
        { status: 409 },
      );
    }

    if (assignment.assessment.isRatified) {
      return NextResponse.json(
        { message: "Penilaian sudah disahkan sebelumnya." },
        { status: 409 },
      );
    }

    const submission = assignment.submission;
    const fromStatus = submission.status as DupakStatus;

    if (fromStatus !== "DITERIMA_TIM_PAK" && fromStatus !== "APPROVED") {
      return NextResponse.json(
        { message: "Pengajuan belum berada pada tahap Diterima Tim PAK." },
        { status: 409 },
      );
    }

    const now = new Date();

    const ratification = await prisma.$transaction(async (tx) => {
      // Semua ratifikasi pada submission yang sama diserialisasi oleh row lock.
      await tx.$queryRaw`
        SELECT "id"
        FROM "DupakSubmission"
        WHERE "id" = ${submission.id}
        FOR UPDATE
      `;

      const freshAssignment = await tx.pakAssignment.findFirst({
        where: {
          id: assignment.id,
          pakUserId: user.id,
          status: "ACTIVE",
        },
        include: {
          assessment: true,
          submission: true,
        },
      });

      if (!freshAssignment?.assessment) {
        throw new RatificationError(
          "Penugasan aktif tidak ditemukan atau sudah diproses.",
        );
      }

      if (freshAssignment.assessment.decision !== "DITERIMA") {
        throw new RatificationError(
          "Penilaian hanya dapat disahkan setelah keputusan Diterima disimpan.",
        );
      }

      if (freshAssignment.assessment.isRatified) {
        throw new RatificationError("Penilaian sudah disahkan sebelumnya.");
      }

      const freshStatus = freshAssignment.submission.status as DupakStatus;

      if (freshStatus !== "DITERIMA_TIM_PAK" && freshStatus !== "APPROVED") {
        throw new RatificationError(
          "Pengajuan belum berada pada tahap Diterima Tim PAK.",
        );
      }

      const completeness = computeAssessmentCompleteness(
        toCreditData(freshAssignment.submission.creditData),
      );

      // Validasi review per item dilakukan ulang di dalam lock agar
      // perubahan menit terakhir tetap tertangkap.
      const reviewValidation = await loadReviewValidation({
        assignmentId: freshAssignment.id,
        submissionId: freshAssignment.submissionId,
        creditData: toCreditData(freshAssignment.submission.creditData),
        tx,
      });

      if (!reviewValidation.okForAccept) {
        const pendingCount =
          reviewValidation.issues.length + reviewValidation.outstanding.length;

        throw new RatificationError(
          `Penilaian belum lengkap. ${pendingCount} item belum tuntas dinilai.`,
          400,
          [...reviewValidation.issues, ...reviewValidation.outstanding]
            .slice(0, 10)
            .map((issue) => `${issue.rowCode}: ${issue.message}`),
        );
      }

      const assessmentUpdate = await tx.pakAssessment.updateMany({
        where: {
          id: freshAssignment.assessment.id,
          isRatified: false,
        },
        data: {
          isRatified: true,
          ratifiedAt: now,
          lockedAt: now,
          totalScore: completeness.totalScore,
        },
      });

      if (assessmentUpdate.count !== 1) {
        throw new RatificationError("Penilaian sudah disahkan sebelumnya.");
      }

      const assignmentUpdate = await tx.pakAssignment.updateMany({
        where: {
          id: freshAssignment.id,
          pakUserId: user.id,
          status: "ACTIVE",
        },
        data: {
          status: "COMPLETED",
        },
      });

      if (assignmentUpdate.count !== 1) {
        throw new RatificationError(
          "Penugasan tidak lagi aktif. Muat ulang halaman sebelum melanjutkan.",
        );
      }

      const remainingActive = await tx.pakAssignment.count({
        where: {
          submissionId: freshAssignment.submissionId,
          status: "ACTIVE",
        },
      });

      if (remainingActive === 0) {
        const submissionUpdate = await tx.dupakSubmission.updateMany({
          where: {
            id: freshAssignment.submissionId,
            status: {
              in: ["DITERIMA_TIM_PAK", "APPROVED"],
            },
          },
          data: {
            status: "PENILAIAN_DISAHKAN",
          },
        });

        if (submissionUpdate.count !== 1) {
          throw new RatificationError(
            "Status pengajuan berubah. Muat ulang halaman sebelum melanjutkan.",
          );
        }

        await recordStatusHistory({
          tx,
          submissionId: freshAssignment.submissionId,
          fromStatus: freshStatus,
          toStatus: "PENILAIAN_DISAHKAN",
          reason: "Seluruh Tim PAK telah mengesahkan penilaian.",
          changedById: user.id,
          changedByEmail: user.email,
          changedByRole: user.role,
        });
      }

      return {
        allCompleted: remainingActive === 0,
        totalScore: completeness.totalScore,
      };
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "PAK_ASSESSMENT_RATIFY",
      entity: "PakAssessment",
      entityId: assignment.assessment.id,
      newValue: {
        isRatified: true,
        ratifiedAt: now.toISOString(),
        totalScore: ratification.totalScore,
      },
      metadata: {
        submissionId: submission.id,
        assignmentId: assignment.id,
        lecturerName: submission.lecturer.fullName,
      },
    });

    if (ratification.allCompleted) {
      await notifyAdmins({
        title: "Seluruh Penilaian Tim PAK Disahkan",
        message: `Seluruh Tim PAK telah mengesahkan penilaian DUPAK ${submission.lecturer.fullName}. Berita acara dapat dibuat.`,
        type: "SYSTEM",
        href: `/admin/dupak/${submission.id}`,
        metadata: {
          submissionId: submission.id,
        },
      });

      await createNotification({
        userId: submission.lecturer.userId,
        title: "Penilaian DUPAK Disahkan",
        message: "Seluruh penilaian DUPAK Anda telah disahkan oleh Tim PAK.",
        type: "SYSTEM",
        href: "/dosen/dupak",
        metadata: {
          submissionId: submission.id,
        },
      });
    } else {
      await notifyAdmins({
        title: "Satu Penilaian Tim PAK Disahkan",
        message: `${user.email} telah mengesahkan penilaian DUPAK ${submission.lecturer.fullName}. Masih menunggu penilai aktif lainnya.`,
        type: "SYSTEM",
        href: `/admin/dupak/${submission.id}`,
        metadata: {
          submissionId: submission.id,
          assignmentId: assignment.id,
        },
      });
    }

    return NextResponse.json({
      message: ratification.allCompleted
        ? "Penilaian berhasil disahkan dan seluruh proses penilaian dikunci."
        : "Penilaian Anda berhasil disahkan dan dikunci. Menunggu penilai lainnya.",
      totalScore: ratification.totalScore,
    });
  } catch (error) {
    if (error instanceof RatificationError) {
      return NextResponse.json(
        {
          message: error.message,
          ...(error.missingRows ? { missingRows: error.missingRows } : {}),
        },
        { status: error.status },
      );
    }

    console.error("PAK_RATIFY_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengesahkan penilaian." },
      { status: 500 },
    );
  }
}
