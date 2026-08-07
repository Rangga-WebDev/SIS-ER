/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type Decision = "LOLOS_VERIFIKASI" | "PERLU_PERBAIKAN_ADMIN" | "DITOLAK_ADMIN";

type Props = {
  dupakId: string;
};

const DECISIONS: {
  value: Decision;
  label: string;
  desc: string;
  icon: React.ReactNode;
  activeClass: string;
}[] = [
  {
    value: "LOLOS_VERIFIKASI",
    label: "Lolos Verifikasi",
    desc: "Lanjut ke penugasan Tim PAK",
    icon: <CheckCircle2 size={19} />,
    activeClass: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  {
    value: "PERLU_PERBAIKAN_ADMIN",
    label: "Perlu Perbaikan",
    desc: "Kembalikan ke dosen",
    icon: <RotateCcw size={19} />,
    activeClass: "border-amber-300 bg-amber-50 text-amber-800",
  },
  {
    value: "DITOLAK_ADMIN",
    label: "Tolak",
    desc: "Tolak dengan alasan jelas",
    icon: <XCircle size={19} />,
    activeClass: "border-red-300 bg-red-50 text-red-800",
  },
];

export default function DupakVerifyForm({ dupakId }: Props) {
  const router = useRouter();

  const [decision, setDecision] = useState<Decision | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const [lecturerNote, setLecturerNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const submit = async () => {
    if (!decision) {
      setMessage({ type: "error", text: "Pilih keputusan verifikasi dahulu." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/dupak/${dupakId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          internalNote: internalNote || undefined,
          lecturerNote: lecturerNote || undefined,
        }),
      });

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

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <ShieldCheck size={21} />
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-950">
            Verifikasi Admin
          </h3>
          <p className="text-sm font-semibold text-slate-500">
            Periksa kelengkapan pengajuan lalu beri keputusan verifikasi awal.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {DECISIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setDecision(item.value)}
            className={`rounded-2xl border p-4 text-left transition ${
              decision === item.value
                ? item.activeClass
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2 font-black">
              {item.icon}
              {item.label}
            </div>
            <p className="mt-1 text-xs font-semibold opacity-80">{item.desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
            Catatan Internal (tidak dilihat dosen)
          </span>
          <textarea
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            placeholder="Catatan untuk admin dan Tim PAK..."
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
            Catatan untuk Dosen{" "}
            {decision && decision !== "LOLOS_VERIFIKASI" ? "(wajib)" : ""}
          </span>
          <textarea
            value={lecturerNote}
            onChange={(event) => setLecturerNote(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            placeholder="Catatan yang akan dibaca dosen..."
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

      <button
        type="button"
        disabled={saving}
        onClick={submit}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-800 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ShieldCheck size={18} />
        )}
        Simpan Keputusan Verifikasi
      </button>
    </section>
  );
}
