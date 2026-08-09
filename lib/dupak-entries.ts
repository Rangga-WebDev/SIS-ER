/** @format */

// Helper server-side untuk rincian kegiatan (DupakItemEntry) milik dosen.
// Dipakai oleh route entries agar route hanya berisi handler.

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  DUPAK_TEMPLATE_ROWS,
  sumEntryCredits,
  type DupakCreditData,
} from "@/lib/dupak-template";
import { isGoogleDriveUrl } from "@/lib/dupak-review";

export const MAX_ENTRIES_PER_ROW = 30;

const creditPattern = /^$|^[0-9]+([.,][0-9]+)?$/;

export const entryInputSchema = z.object({
  rowCode: z.string().trim().min(1, "Kode baris DUPAK wajib dikirim.").max(120),
  title: z
    .string()
    .trim()
    .min(3, "Nama kegiatan minimal 3 karakter.")
    .max(300, "Nama kegiatan maksimal 300 karakter."),
  subCategory: z
    .string()
    .trim()
    .max(120, "Kategori maksimal 120 karakter.")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(1000, "Uraian maksimal 1000 karakter.")
    .optional()
    .or(z.literal("")),
  activityYear: z
    .string()
    .trim()
    .max(20, "Tahun maksimal 20 karakter.")
    .optional()
    .or(z.literal("")),
  credit: z
    .string()
    .trim()
    .regex(creditPattern, "Angka kredit harus berupa angka, contoh: 12,5.")
    .max(20)
    .optional()
    .or(z.literal("")),
  evidenceUrl: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || isGoogleDriveUrl(value),
      "Bukti wajib menggunakan link Google Drive.",
    ),
});

export const entryUpdateSchema = entryInputSchema.omit({ rowCode: true });

export function findItemRow(rowCode: string) {
  const row = DUPAK_TEMPLATE_ROWS.find((item) => item.code === rowCode);
  return row && row.type === "ITEM" ? row : null;
}

function toNullable(value?: string) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

export function normalizeEntryInput<
  T extends {
    title: string;
    subCategory?: string;
    description?: string;
    activityYear?: string;
    credit?: string;
    evidenceUrl?: string;
  },
>(data: T) {
  return {
    title: data.title.trim(),
    subCategory: toNullable(data.subCategory),
    description: toNullable(data.description),
    activityYear: toNullable(data.activityYear),
    credit: toNullable(data.credit?.replace(",", ".")),
    evidenceUrl: toNullable(data.evidenceUrl),
  };
}

// Menghitung ulang creditData[rowCode].newProposer dari seluruh rincian baris.
// Jika rincian habis, nilai dikosongkan agar dosen bisa isi manual kembali.
export async function recomputeRowProposer(
  tx: Prisma.TransactionClient,
  submissionId: string,
  rowCode: string,
) {
  const [entries, submission] = await Promise.all([
    tx.dupakItemEntry.findMany({
      where: { submissionId, rowCode },
      select: { credit: true },
    }),
    tx.dupakSubmission.findUnique({
      where: { id: submissionId },
      select: { creditData: true },
    }),
  ]);

  const creditData: DupakCreditData =
    submission?.creditData &&
    typeof submission.creditData === "object" &&
    !Array.isArray(submission.creditData)
      ? ({ ...(submission.creditData as DupakCreditData) } as DupakCreditData)
      : {};

  const current = creditData[rowCode] || {};

  creditData[rowCode] = {
    ...current,
    newProposer: entries.length > 0 ? String(sumEntryCredits(entries)) : "",
  };

  await tx.dupakSubmission.update({
    where: { id: submissionId },
    data: { creditData: creditData as Prisma.InputJsonValue },
  });
}

// Saat dosen mengubah/menghapus rincian yang sebelumnya ditandai
// Perlu Revisi / Tidak Sesuai, snapshot penilaian lama ke histori
// lalu tandai DIREVISI_DOSEN agar Tim PAK menilai ulang.
export async function flagLecturerRevision(
  tx: Prisma.TransactionClient,
  options: {
    submissionId: string;
    rowCode: string;
    entryKey: string;
    actorEmail: string;
    reason: string;
    deleteReviews?: boolean;
  },
) {
  const reviews = await tx.dupakItemReview.findMany({
    where: {
      submissionId: options.submissionId,
      rowCode: options.rowCode,
      entryKey: options.entryKey,
    },
  });

  if (reviews.length === 0) return;

  const flagged = reviews.filter(
    (review) =>
      review.status === "PERLU_REVISI" || review.status === "TIDAK_SESUAI",
  );

  // Saat menghapus, seluruh penilaian hidup ikut diarsipkan; saat mengubah,
  // cukup penilaian yang ditandai bermasalah.
  const toArchive = options.deleteReviews ? reviews : flagged;

  if (toArchive.length > 0) {
    await tx.dupakReviewHistory.createMany({
      data: toArchive.map((review) => ({
        submissionId: options.submissionId,
        assignmentId: review.assignmentId,
        rowCode: review.rowCode,
        entryKey: review.entryKey,
        kind: "ASSESSMENT",
        snapshot: {
          assessedCredit: review.assessedCredit,
          status: review.status,
          comment: review.comment,
          assessorEmail: review.assessorEmail,
          updatedAt: review.updatedAt.toISOString(),
        },
        reason: options.reason,
        actorEmail: options.actorEmail,
        actorRole: "DOSEN",
      })),
    });
  }

  if (options.deleteReviews) {
    await tx.dupakItemReview.deleteMany({
      where: {
        submissionId: options.submissionId,
        rowCode: options.rowCode,
        entryKey: options.entryKey,
      },
    });
    return;
  }

  if (flagged.length > 0) {
    await tx.dupakItemReview.updateMany({
      where: {
        id: { in: flagged.map((review) => review.id) },
      },
      data: {
        status: "DIREVISI_DOSEN",
      },
    });
  }
}
