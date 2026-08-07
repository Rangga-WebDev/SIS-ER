/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import type { DupakStatus } from "@/lib/app-types";

export const runtime = "nodejs";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CANCEL"),
    reason: z.string().trim().min(3, "Alasan pembatalan wajib diisi."),
  }),
  z.object({
    action: z.literal("REASSIGN"),
    newPakUserId: z.string().trim().min(1, "Tim PAK pengganti wajib dipilih."),
    reason: z.string().trim().min(3, "Alasan pengalihan wajib diisi."),
    deadline: z.string().trim().optional(),
  }),
]);

function toDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      assignmentId: string;
    }>;
  },
) {
  const { user, error } = await requireUser("ADMIN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Admin Tim PAK yang dapat mengubah penugasan." },
      { status: 403 },
    );
  }

  try {
    const { assignmentId } = await context.params;
    const body = await request.json();
    const data = actionSchema.parse(body);

    const assignment = await prisma.pakAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      include: {
        assessment: true,
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
        { message: "Penugasan tidak ditemukan." },
        { status: 404 },
      );
    }

    if (assignment.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Hanya penugasan aktif yang dapat diubah." },
        { status: 409 },
      );
    }

    if (assignment.assessment?.isRatified) {
      return NextResponse.json(
        {
          message:
            "Penilaian pada penugasan ini sudah disahkan dan tidak dapat diubah.",
        },
        { status: 409 },
      );
    }

    const submission = assignment.submission;

    if (data.action === "CANCEL") {
      await prisma.$transaction(async (tx) => {
        await tx.pakAssignment.update({
          where: {
            id: assignment.id,
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: data.reason,
          },
        });

        const remainingActive = await tx.pakAssignment.count({
          where: {
            submissionId: submission.id,
            status: "ACTIVE",
          },
        });

        // Tanpa penilai aktif, pengajuan kembali ke daftar siap ditugaskan.
        if (
          remainingActive === 0 &&
          ["DITUGASKAN_KE_TIM_PAK", "SEDANG_DINILAI"].includes(
            submission.status,
          )
        ) {
          await recordStatusHistory({
            tx,
            submissionId: submission.id,
            fromStatus: submission.status as DupakStatus,
            toStatus: "LOLOS_VERIFIKASI_ADMIN",
            reason: `Penugasan dibatalkan: ${data.reason}`,
            changedById: user.id,
            changedByEmail: user.email,
            changedByRole: user.role,
          });

          await tx.dupakSubmission.update({
            where: {
              id: submission.id,
            },
            data: {
              status: "LOLOS_VERIFIKASI_ADMIN",
            },
          });
        }
      });

      await logAudit({
        request,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "PAK_ASSIGNMENT_CANCEL",
        entity: "PakAssignment",
        entityId: assignment.id,
        oldValue: { status: "ACTIVE", pakUserId: assignment.pakUserId },
        newValue: { status: "CANCELLED" },
        reason: data.reason,
        metadata: {
          submissionId: submission.id,
          lecturerName: submission.lecturer.fullName,
        },
      });

      await createNotification({
        userId: assignment.pakUser.id,
        title: "Penugasan Dibatalkan",
        message: `Penugasan penilaian DUPAK ${submission.lecturer.fullName} dibatalkan oleh Admin. Alasan: ${data.reason}`,
        type: "SYSTEM",
        href: "/pak/tugas",
        metadata: {
          submissionId: submission.id,
        },
      });

      return NextResponse.json({
        message: "Penugasan berhasil dibatalkan.",
      });
    }

    // REASSIGN
    const newPakUser = await prisma.user.findFirst({
      where: {
        id: data.newPakUserId,
        role: "TIM_PAK",
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!newPakUser) {
      return NextResponse.json(
        { message: "Akun Tim PAK pengganti tidak valid atau tidak aktif." },
        { status: 400 },
      );
    }

    if (newPakUser.id === assignment.pakUserId) {
      return NextResponse.json(
        { message: "Tim PAK pengganti sama dengan penilai saat ini." },
        { status: 400 },
      );
    }

    const existingActive = await prisma.pakAssignment.findFirst({
      where: {
        submissionId: submission.id,
        pakUserId: newPakUser.id,
        status: "ACTIVE",
      },
    });

    if (existingActive) {
      return NextResponse.json(
        {
          message:
            "Tim PAK pengganti sudah memiliki penugasan aktif pada pengajuan ini.",
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.pakAssignment.update({
        where: {
          id: assignment.id,
        },
        data: {
          status: "REASSIGNED",
          cancelledAt: new Date(),
          cancellationReason: data.reason,
        },
      });

      await tx.pakAssignment.create({
        data: {
          submissionId: submission.id,
          pakUserId: newPakUser.id,
          assignedById: user.id,
          assignedByEmail: user.email,
          deadline: toDate(data.deadline) || assignment.deadline,
          assignmentNote: assignment.assignmentNote,
          reassignedFromId: assignment.id,
          status: "ACTIVE",
        },
      });
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "PAK_ASSIGNMENT_REASSIGN",
      entity: "PakAssignment",
      entityId: assignment.id,
      oldValue: { pakUserId: assignment.pakUserId },
      newValue: { pakUserId: newPakUser.id },
      reason: data.reason,
      metadata: {
        submissionId: submission.id,
        lecturerName: submission.lecturer.fullName,
      },
    });

    await createNotification({
      userId: newPakUser.id,
      title: "Tugas Penilaian Baru (Pengalihan)",
      message: `Anda menerima pengalihan tugas penilaian DUPAK ${submission.lecturer.fullName}.`,
      type: "SYSTEM",
      href: "/pak/tugas",
      metadata: {
        submissionId: submission.id,
      },
    });

    await createNotification({
      userId: assignment.pakUser.id,
      title: "Penugasan Dialihkan",
      message: `Penugasan penilaian DUPAK ${submission.lecturer.fullName} dialihkan ke Tim PAK lain. Alasan: ${data.reason}`,
      type: "SYSTEM",
      href: "/pak/tugas",
      metadata: {
        submissionId: submission.id,
      },
    });

    return NextResponse.json({
      message: "Penugasan berhasil dialihkan.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message:
            error.issues[0]?.message || "Data perubahan penugasan tidak valid.",
        },
        { status: 400 },
      );
    }

    console.error("PAK_ASSIGNMENT_UPDATE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengubah penugasan." },
      { status: 500 },
    );
  }
}
