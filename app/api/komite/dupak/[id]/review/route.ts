/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createNotification,
  notifyAdmins,
  notifyRole,
} from "@/lib/notifications";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import type { DupakStatus } from "@/lib/app-types";

export const runtime = "nodejs";

const reviewSchema = z.object({
  result: z.enum([
    "MEMENUHI",
    "PERLU_KLARIFIKASI",
    "PERLU_PERBAIKAN",
    "TIDAK_MEMENUHI",
  ]),
  note: z.string().trim().min(5, "Catatan pemeriksaan wajib diisi.").max(5000),
});

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { user, error } = await requireUser("KOMITE_INTEGRITAS_AKADEMIK");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Komite Integritas Akademik yang dapat memutuskan." },
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
      },
    });

    if (!submission) {
      return NextResponse.json(
        { message: "Pengajuan tidak ditemukan." },
        { status: 404 },
      );
    }

    if (submission.status !== "PEMERIKSAAN_INTEGRITAS") {
      return NextResponse.json(
        {
          message: "Pengajuan tidak berada pada tahap pemeriksaan integritas.",
        },
        { status: 409 },
      );
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.integrityReview.create({
        data: {
          submissionId: submission.id,
          result: data.result,
          note: data.note,
          reviewerId: user.id,
          reviewerEmail: user.email,
        },
      });

      if (data.result === "MEMENUHI") {
        await recordStatusHistory({
          tx,
          submissionId: submission.id,
          fromStatus: submission.status as DupakStatus,
          toStatus: "PEMERIKSAAN_SENAT",
          reason: `Komite Integritas: Memenuhi. ${data.note}`,
          changedById: user.id,
          changedByEmail: user.email,
          changedByRole: user.role,
        });

        await tx.dupakSubmission.update({
          where: {
            id: submission.id,
          },
          data: {
            status: "PEMERIKSAAN_SENAT",
          },
        });
      }

      return created;
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "INTEGRITY_REVIEW_DECISION",
      entity: "IntegrityReview",
      entityId: review.id,
      newValue: { result: data.result },
      reason: data.note,
      metadata: {
        submissionId: submission.id,
        lecturerName: submission.lecturer.fullName,
      },
    });

    await notifyAdmins({
      title: "Hasil Pemeriksaan Integritas",
      message: `Komite Integritas memberi hasil "${data.result}" untuk pengajuan ${submission.lecturer.fullName}.`,
      type: "SYSTEM",
      href: `/admin/dupak/${submission.id}`,
      metadata: {
        submissionId: submission.id,
        result: data.result,
      },
    });

    if (data.result === "MEMENUHI") {
      await notifyRole({
        role: "TIM_SENAT",
        title: "Pengajuan Masuk Pemeriksaan Senat",
        message: `Pengajuan DUPAK ${submission.lecturer.fullName} lolos pemeriksaan integritas dan masuk tahap Tim Senat.`,
        type: "SYSTEM",
        href: "/senat/dashboard",
        metadata: {
          submissionId: submission.id,
        },
      });
    } else {
      await createNotification({
        userId: submission.lecturer.userId,
        title: "Hasil Pemeriksaan Integritas",
        message: `Komite Integritas Akademik memberi hasil "${data.result}". Catatan: ${data.note}`,
        type: "SYSTEM",
        href: "/dosen/dupak",
        metadata: {
          submissionId: submission.id,
        },
      });
    }

    return NextResponse.json({
      message: "Hasil pemeriksaan integritas berhasil disimpan.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message || "Data pemeriksaan tidak valid.",
        },
        { status: 400 },
      );
    }

    console.error("INTEGRITY_REVIEW_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan hasil pemeriksaan." },
      { status: 500 },
    );
  }
}
