/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordStatusHistory } from "@/lib/audit";
import type { DupakStatus } from "@/lib/app-types";
import {
  DUPAK_TEMPLATE_ROWS,
  getNumberValue,
  type DupakCreditData,
} from "@/lib/dupak-template";

export const runtime = "nodejs";

const numericText = z
  .string()
  .trim()
  .max(20, "Nilai terlalu panjang.")
  .regex(/^$|^[0-9]+([.,][0-9]+)?$/, "Angka kredit harus berupa angka.");

const reviewItemSchema = z.object({
  rowCode: z.string().trim().min(1).max(120),
  entryKey: z.string().trim().max(60).default(""),
  assessedCredit: numericText.optional(),
  status: z
    .enum(["SESUAI", "PERLU_REVISI", "TIDAK_SESUAI"])
    .nullable()
    .optional(),
  comment: z
    .string()
    .trim()
    .max(1000, "Komentar maksimal 1000 karakter.")
    .optional(),
});

const reviewsSchema = z
  .object({
    items: z
      .array(reviewItemSchema)
      .max(50, "Terlalu banyak item dalam satu penyimpanan.")
      .default([]),
    // Kolom "Lama" Tim Penilai per baris, ditulis langsung ke creditData.
    rowOldAssessors: z.record(z.string(), numericText).optional(),
    lastPosition: z.string().trim().max(200).optional(),
  })
  .refine(
    (data) =>
      data.items.length > 0 ||
      Object.keys(data.rowOldAssessors || {}).length > 0,
    { message: "Tidak ada penilaian yang dikirim." },
  );

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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const { user, error } = await requireUser("TIM_PAK");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Tim PAK yang dapat mengisi penilaian." },
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
          select: {
            id: true,
            status: true,
            creditData: true,
          },
        },
      },
    });

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

    const submission = assignment.submission;
    const fromStatus = submission.status as DupakStatus;

    if (!SCORABLE_STATUSES.includes(fromStatus)) {
      return NextResponse.json(
        { message: "Pengajuan tidak berada pada tahap penilaian." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const data = reviewsSchema.parse(body);

    const oldAssessorEntries = Object.entries(data.rowOldAssessors || {});

    const invalidRow =
      data.items.find((item) => !itemRowCodes.has(item.rowCode)) ||
      oldAssessorEntries.find(([rowCode]) => !itemRowCodes.has(rowCode));

    if (invalidRow) {
      return NextResponse.json(
        { message: "Terdapat baris DUPAK yang tidak valid." },
        { status: 400 },
      );
    }

    // Validasi entryKey milik submission + baris yang sama.
    const entryKeys = data.items
      .map((item) => item.entryKey)
      .filter((key) => key.length > 0);

    if (entryKeys.length > 0) {
      const entries = await prisma.dupakItemEntry.findMany({
        where: {
          id: { in: entryKeys },
          submissionId: submission.id,
        },
        select: { id: true, rowCode: true },
      });

      const entryMap = new Map(entries.map((entry) => [entry.id, entry]));

      const invalidEntry = data.items.find((item) => {
        if (!item.entryKey) return false;
        const entry = entryMap.get(item.entryKey);
        return !entry || entry.rowCode !== item.rowCode;
      });

      if (invalidEntry) {
        return NextResponse.json(
          { message: "Terdapat rincian kegiatan yang tidak valid." },
          { status: 400 },
        );
      }
    }

    const touchedRows = Array.from(
      new Set(data.items.map((item) => item.rowCode)),
    );

    await prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        const values = {
          assessedCredit:
            item.assessedCredit !== undefined
              ? item.assessedCredit.replace(",", ".") || null
              : undefined,
          status: item.status === undefined ? undefined : item.status,
          comment:
            item.comment !== undefined ? item.comment || null : undefined,
          assessorId: user.id,
          assessorEmail: user.email,
        };

        await tx.dupakItemReview.upsert({
          where: {
            assignmentId_rowCode_entryKey: {
              assignmentId: assignment.id,
              rowCode: item.rowCode,
              entryKey: item.entryKey,
            },
          },
          update: values,
          create: {
            submissionId: submission.id,
            assignmentId: assignment.id,
            rowCode: item.rowCode,
            entryKey: item.entryKey,
            assessedCredit:
              item.assessedCredit !== undefined
                ? item.assessedCredit.replace(",", ".") || null
                : null,
            status: item.status ?? null,
            comment: item.comment || null,
            assessorId: user.id,
            assessorEmail: user.email,
          },
        });
      }

      // Sinkronkan jumlah AK dinilai per baris ke creditData agar subtotal,
      // PDF, Excel, dan pengesahan tetap konsisten.
      const rowReviews = await tx.dupakItemReview.findMany({
        where: {
          assignmentId: assignment.id,
          rowCode: { in: touchedRows },
        },
        select: { rowCode: true, assessedCredit: true },
      });

      const freshSubmission = await tx.dupakSubmission.findUnique({
        where: { id: submission.id },
        select: { creditData: true },
      });

      const creditData = toCreditData(freshSubmission?.creditData);

      for (const rowCode of touchedRows) {
        const total = rowReviews
          .filter((review) => review.rowCode === rowCode)
          .reduce(
            (sum, review) => sum + getNumberValue(review.assessedCredit || ""),
            0,
          );

        const hasCredit = rowReviews.some(
          (review) =>
            review.rowCode === rowCode &&
            String(review.assessedCredit || "").trim().length > 0,
        );

        creditData[rowCode] = {
          ...(creditData[rowCode] || {}),
          newAssessor: hasCredit ? String(round2(total)) : "",
        };
      }

      // Kolom "Lama" Tim Penilai per baris.
      for (const [rowCode, value] of oldAssessorEntries) {
        creditData[rowCode] = {
          ...(creditData[rowCode] || {}),
          oldAssessor: value.replace(",", ".").trim(),
        };
      }

      await tx.dupakSubmission.update({
        where: { id: submission.id },
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

      await tx.pakAssessment.upsert({
        where: { assignmentId: assignment.id },
        update: {
          assessorId: user.id,
          assessorEmail: user.email,
          ...(data.lastPosition !== undefined
            ? { lastPosition: data.lastPosition || null }
            : {}),
        },
        create: {
          assignmentId: assignment.id,
          assessorId: user.id,
          assessorEmail: user.email,
          lastPosition: data.lastPosition || null,
        },
      });
    });

    return NextResponse.json({
      message: "Penilaian tersimpan otomatis.",
      savedCount: data.items.length,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data penilaian tidak valid." },
        { status: 400 },
      );
    }

    console.error("PAK_REVIEW_AUTOSAVE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan penilaian." },
      { status: 500 },
    );
  }
}
