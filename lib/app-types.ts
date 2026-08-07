/** @format */

export type Role =
  | "DOSEN"
  | "ADMIN"
  | "OPERATOR"
  | "TIM_PAK"
  | "KOMITE_INTEGRITAS_AKADEMIK"
  | "TIM_SENAT";

export type AccountStatus = "ACTIVE" | "PENDING" | "SUSPENDED";

export type DocumentStatus =
  | "NOT_UPLOADED"
  | "PENDING"
  | "VALID"
  | "REVISION"
  | "REJECTED";

export type NotificationType =
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_VERIFIED"
  | "DOCUMENT_REVISION"
  | "DOCUMENT_REJECTED"
  | "SYSTEM";

export type DupakStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVISION"
  | "APPROVED"
  | "REJECTED"
  | "PERLU_PERBAIKAN_ADMIN"
  | "DITOLAK_ADMIN"
  | "LOLOS_VERIFIKASI_ADMIN"
  | "DITUGASKAN_KE_TIM_PAK"
  | "SEDANG_DINILAI"
  | "PERLU_REVISI_TIM_PAK"
  | "DIKIRIM_ULANG_SETELAH_REVISI"
  | "DITERIMA_TIM_PAK"
  | "PENILAIAN_DISAHKAN"
  | "BERITA_ACARA_DRAFT"
  | "BERITA_ACARA_DISAHKAN"
  | "PEMERIKSAAN_INTEGRITAS"
  | "PEMERIKSAAN_SENAT"
  | "SELESAI";

export type VerificationDecision =
  | "LOLOS_VERIFIKASI"
  | "PERLU_PERBAIKAN_ADMIN"
  | "DITOLAK_ADMIN";

export type AssignmentStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "REASSIGNED";

export type AssessmentDecision = "PERLU_REVISI" | "DITERIMA";

export type MinuteStatus = "DRAFT" | "FINAL";

export type IntegrityResult =
  | "MEMENUHI"
  | "PERLU_KLARIFIKASI"
  | "PERLU_PERBAIKAN"
  | "TIDAK_MEMENUHI";

export type SenateDecision = "DISETUJUI" | "DIKEMBALIKAN";
