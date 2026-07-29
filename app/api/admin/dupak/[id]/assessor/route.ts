/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
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
  const { user, error } = await requireUser("ADMIN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya admin tim penilai yang dapat mengisi penilaian." },
      { status: 403 },
    );
  }

  const limit = rateLimit({
    key: `dupak-assessor:${user.id}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(
      "Terlalu banyak aksi penilaian. Coba lagi sebentar.",
    );
  }

  try {
    const { id } = await context.params;
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
            userId: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { message: "DUPAK tidak ditemukan." },
        { status: 404 },
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

    const updated = await prisma.dupakSubmission.update({
      where: {
        id: submission.id,
      },
      data: {
        creditData: creditData as Prisma.InputJsonValue,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: "DUPAK_ASSESSOR_SAVE",
        entity: "DupakSubmission",
        entityId: submission.id,
        metadata: {
          lecturerId: submission.lecturer.id,
          lecturerName: submission.lecturer.fullName,
          assessorEmail: user.email,
          updatedRows,
        },
      },
    });

    await createNotification({
      userId: submission.lecturer.userId,
      title: "Penilaian Tim Penilai Diperbarui",
      message: `Tim penilai memperbarui kolom penilaian DUPAK Anda (${updatedRows} baris).`,
      type: "SYSTEM",
      href: "/dosen/dupak",
      metadata: {
        dupakSubmissionId: submission.id,
        assessorEmail: user.email,
        updatedRows,
      },
    });

    return NextResponse.json({
      message: "Penilaian tim penilai berhasil disimpan.",
      submission: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data penilaian tidak valid." },
        { status: 400 },
      );
    }

    console.error("DUPAK_ASSESSOR_SAVE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan penilaian tim penilai." },
      { status: 500 },
    );
  }
}
