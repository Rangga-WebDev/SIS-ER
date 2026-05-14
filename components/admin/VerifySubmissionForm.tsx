/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  RotateCcw,
  XCircle,
} from "lucide-react";

type DocumentStatus = "PENDING" | "VALID" | "REVISION" | "REJECTED";

type Props = {
  submissionId: string;
  currentStatus?: DocumentStatus;
  currentNote?: string | null;
};

export default function VerifySubmissionForm({
  submissionId,
  currentStatus = "PENDING",
  currentNote = "",
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<"VALID" | "REVISION" | "REJECTED">(
    currentStatus === "VALID" ||
      currentStatus === "REVISION" ||
      currentStatus === "REJECTED"
      ? currentStatus
      : "VALID",
  );

  const [adminNote, setAdminNote] = useState(currentNote || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage(null);

    if ((status === "REVISION" || status === "REJECTED") && !adminNote.trim()) {
      setMessage({
        type: "error",
        text: "Catatan wajib diisi untuk status revisi atau ditolak.",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/submissions/${submissionId}/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            adminNote: adminNote.trim(),
          }),
        },
      );

      const json = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: json.message || "Gagal menyimpan verifikasi.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: json.message || "Status dokumen diperbarui.",
      });

      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Tidak dapat terhubung ke server.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
    >
      <div className="mb-4">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-700">
          Verifikasi
        </p>

        <h4 className="mt-2 text-lg font-black text-slate-950">
          Keputusan Admin
        </h4>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Pilih status dokumen. Jika revisi atau ditolak, admin wajib memberi
          catatan yang jelas.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setStatus("VALID")}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
              status === "VALID"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 size={20} />
            <div>
              <p className="font-black">Valid</p>
              <p className="text-xs font-semibold opacity-80">
                Dokumen sesuai dan diterima.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatus("REVISION")}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
              status === "REVISION"
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <RotateCcw size={20} />
            <div>
              <p className="font-black">Revisi</p>
              <p className="text-xs font-semibold opacity-80">
                Dokumen perlu diperbaiki dosen.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatus("REJECTED")}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
              status === "REJECTED"
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <XCircle size={20} />
            <div>
              <p className="font-black">Ditolak</p>
              <p className="text-xs font-semibold opacity-80">
                Dokumen tidak dapat diterima.
              </p>
            </div>
          </button>
        </div>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
            <MessageSquareText size={14} />
            Catatan Admin
          </span>

          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            placeholder={
              status === "VALID"
                ? "Opsional. Contoh: Dokumen sudah sesuai."
                : "Wajib. Contoh: Mohon upload ulang dokumen dengan tanda tangan dan stempel lengkap."
            }
            className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {message.text}
          </div>
        )}

        <button
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Menyimpan...
            </>
          ) : status === "VALID" ? (
            <>
              <CheckCircle2 size={18} />
              Simpan Validasi
            </>
          ) : status === "REJECTED" ? (
            <>
              <XCircle size={18} />
              Simpan Penolakan
            </>
          ) : (
            <>
              <RotateCcw size={18} />
              Simpan Revisi
            </>
          )}
        </button>
      </div>
    </form>
  );
}
