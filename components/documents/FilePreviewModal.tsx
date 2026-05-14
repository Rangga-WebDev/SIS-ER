/** @format */

"use client";

import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  X,
} from "lucide-react";

type FilePreviewModalProps = {
  title?: string;
  fileName?: string | null;
  mimeType?: string | null;
  previewUrl: string;
  downloadUrl: string;
  buttonLabel?: string;
};

export default function FilePreviewModal({
  title = "Preview Dokumen",
  fileName,
  mimeType,
  previewUrl,
  downloadUrl,
  buttonLabel = "Preview",
}: FilePreviewModalProps) {
  const [open, setOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);

  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLoadingPreview(true);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
      >
        <Maximize2 size={15} />
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-[999] bg-slate-950/70 p-3 backdrop-blur-sm md:p-6">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <header className="flex flex-col gap-4 border-b border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <FileText size={22} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                    Document Preview
                  </p>
                  <h3 className="mt-1 truncate text-lg font-black text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                    {fileName || "Dokumen"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Buka Tab Baru
                  <ExternalLink size={15} />
                </a>

                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-800"
                >
                  Download
                  <Download size={15} />
                </a>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-red-50 hover:text-red-700"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <main className="relative flex-1 overflow-hidden bg-slate-100">
              {loadingPreview && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-600 shadow-sm">
                    <Loader2 size={18} className="animate-spin" />
                    Memuat preview dokumen...
                  </div>
                </div>
              )}

              {isImage ? (
                <div className="flex h-full items-center justify-center overflow-auto p-5">
                  <img
                    src={previewUrl}
                    alt={fileName || "Preview dokumen"}
                    onLoad={() => setLoadingPreview(false)}
                    onError={() => setLoadingPreview(false)}
                    className="max-h-full max-w-full rounded-2xl bg-white object-contain shadow-xl"
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={previewUrl}
                  title={fileName || "Preview dokumen"}
                  onLoad={() => setLoadingPreview(false)}
                  className="h-full w-full border-0 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <FileText
                      className="mx-auto mb-4 text-slate-400"
                      size={44}
                    />

                    <h4 className="text-xl font-black text-slate-950">
                      Preview tidak tersedia
                    </h4>

                    <p className="mt-2 leading-7 text-slate-500">
                      Tipe file ini belum bisa ditampilkan langsung. Gunakan
                      tombol buka tab baru atau download.
                    </p>

                    <div className="mt-5 flex justify-center gap-2">
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
                      >
                        Buka File
                      </a>

                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
