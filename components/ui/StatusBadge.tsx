/** @format */

import type { DocumentStatus } from "@prisma/client";

const map: Record<DocumentStatus, string> = {
  NOT_UPLOADED: "bg-slate-100 text-slate-600 border-slate-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  VALID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REVISION: "bg-sky-50 text-sky-700 border-sky-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const label: Record<DocumentStatus, string> = {
  NOT_UPLOADED: "Belum Upload",
  PENDING: "Menunggu",
  VALID: "Valid",
  REVISION: "Revisi",
  REJECTED: "Ditolak",
};

export default function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}
