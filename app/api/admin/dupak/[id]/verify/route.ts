/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import { assertTransition } from "@/lib/dupak-workflow";
import type { DupakStatus } from "@/lib/app-types";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const verifySchema = z
  .object({
    decision: z.enum([
      "LOLOS_VERIFIKASI",
      "PERLU_PERBAIKAN_ADMIN",
      "DITOLAK_ADMIN",
    ]),
    internalNote: z.string().trim().max(3000).optional(),
    lecturerNote: z.string().trim().max(3000).optional(),
  })
  .refine(
    (data) =>
      data.decision === "LOLOS_VERIFIKASI" ||
      Boolean(data.lecturerNote?.trim()),
    {
      message:
        "Catatan untuk dosen wajib diisi jika pengajuan dikembalikan atau ditolak.",
      path: ["lecturerNote"],
    },
  );

const DECISION_TO_STATUS: Record<string, DupakStatus> = {
  LOLOS_VERIFIKASI: "LOLOS_VERIFIKASI_ADMIN",
  PERLU_PERBAIKAN_ADMIN: "PERLU_PERBAIKAN_ADMIN",
  DITOLAK_ADMIN: "DITOLAK_ADMIN",
};

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
      { message: "Hanya Admin Tim PAK yang dapat memverifikasi." },
      { status: 403 },
    );
  }

  const limit = await rateLimit({
    key: `dupak-verify:${user.id}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(
      "Terlalu banyak aksi verifikasi. Coba lagi sebentar.",
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = verifySchema.parse(body);

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
        { message: "Pengajuan DUPAK tidak ditemukan." },
        { status: 404 },
      );
    }

    const fromStatus = submission.status as DupakStatus;
    const toStatus = DECISION_TO_STATUS[data.decision];

    const transition = assertTransition(fromStatus, toStatus);

    if (!transition.ok) {
      return NextResponse.json(
        { message: transition.message },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.adminVerification.create({
        data: {
          submissionId: submission.id,
          decision: data.decision,
          internalNote: data.internalNote || null,
          lecturerNote: data.lecturerNote || null,
          adminId: user.id,
          adminEmail: user.email,
        },
      });

      await recordStatusHistory({
        tx,
        submissionId: submission.id,
        fromStatus,
        toStatus,
        reason: data.lecturerNote || data.internalNote || null,
        changedById: user.id,
        changedByEmail: user.email,
        changedByRole: user.role,
      });

      return tx.dupakSubmission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: toStatus,
          adminNote: data.lecturerNote || null,
          verifiedAt: new Date(),
        },
      });
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "DUPAK_ADMIN_VERIFY",
      entity: "DupakSubmission",
      entityId: submission.id,
      oldValue: { status: fromStatus },
      newValue: { status: toStatus, decision: data.decision },
      reason: data.lecturerNote || null,
      metadata: {
        lecturerId: submission.lecturer.id,
        lecturerName: submission.lecturer.fullName,
      },
    });

    const notifTitle =
      data.decision === "LOLOS_VERIFIKASI"
        ? "Pengajuan Lolos Verifikasi Admin"
        : data.decision === "PERLU_PERBAIKAN_ADMIN"
          ? "Pengajuan Perlu Perbaikan"
          : "Pengajuan Ditolak Admin";

    const notifMessage =
      data.decision === "LOLOS_VERIFIKASI"
        ? "Pengajuan DUPAK Anda lolos verifikasi awal dan siap ditugaskan ke Tim PAK."
        : `Pengajuan DUPAK Anda ${
            data.decision === "PERLU_PERBAIKAN_ADMIN"
              ? "dikembalikan untuk diperbaiki"
              : "ditolak"
          }. Catatan admin: ${data.lecturerNote}`;

    await createNotification({
      userId: submission.lecturer.userId,
      title: notifTitle,
      message: notifMessage,
      type: "SYSTEM",
      href: "/dosen/dupak",
      metadata: {
        submissionId: submission.id,
        decision: data.decision,
      },
    });

    return NextResponse.json({
      message: "Keputusan verifikasi berhasil disimpan.",
      submission: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data verifikasi tidak valid." },
        { status: 400 },
      );
    }

    console.error("DUPAK_ADMIN_VERIFY_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan keputusan verifikasi." },
      { status: 500 },
    );
  }
}
