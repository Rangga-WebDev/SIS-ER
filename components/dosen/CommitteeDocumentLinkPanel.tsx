/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  UploadCloud,
} from "lucide-react";

type CommitteeDocumentItem = {
  requirementId: string;
  code: string;
  name: string;
  sourceCategory: string;
  description: string;
  submission: {
    id: string;
    status: string;
    fileName: string | null;
    externalUrl: string | null;
    hasFile: boolean;
    uploadedAt: string | null;
  } | null;
};

type Props = {
  items: CommitteeDocumentItem[];
};

function isGoogleDriveUrl(value: string) {
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

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function CommitteeDocumentLinkPanel({ items }: Props) {
  const router = useRouter();
  const [links, setLinks] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Record<string, { type: "success" | "error"; text: string } | undefined>
  >({});

  const setItemMessage = (
    requirementId: string,
    message: { type: "success" | "error"; text: string },
  ) => {
    setMessages((current) => ({ ...current, [requirementId]: message }));
  };

  const handleExistingSubmission = (item: CommitteeDocumentItem) => {
    const current = item.submission;

    if (!current) {
      setItemMessage(item.requirementId, {
        type: "error",
        text: "Belum ada dokumen tersimpan di Data Dosen untuk item ini.",
      });
      return;
    }

    if (current.externalUrl) {
      setLinks((state) => ({
        ...state,
        [item.requirementId]: current.externalUrl || "",
      }));
      setItemMessage(item.requirementId, {
        type: "success",
        text: "Link dari Data Dosen sudah dimasukkan. Klik Simpan Link Drive untuk memperbarui kiriman ke Tim Komite.",
      });
      return;
    }

    if (current.hasFile) {
      setItemMessage(item.requirementId, {
        type: "success",
        text: "File yang sudah tersimpan di Data Dosen otomatis dapat dibuka Tim Komite. Tidak perlu unggah ulang link Drive.",
      });
      return;
    }

    setItemMessage(item.requirementId, {
      type: "error",
      text: "Data tersimpan belum memiliki file atau link yang bisa dipakai.",
    });
  };

  const saveDriveLink = async (item: CommitteeDocumentItem) => {
    const externalUrl = (links[item.requirementId] || "").trim();

    if (!externalUrl) {
      setItemMessage(item.requirementId, {
        type: "error",
        text: "Link Google Drive wajib diisi.",
      });
      return;
    }

    if (!isGoogleDriveUrl(externalUrl)) {
      setItemMessage(item.requirementId, {
        type: "error",
        text: "Link harus berasal dari Google Drive atau Google Docs.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("requirementId", item.requirementId);
    formData.append("externalUrl", externalUrl);

    setSavingId(item.requirementId);
    setMessages((current) => ({ ...current, [item.requirementId]: undefined }));

    try {
      const response = await fetch("/api/dosen/documents/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setItemMessage(item.requirementId, {
          type: "error",
          text: result.message || "Gagal menyimpan link Drive.",
        });
        return;
      }

      setLinks((state) => ({ ...state, [item.requirementId]: "" }));
      setItemMessage(item.requirementId, {
        type: "success",
        text:
          result.message || "Link Drive berhasil disimpan untuk Tim Komite.",
      });
      router.refresh();
    } catch {
      setItemMessage(item.requirementId, {
        type: "error",
        text: "Tidak dapat terhubung ke server.",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-cyan-200 bg-cyan-50/70 p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">
            Upload ke Tim Komite
          </p>
          <h2 className="mt-1 break-words text-xl font-black text-slate-950 sm:text-2xl">
            Dokumen Pemeriksaan Komite
          </h2>
          <p className="mt-2 max-w-4xl break-words text-sm font-semibold leading-6 text-slate-600">
            Isi dengan link Google Drive untuk Dokumen Artikel, Dokumen
            Korespondensi, Dokumen Uji Kemiripan, dan Rekomendasi Fakultas. Jika
            file sudah pernah diunggah pada Data Dosen, gunakan tombol Ambil
            dari Data Dosen.
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-700 text-white">
          <UploadCloud size={24} />
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-3 xl:grid-cols-2">
        {items.map((item) => {
          const message = messages[item.requirementId];
          const saving = savingId === item.requirementId;

          return (
            <article
              key={item.requirementId}
              className="min-w-0 overflow-hidden rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                  <FileText size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words text-base font-black text-slate-950">
                      {item.name}
                    </h3>
                    <span className="max-w-full rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
                      {item.sourceCategory}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.submission && (
                <div className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Data Dosen Tersimpan
                  </p>
                  <p className="mt-1 break-all text-sm font-bold text-slate-700">
                    {item.submission.externalUrl ||
                      item.submission.fileName ||
                      "Dokumen tersimpan"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Status {item.submission.status} • Upload{" "}
                    {formatDate(item.submission.uploadedAt)}
                  </p>

                  <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                    {item.submission.hasFile && (
                      <a
                        href={`/api/files/${item.submission.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                      >
                        <FileText size={13} />
                        Buka File
                      </a>
                    )}

                    {item.submission.externalUrl && (
                      <a
                        href={item.submission.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                      >
                        <ExternalLink size={13} />
                        Buka Link
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 grid min-w-0 gap-3">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <Link2 size={14} />
                    Link Google Drive
                  </span>
                  <input
                    type="url"
                    value={links[item.requirementId] || ""}
                    onChange={(event) =>
                      setLinks((state) => ({
                        ...state,
                        [item.requirementId]: event.target.value,
                      }))
                    }
                    placeholder="https://drive.google.com/..."
                    className="w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />
                </label>

                {message && (
                  <div
                    className={`flex gap-2 rounded-2xl border p-3 text-xs font-bold leading-5 ${
                      message.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    )}
                    {message.text}
                  </div>
                )}

                <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void saveDriveLink(item)}
                    disabled={saving}
                    className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Link2 size={17} />
                    )}
                    Simpan Link Drive
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExistingSubmission(item)}
                    className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-center text-sm font-black text-cyan-800 transition hover:bg-cyan-50"
                  >
                    <FileText size={17} />
                    Ambil dari Data Dosen
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
