/** @format */

import type { DupakStatus } from "@/lib/app-types";

export const DUPAK_STATUS_LABELS: Record<DupakStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Menunggu Verifikasi Admin",
  REVISION: "Perlu Revisi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  PERLU_PERBAIKAN_ADMIN: "Perlu Perbaikan (Admin)",
  DITOLAK_ADMIN: "Ditolak Admin",
  LOLOS_VERIFIKASI_ADMIN: "Lolos Verifikasi / Siap Ditugaskan",
  DITUGASKAN_KE_TIM_PAK: "Ditugaskan ke Tim PAK",
  SEDANG_DINILAI: "Sedang Dinilai",
  PERLU_REVISI_TIM_PAK: "Perlu Revisi (Tim PAK)",
  DIKIRIM_ULANG_SETELAH_REVISI: "Dikirim Ulang Setelah Revisi",
  DITERIMA_TIM_PAK: "Diterima Tim PAK",
  PENILAIAN_DISAHKAN: "Penilaian Disahkan",
  BERITA_ACARA_DRAFT: "Berita Acara Draft",
  BERITA_ACARA_DISAHKAN: "Berita Acara Disahkan",
  PEMERIKSAAN_INTEGRITAS: "Pemeriksaan Komite Integritas",
  PEMERIKSAAN_SENAT: "Pemeriksaan Tim Senat",
  SELESAI: "Selesai",
};

export const DUPAK_STATUS_BADGES: Record<DupakStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  SUBMITTED: "border-sky-200 bg-sky-50 text-sky-700",
  REVISION: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  PERLU_PERBAIKAN_ADMIN: "border-amber-200 bg-amber-50 text-amber-700",
  DITOLAK_ADMIN: "border-red-200 bg-red-50 text-red-700",
  LOLOS_VERIFIKASI_ADMIN: "border-teal-200 bg-teal-50 text-teal-700",
  DITUGASKAN_KE_TIM_PAK: "border-indigo-200 bg-indigo-50 text-indigo-700",
  SEDANG_DINILAI: "border-sky-200 bg-sky-50 text-sky-700",
  PERLU_REVISI_TIM_PAK: "border-amber-200 bg-amber-50 text-amber-700",
  DIKIRIM_ULANG_SETELAH_REVISI: "border-sky-200 bg-sky-50 text-sky-700",
  DITERIMA_TIM_PAK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENILAIAN_DISAHKAN: "border-emerald-300 bg-emerald-100 text-emerald-800",
  BERITA_ACARA_DRAFT: "border-violet-200 bg-violet-50 text-violet-700",
  BERITA_ACARA_DISAHKAN: "border-violet-300 bg-violet-100 text-violet-800",
  PEMERIKSAAN_INTEGRITAS: "border-cyan-200 bg-cyan-50 text-cyan-700",
  PEMERIKSAAN_SENAT: "border-blue-200 bg-blue-50 text-blue-700",
  SELESAI: "border-slate-300 bg-slate-100 text-slate-800",
};

// Status legacy dipetakan agar data lama tetap valid dalam alur baru.
const LEGACY_EQUIVALENT: Partial<Record<DupakStatus, DupakStatus>> = {
  REVISION: "PERLU_REVISI_TIM_PAK",
  APPROVED: "DITERIMA_TIM_PAK",
  REJECTED: "DITOLAK_ADMIN",
};

export function normalizeStatus(status: DupakStatus): DupakStatus {
  return LEGACY_EQUIVALENT[status] || status;
}

const TRANSITIONS: Record<DupakStatus, DupakStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: [
    "LOLOS_VERIFIKASI_ADMIN",
    "PERLU_PERBAIKAN_ADMIN",
    "DITOLAK_ADMIN",
  ],
  PERLU_PERBAIKAN_ADMIN: ["SUBMITTED"],
  DITOLAK_ADMIN: [
    "SUBMITTED",
    "LOLOS_VERIFIKASI_ADMIN",
    "PERLU_PERBAIKAN_ADMIN",
  ],
  LOLOS_VERIFIKASI_ADMIN: [
    "DITUGASKAN_KE_TIM_PAK",
    "PERLU_PERBAIKAN_ADMIN",
    "DITOLAK_ADMIN",
  ],
  DITUGASKAN_KE_TIM_PAK: [
    "SEDANG_DINILAI",
    "PERLU_REVISI_TIM_PAK",
    "DITERIMA_TIM_PAK",
    "LOLOS_VERIFIKASI_ADMIN",
  ],
  SEDANG_DINILAI: [
    "PERLU_REVISI_TIM_PAK",
    "DITERIMA_TIM_PAK",
    "LOLOS_VERIFIKASI_ADMIN",
  ],
  PERLU_REVISI_TIM_PAK: ["DIKIRIM_ULANG_SETELAH_REVISI"],
  DIKIRIM_ULANG_SETELAH_REVISI: [
    "SEDANG_DINILAI",
    "PERLU_REVISI_TIM_PAK",
    "DITERIMA_TIM_PAK",
  ],
  DITERIMA_TIM_PAK: ["PENILAIAN_DISAHKAN", "SEDANG_DINILAI"],
  PENILAIAN_DISAHKAN: ["BERITA_ACARA_DRAFT", "SEDANG_DINILAI"],
  BERITA_ACARA_DRAFT: ["BERITA_ACARA_DISAHKAN", "PENILAIAN_DISAHKAN"],
  BERITA_ACARA_DISAHKAN: ["PEMERIKSAAN_INTEGRITAS", "BERITA_ACARA_DRAFT"],
  PEMERIKSAAN_INTEGRITAS: ["PEMERIKSAAN_SENAT", "PERLU_REVISI_TIM_PAK"],
  PEMERIKSAAN_SENAT: ["SELESAI", "PEMERIKSAAN_INTEGRITAS"],
  SELESAI: [],
  // Legacy: diarahkan mengikuti padanannya.
  REVISION: ["DIKIRIM_ULANG_SETELAH_REVISI"],
  APPROVED: ["PENILAIAN_DISAHKAN", "SEDANG_DINILAI"],
  REJECTED: ["SUBMITTED", "LOLOS_VERIFIKASI_ADMIN", "PERLU_PERBAIKAN_ADMIN"],
};

export function canTransition(from: DupakStatus, to: DupakStatus) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function assertTransition(from: DupakStatus, to: DupakStatus) {
  if (!canTransition(from, to)) {
    return {
      ok: false as const,
      message: `Perpindahan status dari "${DUPAK_STATUS_LABELS[from]}" ke "${DUPAK_STATUS_LABELS[to]}" tidak diizinkan.`,
    };
  }

  return { ok: true as const, message: null };
}

// Status di mana dosen masih boleh mengubah isian DUPAK.
export const LECTURER_EDITABLE_STATUSES: DupakStatus[] = [
  "DRAFT",
  "PERLU_PERBAIKAN_ADMIN",
  "PERLU_REVISI_TIM_PAK",
  "REVISION",
  "DITOLAK_ADMIN",
];

export function isLecturerEditable(status: DupakStatus) {
  return LECTURER_EDITABLE_STATUSES.includes(status);
}

// Urutan tahapan utama untuk timeline UI.
export const PIPELINE_STEPS: { status: DupakStatus; label: string }[] = [
  { status: "DRAFT", label: "Draft Dosen" },
  { status: "SUBMITTED", label: "Menunggu Verifikasi Admin" },
  { status: "LOLOS_VERIFIKASI_ADMIN", label: "Lolos Verifikasi" },
  { status: "DITUGASKAN_KE_TIM_PAK", label: "Ditugaskan ke Tim PAK" },
  { status: "SEDANG_DINILAI", label: "Sedang Dinilai" },
  { status: "DITERIMA_TIM_PAK", label: "Diterima Tim PAK" },
  { status: "PENILAIAN_DISAHKAN", label: "Penilaian Disahkan" },
  { status: "BERITA_ACARA_DISAHKAN", label: "Berita Acara Disahkan" },
  { status: "PEMERIKSAAN_INTEGRITAS", label: "Pemeriksaan Integritas" },
  { status: "PEMERIKSAAN_SENAT", label: "Pemeriksaan Senat" },
  { status: "SELESAI", label: "Selesai" },
];

export function getPipelineIndex(status: DupakStatus) {
  const normalized = normalizeStatus(status);

  const directIndex = PIPELINE_STEPS.findIndex(
    (step) => step.status === normalized,
  );

  if (directIndex >= 0) return directIndex;

  // Status antara dipetakan ke tahapan induknya.
  if (
    normalized === "PERLU_PERBAIKAN_ADMIN" ||
    normalized === "DITOLAK_ADMIN"
  ) {
    return 1;
  }

  if (
    normalized === "PERLU_REVISI_TIM_PAK" ||
    normalized === "DIKIRIM_ULANG_SETELAH_REVISI"
  ) {
    return 4;
  }

  if (normalized === "BERITA_ACARA_DRAFT") return 6;

  return 0;
}

export function getStatusLabel(status: string) {
  return DUPAK_STATUS_LABELS[status as DupakStatus] || status;
}

export function getStatusBadgeClass(status: string) {
  return (
    DUPAK_STATUS_BADGES[status as DupakStatus] ||
    "border-slate-200 bg-slate-50 text-slate-600"
  );
}
