/** @format */

import type { DupakStatus } from "@/lib/app-types";

export const KOMITE_VISIBLE_STATUSES: DupakStatus[] = [
  "LOLOS_VERIFIKASI_ADMIN",
  "DITUGASKAN_KE_TIM_PAK",
  "SEDANG_DINILAI",
  "PERLU_REVISI_TIM_PAK",
  "DIKIRIM_ULANG_SETELAH_REVISI",
  "DITERIMA_TIM_PAK",
  "PENILAIAN_DISAHKAN",
  "BERITA_ACARA_DRAFT",
  "BERITA_ACARA_DISAHKAN",
  "PEMERIKSAAN_INTEGRITAS",
  "PEMERIKSAAN_SENAT",
  "SELESAI",
];

export const SENAT_VISIBLE_STATUSES: DupakStatus[] = [
  "PEMERIKSAAN_SENAT",
  "SELESAI",
];

export function canKomiteSee(status: string) {
  return KOMITE_VISIBLE_STATUSES.includes(status as DupakStatus);
}

export function canSenateSee(status: string) {
  return SENAT_VISIBLE_STATUSES.includes(status as DupakStatus);
}

export function evaluateDupakAccess({
  role,
  userId,
  lecturerUserId,
  status,
  hasActivePakAssignment = false,
}: {
  role: string;
  userId: string;
  lecturerUserId: string;
  status: string;
  hasActivePakAssignment?: boolean;
}) {
  if (role === "ADMIN") return true;
  if (role === "DOSEN") return lecturerUserId === userId;
  if (role === "TIM_PAK") return hasActivePakAssignment;
  if (role === "KOMITE_INTEGRITAS_AKADEMIK") return canKomiteSee(status);
  if (role === "TIM_SENAT") return canSenateSee(status);
  return false;
}
