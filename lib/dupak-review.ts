/** @format */

// Logika murni penilaian per item/sub-item DUPAK oleh Tim PAK.
// Dipakai bersama oleh API route, halaman server, dan komponen client.

import {
  DUPAK_TEMPLATE_ROWS,
  getNumberValue,
  getProposerTotal,
  type DupakCreditData,
  type DupakItemEntryData,
} from "@/lib/dupak-template";

export type DupakReviewStatusValue =
  | "SESUAI"
  | "PERLU_REVISI"
  | "TIDAK_SESUAI"
  | "DIREVISI_DOSEN";

export type DupakItemReviewData = {
  rowCode: string;
  entryKey: string;
  assessedCredit?: string | null;
  status?: DupakReviewStatusValue | null;
  comment?: string | null;
};

// Kunci unik unit penilaian: `${rowCode}::${entryKey}` — entryKey "" = level baris.
export function reviewUnitKey(rowCode: string, entryKey: string) {
  return `${rowCode}::${entryKey}`;
}

export const REVIEW_STATUS_META: Record<
  DupakReviewStatusValue,
  { label: string; icon: string; badgeClass: string }
> = {
  SESUAI: {
    label: "Sesuai",
    icon: "✓",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  PERLU_REVISI: {
    label: "Perlu Revisi",
    icon: "!",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  TIDAK_SESUAI: {
    label: "Tidak Sesuai",
    icon: "×",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  DIREVISI_DOSEN: {
    label: "Direvisi Dosen",
    icon: "↺",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

export const REVIEW_STATUS_UNRATED = {
  label: "Belum Dinilai",
  icon: "○",
  badgeClass: "border-slate-200 bg-slate-50 text-slate-500",
};

export function getReviewStatusMeta(status?: DupakReviewStatusValue | null) {
  if (!status) return REVIEW_STATUS_UNRATED;
  return REVIEW_STATUS_META[status] || REVIEW_STATUS_UNRATED;
}

export function isGoogleDriveUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname.includes("drive.google.com") ||
      url.hostname.includes("docs.google.com")
    );
  } catch {
    return false;
  }
}

export type ReviewUnit = {
  rowCode: string;
  entryKey: string;
  entry?: DupakItemEntryData;
  // true = diajukan dosen (rincian/AK/bukti) sehingga wajib dinilai;
  // false = baris kosong, tetap tampil namun penilaian opsional.
  required: boolean;
};

type RowEvidenceLike = {
  rowCode: string;
  evidenceUrl?: string | null;
};

// Seluruh baris ITEM ditampilkan sebagai unit penilaian (pola formulir DUPAK utuh):
// - Baris dengan rincian → satu unit per rincian (wajib dinilai).
// - Baris tanpa rincian → satu unit level baris; wajib dinilai hanya jika
//   dosen mengajukan AK atau melampirkan bukti, selain itu opsional.
export function buildReviewUnits(input: {
  creditData?: DupakCreditData | null;
  entries: DupakItemEntryData[];
  evidences?: RowEvidenceLike[];
}): ReviewUnit[] {
  const creditData = input.creditData || {};
  const entriesByRow = new Map<string, DupakItemEntryData[]>();

  for (const entry of input.entries) {
    const list = entriesByRow.get(entry.rowCode) || [];
    list.push(entry);
    entriesByRow.set(entry.rowCode, list);
  }

  const evidenceRows = new Set(
    (input.evidences || [])
      .filter((evidence) => Boolean(evidence.evidenceUrl))
      .map((evidence) => evidence.rowCode),
  );

  const units: ReviewUnit[] = [];

  for (const row of DUPAK_TEMPLATE_ROWS) {
    if (row.type !== "ITEM") continue;

    const rowEntries = (entriesByRow.get(row.code) || [])
      .slice()
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    if (rowEntries.length > 0) {
      for (const entry of rowEntries) {
        units.push({
          rowCode: row.code,
          entryKey: entry.id,
          entry,
          required: true,
        });
      }
      continue;
    }

    const proposed = getProposerTotal(creditData[row.code]);

    units.push({
      rowCode: row.code,
      entryKey: "",
      required: proposed > 0 || evidenceRows.has(row.code),
    });
  }

  return units;
}

export type ReviewProgress = {
  total: number;
  reviewed: number;
  sesuai: number;
  perluRevisi: number;
  tidakSesuai: number;
  direvisiDosen: number;
};

// Progres dihitung terhadap unit wajib; unit opsional yang ikut dinilai
// tetap menambah hitungan status namun tidak masuk penyebut.
export function computeReviewProgress(
  units: ReviewUnit[],
  reviews: DupakItemReviewData[],
): ReviewProgress {
  const reviewMap = new Map(
    reviews.map((review) => [
      reviewUnitKey(review.rowCode, review.entryKey),
      review,
    ]),
  );

  const requiredUnits = units.filter((unit) => unit.required);

  const progress: ReviewProgress = {
    total: requiredUnits.length,
    reviewed: 0,
    sesuai: 0,
    perluRevisi: 0,
    tidakSesuai: 0,
    direvisiDosen: 0,
  };

  for (const unit of units) {
    const review = reviewMap.get(reviewUnitKey(unit.rowCode, unit.entryKey));
    const status = review?.status;

    if (!status) continue;

    if (unit.required) progress.reviewed += 1;

    if (status === "SESUAI") progress.sesuai += 1;
    else if (status === "PERLU_REVISI") progress.perluRevisi += 1;
    else if (status === "TIDAK_SESUAI") progress.tidakSesuai += 1;
    else if (status === "DIREVISI_DOSEN") progress.direvisiDosen += 1;
  }

  return progress;
}

export type ReviewValidationIssue = {
  rowCode: string;
  entryKey: string;
  message: string;
};

export type ReviewValidation = {
  okForAccept: boolean;
  okForRevision: boolean;
  issues: ReviewValidationIssue[];
  outstanding: ReviewValidationIssue[];
  progress: ReviewProgress;
};

// Aturan finalisasi:
// - Unit wajib (diajukan dosen) harus punya status; unit opsional boleh kosong.
// - SESUAI wajib disertai AK dinilai (boleh 0 eksplisit, tidak boleh kosong).
// - PERLU_REVISI dan TIDAK_SESUAI wajib disertai komentar untuk dosen.
// - DITERIMA terblokir selama masih ada PERLU_REVISI / TIDAK_SESUAI / DIREVISI_DOSEN
//   pada unit mana pun (termasuk opsional yang ikut dinilai).
export function computeReviewValidation(
  units: ReviewUnit[],
  reviews: DupakItemReviewData[],
): ReviewValidation {
  const reviewMap = new Map(
    reviews.map((review) => [
      reviewUnitKey(review.rowCode, review.entryKey),
      review,
    ]),
  );

  const issues: ReviewValidationIssue[] = [];
  const outstanding: ReviewValidationIssue[] = [];

  for (const unit of units) {
    const review = reviewMap.get(reviewUnitKey(unit.rowCode, unit.entryKey));
    const status = review?.status;

    if (!status) {
      if (unit.required) {
        issues.push({
          rowCode: unit.rowCode,
          entryKey: unit.entryKey,
          message: "Belum dinilai.",
        });
      }
      continue;
    }

    if (status === "SESUAI") {
      const credit = String(review?.assessedCredit ?? "").trim();

      if (credit.length === 0) {
        issues.push({
          rowCode: unit.rowCode,
          entryKey: unit.entryKey,
          message: "Status Sesuai wajib disertai angka kredit dinilai.",
        });
      }
      continue;
    }

    if (status === "PERLU_REVISI" || status === "TIDAK_SESUAI") {
      const comment = String(review?.comment ?? "").trim();

      if (comment.length === 0) {
        issues.push({
          rowCode: unit.rowCode,
          entryKey: unit.entryKey,
          message: "Komentar untuk dosen wajib diisi.",
        });
      }

      outstanding.push({
        rowCode: unit.rowCode,
        entryKey: unit.entryKey,
        message:
          status === "PERLU_REVISI"
            ? "Masih berstatus Perlu Revisi."
            : "Masih berstatus Tidak Sesuai.",
      });
      continue;
    }

    if (status === "DIREVISI_DOSEN") {
      outstanding.push({
        rowCode: unit.rowCode,
        entryKey: unit.entryKey,
        message: "Sudah direvisi dosen, perlu dinilai ulang.",
      });
    }
  }

  const progress = computeReviewProgress(units, reviews);

  const flaggedCount = reviews.filter(
    (review) =>
      review.status === "PERLU_REVISI" || review.status === "TIDAK_SESUAI",
  ).length;

  const hasFlaggedCommentIssue = issues.some(
    (issue) => issue.message === "Komentar untuk dosen wajib diisi.",
  );

  return {
    okForAccept: issues.length === 0 && outstanding.length === 0,
    okForRevision: flaggedCount > 0 && !hasFlaggedCommentIssue,
    issues,
    outstanding,
    progress,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// Menjumlahkan AK dinilai per baris untuk ditulis ke creditData[row].newAssessor,
// sehingga subtotal, PDF, Excel, dan pengesahan tetap konsisten dengan mesin lama.
export function aggregateAssessedCredits(
  units: ReviewUnit[],
  reviews: DupakItemReviewData[],
): Record<string, string> {
  const reviewMap = new Map(
    reviews.map((review) => [
      reviewUnitKey(review.rowCode, review.entryKey),
      review,
    ]),
  );

  const totals = new Map<string, number>();

  for (const unit of units) {
    const review = reviewMap.get(reviewUnitKey(unit.rowCode, unit.entryKey));

    if (!review) continue;

    const credit = String(review.assessedCredit ?? "").trim();

    if (credit.length === 0) continue;

    const current = totals.get(unit.rowCode) || 0;
    totals.set(unit.rowCode, current + getNumberValue(credit));
  }

  const result: Record<string, string> = {};

  for (const [rowCode, total] of totals) {
    result[rowCode] = String(round2(total));
  }

  return result;
}
