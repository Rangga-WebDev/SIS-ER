/** @format */

import { GitBranch, Link2 } from "lucide-react";
import FilePreviewModal from "@/components/documents/FilePreviewModal";

type VersionItem = {
  id: string;
  versionNumber: number;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  storagePath: string | null;
  externalUrl: string | null;
  academicYear: number | null;
  skpPredicate: string | null;
  letterNumber: string | null;
  letterDate: Date | string | null;
  uploaderEmail: string | null;
  createdAt: Date | string;
};

type Props = {
  versions: VersionItem[];
  currentVersionNumber?: number | null;
};

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function DocumentVersionHistory({
  versions,
  currentVersionNumber,
}: Props) {
  if (!versions || versions.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">
        Belum ada riwayat versi dokumen.
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <GitBranch size={18} />
          </div>

          <div>
            <p className="font-black text-slate-950">Riwayat Versi</p>
            <p className="text-xs font-bold text-slate-500">
              Semua upload ulang tersimpan sebagai versi baru.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
          {versions.length} versi
        </span>
      </div>

      <div className="grid gap-3">
        {versions.map((version) => {
          const isCurrent = version.versionNumber === currentVersionNumber;

          return (
            <article
              key={version.id}
              className={`rounded-2xl border p-4 ${
                isCurrent
                  ? "border-sky-200 bg-sky-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">
                      Versi {version.versionNumber}
                    </p>

                    {isCurrent && (
                      <span className="rounded-full bg-sky-700 px-3 py-1 text-xs font-black text-white">
                        Versi Terbaru
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {version.fileName ||
                      version.externalUrl ||
                      "Metadata tersimpan"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Meta
                      label="Waktu"
                      value={formatDateTime(version.createdAt)}
                    />
                    <Meta
                      label="Ukuran"
                      value={formatFileSize(version.fileSize)}
                    />
                    {version.academicYear && (
                      <Meta
                        label="Tahun"
                        value={String(version.academicYear)}
                      />
                    )}
                    {version.skpPredicate && (
                      <Meta label="Predikat" value={version.skpPredicate} />
                    )}
                    {version.letterNumber && (
                      <Meta label="No Surat" value={version.letterNumber} />
                    )}
                    {version.uploaderEmail && (
                      <Meta label="Uploader" value={version.uploaderEmail} />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {version.storagePath && (
                    <>
                      <FilePreviewModal
                        title={`Versi ${version.versionNumber}`}
                        fileName={version.fileName}
                        mimeType={version.mimeType}
                        previewUrl={`/api/files/versions/${version.id}`}
                        downloadUrl={`/api/files/versions/${version.id}?download=1`}
                      />
                    </>
                  )}

                  {version.externalUrl && (
                    <a
                      href={version.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      Buka URL
                      <Link2 size={15} />
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
      <span className="text-slate-400">{label}:</span> {value}
    </span>
  );
}
