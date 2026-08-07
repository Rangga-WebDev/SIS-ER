/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import type { DupakStatus } from "@/lib/app-types";

export const runtime = "nodejs";

const reviewSchema = z.object({
  decision: z.enum(["DISETUJUI", "DIKEMBALIKAN"]),
  note: z.string().trim().min(5, "Catatan keputusan wajib diisi.").max(5000),
});

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { user, error } = await requireUser("TIM_SENAT");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Tim Senat yang dapat memberi keputusan." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = reviewSchema.parse(body);

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
        examinationMinute: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { message: "Pengajuan tidak ditemukan." },
        { status: 404 },
      );
    }

    if (submission.status !== "PEMERIKSAAN_SENAT") {
      return NextResponse.json(
        { message: "Pengajuan tidak berada pada tahap pemeriksaan senat." },
        { status: 409 },
      );
    }

    if (submission.examinationMinute?.status !== "FINAL") {
      return NextResponse.json(
        { message: "Berita acara pemeriksaan belum disahkan." },
        { status: 409 },
      );
    }

    const toStatus: DupakStatus =
      data.decision === "DISETUJUI" ? "SELESAI" : "PEMERIKSAAN_INTEGRITAS";

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.senateReview.create({
        data: {
          submissionId: submission.id,
          decision: data.decision,
          note: data.note,
          reviewerId: user.id,
          reviewerEmail: user.email,
        },
      });

      await recordStatusHistory({
        tx,
        submissionId: submission.id,
        fromStatus: submission.status as DupakStatus,
        toStatus,
        reason: `Keputusan Tim Senat: ${data.decision}. ${data.note}`,
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

      return created;
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "SENATE_REVIEW_DECISION",
      entity: "SenateReview",
      entityId: review.id,
      newValue: { decision: data.decision, toStatus },
      reason: data.note,
      metadata: {
        submissionId: submission.id,
        lecturerName: submission.lecturer.fullName,
      },
    });

    await notifyAdmins({
      title: "Keputusan Tim Senat",
      message: `Tim Senat memberi keputusan "${data.decision}" untuk pengajuan ${submission.lecturer.fullName}.`,
      type: "SYSTEM",
      href: `/admin/dupak/${submission.id}`,
      metadata: {
        submissionId: submission.id,
        decision: data.decision,
      },
    });

    await createNotification({
      userId: submission.lecturer.userId,
      title:
        data.decision === "DISETUJUI"
          ? "Pengajuan DUPAK Selesai"
          : "Pengajuan Dikembalikan Tim Senat",
      message:
        data.decision === "DISETUJUI"
          ? "Selamat! Pengajuan DUPAK Anda telah menyelesaikan seluruh tahapan."
          : `Tim Senat mengembalikan pengajuan untuk pemeriksaan ulang. Catatan: ${data.note}`,
      type: "SYSTEM",
      href: "/dosen/dupak",
      metadata: {
        submissionId: submission.id,
      },
    });

    return NextResponse.json({
      message: "Keputusan Tim Senat berhasil disimpan.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data keputusan tidak valid." },
        { status: 400 },
      );
    }

    console.error("SENATE_REVIEW_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan keputusan senat." },
      { status: 500 },
    );
  }
}
