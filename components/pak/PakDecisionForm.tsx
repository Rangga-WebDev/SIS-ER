/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Gavel,
  Loader2,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";

type Props = {
  assignmentId: string;
  decision: "PERLU_REVISI" | "DITERIMA" | null;
  isRatified: boolean;
  isComplete: boolean;
  missingCount: number;
  totalScore: number;
};

export default function PakDecisionForm({
  assignmentId,
  decision,
  isRatified,
  isComplete,
  missingCount,
  totalScore,
}: Props) {
  const router = useRouter();

  const [choice, setChoice] = useState<"PERLU_REVISI" | "DITERIMA" | null>(
    decision,
  );
  const [internalNote, setInternalNote] = useState("");
  const [lecturerRevisionNote, setLecturerRevisionNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const submitDecision = async () => {
    if (!choice) {
      setMessage({ type: "error", text: "Pilih keputusan penilaian dahulu." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/pak/assignments/${assignmentId}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision: choice,
            internalNote: internalNote || undefined,
            lecturerRevisionNote: lecturerRevisionNote || undefined,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: result.message || "Gagal menyimpan keputusan.",
        });
        return;
      }

      setMessage({ type: "success", text: result.message });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  };

  const ratify = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/pak/assignments/${assignmentId}/ratify`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: result.message || "Gagal mengesahkan penilaian.",
        });
        return;
      }

      setMessage({ type: "success", text: result.message });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  };

  if (isRatified) {
    return (
      <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <LockKeyhole size={21} />
          </div>

          <div>
            <h3 className="text-xl font-black text-emerald-900">
              Penilaian Telah Disahkan
            </h3>
            <p className="text-sm font-semibold text-emerald-700">
              Total angka kredit Tim Penilai: {totalScore}. Penilaian terkunci —
              perubahan hanya melalui pembukaan kembali oleh Admin.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Gavel size={21} />
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-950">
            Keputusan Penilaian
          </h3>
          <p className="text-sm font-semibold text-slate-500">
            Total sementara: {totalScore}.{" "}
            {isComplete
              ? "Seluruh baris yang diusulkan sudah dinilai."
              : `${missingCount} baris kegiatan belum dinilai.`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setChoice("PERLU_REVISI")}
          className={`rounded-2xl border p-4 text-left transition ${
            choice === "PERLU_REVISI"
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 font-black">
            <RotateCcw size={18} />
            Perlu Revisi
          </div>
          <p className="mt-1 text-xs font-semibold opacity-80">
            Kembalikan ke dosen dengan catatan revisi.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setChoice("DITERIMA")}
          className={`rounded-2xl border p-4 text-left transition ${
            choice === "DITERIMA"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 font-black">
            <CheckCircle2 size={18} />
            Diterima
          </div>
          <p className="mt-1 text-xs font-semibold opacity-80">
            Penilaian lengkap dan siap disahkan.
          </p>
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
            Catatan Internal Tim PAK/Admin
          </span>
          <textarea
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
            placeholder="Tidak akan dilihat dosen..."
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
            Catatan Revisi untuk Dosen{" "}
            {choice === "PERLU_REVISI" ? "(wajib)" : ""}
          </span>
          <textarea
            value={lecturerRevisionNote}
            onChange={(event) => setLecturerRevisionNote(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
            placeholder="Akan dikirim ke dosen jika Perlu Revisi..."
          />
        </label>
      </div>

      {message && (
        <div
          className={`mt-4 flex gap-3 rounded-2xl border p-4 text-sm font-semibold leading-6 ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {message.text}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={submitDecision}
          className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-800 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Gavel size={18} />
          )}
          Simpan Keputusan
        </button>

        <button
          type="button"
          disabled={saving || decision !== "DITERIMA" || !isComplete}
          onClick={ratify}
          title={
            decision !== "DITERIMA"
              ? "Simpan keputusan Diterima terlebih dahulu."
              : !isComplete
                ? "Lengkapi seluruh penilaian terlebih dahulu."
                : "Sahkan penilaian"
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LockKeyhole size={18} />
          Sahkan Penilaian
        </button>
      </div>
    </section>
  );
}
