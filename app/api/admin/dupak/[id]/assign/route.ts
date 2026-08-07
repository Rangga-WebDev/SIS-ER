/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import { assertTransition } from "@/lib/dupak-workflow";
import type { DupakStatus } from "@/lib/app-types";

export const runtime = "nodejs";

const assignSchema = z.object({
  pakUserIds: z
    .array(z.string().trim().min(1))
    .min(1, "Pilih minimal satu Tim PAK."),
  deadline: z.string().trim().optional(),
  assignmentNote: z.string().trim().max(3000).optional(),
});

function toDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { user, error } = await requireUser("ADMIN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Admin Tim PAK yang dapat menugaskan." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = assignSchema.parse(body);

    const submission = await prisma.dupakSubmission.findUnique({
      where: {
        id,
      },
      include: {
        lecturer: {
          select: {
            id: true,
            fullName: true,
            userId: true,
          },
        },
        pakAssignments: {
          where: {
            status: "ACTIVE",
          },
          select: {
            pakUserId: true,
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

    const isAddingAssessor =
      fromStatus === "DITUGASKAN_KE_TIM_PAK" ||
      fromStatus === "SEDANG_DINILAI" ||
      fromStatus === "DIKIRIM_ULANG_SETELAH_REVISI";

    if (!isAddingAssessor) {
      const transition = assertTransition(fromStatus, "DITUGASKAN_KE_TIM_PAK");

      if (!transition.ok) {
        return NextResponse.json(
          {
            message:
              "Pengajuan hanya dapat ditugaskan setelah lolos verifikasi Admin.",
          },
          { status: 409 },
        );
      }
    }

    const pakUsers = await prisma.user.findMany({
      where: {
        id: {
          in: data.pakUserIds,
        },
        role: "TIM_PAK",
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (pakUsers.length !== data.pakUserIds.length) {
      return NextResponse.json(
        { message: "Terdapat akun Tim PAK yang tidak valid atau tidak aktif." },
        { status: 400 },
      );
    }

    const alreadyAssigned = new Set(
      submission.pakAssignments.map((assignment) => assignment.pakUserId),
    );

    const newAssessors = pakUsers.filter(
      (pakUser) => !alreadyAssigned.has(pakUser.id),
    );

    if (newAssessors.length === 0) {
      return NextResponse.json(
        {
          message:
            "Seluruh Tim PAK terpilih sudah ditugaskan pada pengajuan ini.",
        },
        { status: 409 },
      );
    }

    const deadline = toDate(data.deadline);

    await prisma.$transaction(async (tx) => {
      for (const pakUser of newAssessors) {
        await tx.pakAssignment.create({
          data: {
            submissionId: submission.id,
            pakUserId: pakUser.id,
            assignedById: user.id,
            assignedByEmail: user.email,
            deadline,
            assignmentNote: data.assignmentNote || null,
            status: "ACTIVE",
          },
        });
      }

      if (!isAddingAssessor) {
        await recordStatusHistory({
          tx,
          submissionId: submission.id,
          fromStatus,
          toStatus: "DITUGASKAN_KE_TIM_PAK",
          reason: data.assignmentNote || null,
          changedById: user.id,
          changedByEmail: user.email,
          changedByRole: user.role,
        });

        await tx.dupakSubmission.update({
          where: {
            id: submission.id,
          },
          data: {
            status: "DITUGASKAN_KE_TIM_PAK",
          },
        });
      }
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "PAK_ASSIGNMENT_CREATE",
      entity: "DupakSubmission",
      entityId: submission.id,
      newValue: {
        pakUserIds: newAssessors.map((item) => item.id),
        deadline,
        assignmentNote: data.assignmentNote || null,
      },
      metadata: {
        lecturerId: submission.lecturer.id,
        lecturerName: submission.lecturer.fullName,
      },
    });

    for (const pakUser of newAssessors) {
      await createNotification({
        userId: pakUser.id,
        title: "Tugas Penilaian Baru",
        message: `Anda ditugaskan menilai DUPAK ${submission.lecturer.fullName}${
          deadline
            ? ` dengan batas waktu ${new Intl.DateTimeFormat("id-ID", {
                dateStyle: "long",
              }).format(deadline)}`
            : ""
        }.`,
        type: "SYSTEM",
        href: `/pak/tugas`,
        metadata: {
          submissionId: submission.id,
        },
      });
    }

    await createNotification({
      userId: submission.lecturer.userId,
      title: "Pengajuan Ditugaskan ke Tim PAK",
      message:
        "Pengajuan DUPAK Anda telah ditugaskan kepada Tim PAK untuk dinilai.",
      type: "SYSTEM",
      href: "/dosen/dupak",
      metadata: {
        submissionId: submission.id,
      },
    });

    return NextResponse.json({
      message: `Penugasan berhasil dikirim ke ${newAssessors.length} Tim PAK.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data penugasan tidak valid." },
        { status: 400 },
      );
    }

    console.error("PAK_ASSIGN_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengirim penugasan." },
      { status: 500 },
    );
  }
}
