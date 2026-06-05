/** @format */

import { ExternalLink, FileClock, FileText, Link2 } from "lucide-react";

type DocumentVersionItem = {
  id: string;
  versionNumber: number;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  storagePath: string | null;
  externalUrl: string | null;
  academicYear: number | null;
  uploaderEmail: string | null;
  createdAt: Date;
};

type Props = {
  versions: DocumentVersionItem[];
  currentVersionNumber: number;
};

function formatDateTime(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getHostName(url?: string | null) {
  if (!url) return "-";

  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Link eksternal";
  }
}

function getVersionLabel(version: DocumentVersionItem) {
  if (version.externalUrl) {
    return `Link Google Drive / ${getHostName(version.externalUrl)}`;
  }

  if (version.fileName) {
    return version.fileName;
  }

  return "Metadata tersimpan";
}

export default function DocumentVersionHistory({
  versions,
  currentVersionNumber,
}: Props) {
  if (!versions || versions.length === 0) {
    return (
      <section className="mt-5 w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <FileClock size={20} />
          </div>

          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">Riwayat Versi</p>
            <p className="truncate text-sm font-semibold text-slate-500">
              Belum ada riwayat upload ulang.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <FileClock size={20} />
          </div>

          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">Riwayat Versi</p>
            <p className="truncate text-xs font-semibold text-slate-500">
              Semua upload ulang tersimpan sebagai versi baru.
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600">
          {versions.length} versi
        </span>
      </div>

      <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
        {versions.map((version) => {
          const latest = version.versionNumber === currentVersionNumber;
          const hasExternalUrl = Boolean(version.externalUrl);
          const label = getVersionLabel(version);

          return (
            <article
              key={version.id}
              className={`w-full min-w-0 overflow-hidden rounded-2xl border p-4 ${
                latest
                  ? "border-sky-200 bg-sky-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="shrink-0 font-black text-slate-950">
                        Versi {version.versionNumber}
                      </p>

                      {latest ? (
                        <span className="shrink-0 rounded-full bg-sky-700 px-3 py-1 text-[10px] font-black text-white">
                          Versi Terbaru
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex min-w-0 items-center gap-2">
                      {hasExternalUrl ? (
                        <Link2 size={15} className="shrink-0 text-sky-700" />
                      ) : (
                        <FileText
                          size={15}
                          className="shrink-0 text-slate-400"
                        />
                      )}

                      <p
                        title={
                          hasExternalUrl ? version.externalUrl || "" : label
                        }
                        className={`min-w-0 truncate text-sm font-black ${
                          hasExternalUrl ? "text-sky-700" : "text-slate-700"
                        }`}
                      >
                        {label}
                      </p>
                    </div>
                  </div>

                  {hasExternalUrl && version.externalUrl ? (
                    <a
                      href={version.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      Buka
                      <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-wrap gap-2">
                  <MetaChip
                    label="Waktu"
                    value={formatDateTime(version.createdAt)}
                  />

                  <MetaChip
                    label="Ukuran"
                    value={formatFileSize(version.fileSize)}
                  />

                  {version.academicYear ? (
                    <MetaChip
                      label="Tahun"
                      value={String(version.academicYear)}
                    />
                  ) : null}

                  {version.uploaderEmail ? (
                    <MetaChip
                      label="Uploader"
                      value={version.uploaderEmail}
                      wide
                    />
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MetaChip({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-500 ${
        wide ? "max-w-full" : "max-w-[180px]"
      }`}
    >
      <span className="shrink-0 text-slate-400">{label}:</span>
      <span className="min-w-0 truncate">{value}</span>
    </span>
  );
}
