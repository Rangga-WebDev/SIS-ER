/** @format */

import {
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  UploadCloud,
  UserRoundPlus,
} from "lucide-react";
import type { ReactNode } from "react";

type ActivityActor = {
  email: string;
  role: string;
} | null;

type ActivityLogItem = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date | string;
  actor?: ActivityActor;
};

type ActivityTimelineProps = {
  title?: string;
  subtitle?: string;
  logs: ActivityLogItem[];
  variant?: "DOSEN" | "ADMIN";
  emptyText?: string;
};

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}

function stringify(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getActivityMeta(action: string): {
  icon: ReactNode;
  title: string;
  tone: string;
  border: string;
} {
  const normalized = action.toUpperCase();

  if (normalized === "DOCUMENT_SAVE" || normalized === "DOCUMENT_UPLOAD") {
    return {
      icon: <UploadCloud size={18} />,
      title: "Dokumen Disimpan",
      tone: "bg-sky-100 text-sky-700",
      border: "border-sky-200",
    };
  }

  if (normalized === "DOCUMENT_VERIFY") {
    return {
      icon: <ShieldCheck size={18} />,
      title: "Dokumen Diverifikasi",
      tone: "bg-emerald-100 text-emerald-700",
      border: "border-emerald-200",
    };
  }

  if (normalized === "USER_REGISTER") {
    return {
      icon: <UserRoundPlus size={18} />,
      title: "Dosen Baru Terdaftar",
      tone: "bg-violet-100 text-violet-700",
      border: "border-violet-200",
    };
  }

  return {
    icon: <FileText size={18} />,
    title: action.replaceAll("_", " "),
    tone: "bg-slate-100 text-slate-700",
    border: "border-slate-200",
  };
}

function getActivityDescription(
  log: ActivityLogItem,
  variant: "DOSEN" | "ADMIN",
) {
  const meta = getMetadata(log.metadata);

  const lecturerName = stringify(meta.lecturerName);
  const requirementName = stringify(meta.requirementName);
  const requirementCode = stringify(meta.requirementCode);
  const categoryName = stringify(meta.categoryName);
  const categoryCode = stringify(meta.categoryCode);
  const status = stringify(meta.status);
  const academicYear = stringify(meta.academicYear);

  if (log.action === "DOCUMENT_VERIFY") {
    if (variant === "ADMIN") {
      return `${lecturerName !== "-" ? lecturerName : "Dosen"} — ${requirementName !== "-" ? requirementName : requirementCode} diberi status ${status}.`;
    }

    return `${requirementName !== "-" ? requirementName : requirementCode} telah diperiksa admin dengan status ${status}.`;
  }

  if (log.action === "DOCUMENT_SAVE" || log.action === "DOCUMENT_UPLOAD") {
    const yearInfo = academicYear !== "-" ? ` untuk tahun ${academicYear}` : "";
    return `${requirementName !== "-" ? requirementName : requirementCode} pada kategori ${categoryName !== "-" ? categoryName : categoryCode}${yearInfo} berhasil disimpan.`;
  }

  if (log.action === "USER_REGISTER") {
    return `${lecturerName !== "-" ? lecturerName : "Dosen"} membuat akun baru.`;
  }

  return "Aktivitas sistem tercatat.";
}

export default function ActivityTimeline({
  title = "Activity Timeline",
  subtitle = "Riwayat aktivitas terbaru pada sistem.",
  logs,
  variant = "DOSEN",
  emptyText = "Belum ada aktivitas yang tercatat.",
}: ActivityTimelineProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
            Timeline
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>

          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
          <Clock3 size={17} />
          Terbaru
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <FileText className="mx-auto mb-3 text-slate-400" size={36} />

          <p className="font-black text-slate-700">{emptyText}</p>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Aktivitas akan muncul setelah dosen mengupload dokumen atau admin
            melakukan verifikasi.
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute bottom-4 left-[22px] top-4 w-px bg-slate-200" />

          <div className="space-y-4">
            {logs.map((log) => {
              const meta = getActivityMeta(log.action);
              const metadata = getMetadata(log.metadata);

              return (
                <article
                  key={log.id}
                  className={`relative rounded-3xl border bg-slate-50 p-4 ${meta.border}`}
                >
                  <div className="flex gap-4">
                    <div
                      className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}
                    >
                      {meta.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-black text-slate-950">
                            {meta.title}
                          </h3>

                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                            {getActivityDescription(log, variant)}
                          </p>
                        </div>

                        <p className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {metadata.categoryName || metadata.categoryCode ? (
                          <MetaChip
                            label="Kategori"
                            value={stringify(
                              metadata.categoryName || metadata.categoryCode,
                            )}
                          />
                        ) : null}

                        {metadata.requirementName ||
                        metadata.requirementCode ? (
                          <MetaChip
                            label="Dokumen"
                            value={stringify(
                              metadata.requirementName ||
                                metadata.requirementCode,
                            )}
                          />
                        ) : null}

                        {metadata.status ? (
                          <MetaChip
                            label="Status"
                            value={stringify(metadata.status)}
                          />
                        ) : null}

                        {metadata.academicYear ? (
                          <MetaChip
                            label="Tahun"
                            value={stringify(metadata.academicYear)}
                          />
                        ) : null}

                        {variant === "ADMIN" && log.actor?.email ? (
                          <MetaChip label="Aktor" value={log.actor.email} />
                        ) : null}
                      </div>

                      {metadata.adminNote ? (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800">
                          Catatan: {stringify(metadata.adminNote)}
                        </div>
                      ) : null}

                      {metadata.hasFile || metadata.hasUrl ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                          {metadata.hasFile ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                              <CheckCircle2 size={13} />
                              File
                            </span>
                          ) : null}

                          {metadata.hasUrl ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700">
                              <CheckCircle2 size={13} />
                              URL
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
      <span className="text-slate-400">{label}:</span> {value}
    </span>
  );
}
