/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Save,
  ScrollText,
  Send,
} from "lucide-react";

export type MinuteContent = {
  tempat?: string;
  jabatanSaatIni?: string;
  tmt?: string;
  usulanJabatan?: string;
  kumSebelumnya?: string;
  kebutuhanKum?: string;
  kumDicapai?: string;
  unsurPendidikan?: string;
  unsurPenelitian?: string;
  unsurPengabdian?: string;
  unsurPenunjang?: string;
  jumlahKeseluruhan?: string;
  catatanPemeriksaan?: string;
};

type Props = {
  dupakId: string;
  status: string;
  minuteStatus: "NONE" | "DRAFT" | "FINAL";
  initialNomor: string;
  initialDate: string;
  initialContent: MinuteContent;
};

const FIELDS: { key: keyof MinuteContent; label: string }[] = [
  { key: "jabatanSaatIni", label: "Jabatan Akademik Saat Ini" },
  { key: "tmt", label: "TMT" },
  { key: "usulanJabatan", label: "Usulan Jabatan" },
  { key: "kumSebelumnya", label: "KUM Sebelumnya" },
  { key: "kebutuhanKum", label: "Kebutuhan KUM" },
  { key: "kumDicapai", label: "KUM yang Dicapai" },
  { key: "unsurPendidikan", label: "Unsur Pendidikan" },
  { key: "unsurPenelitian", label: "Unsur Penelitian" },
  { key: "unsurPengabdian", label: "Unsur Pengabdian" },
  { key: "unsurPenunjang", label: "Unsur Penunjang" },
  { key: "jumlahKeseluruhan", label: "Jumlah Keseluruhan" },
  { key: "tempat", label: "Tempat" },
];

export default function BeritaAcaraForm({
  dupakId,
  status,
  minuteStatus,
  initialNomor,
  initialDate,
  initialContent,
}: Props) {
  const router = useRouter();

  const [nomor, setNomor] = useState(initialNomor);
  const [examinationDate, setExaminationDate] = useState(initialDate);
  const [content, setContent] = useState<MinuteContent>(initialContent);
  const [reopenReason, setReopenReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isLocked = minuteStatus === "FINAL";

  const canManage =
    status === "PENILAIAN_DISAHKAN" ||
    status === "BERITA_ACARA_DRAFT" ||
    status === "BERITA_ACARA_DISAHKAN";

  const callApi = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/dupak/${dupakId}/minutes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: result.message || "Gagal memproses berita acara.",
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

  if (!canManage) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <ScrollText size={21} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-950">
              Berita Acara Pemeriksaan
            </h3>
            <p className="text-sm font-semibold text-slate-500">
              Berita acara dapat dibuat setelah penilaian Tim PAK disahkan.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <ScrollText size={21} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-950">
              Berita Acara Pemeriksaan
            </h3>
            <p className="text-sm font-semibold text-slate-500">
              {isLocked
                ? "Berita acara telah disahkan dan terkunci."
                : "Lengkapi data berita acara, simpan draft, lalu sahkan."}
            </p>
          </div>
        </div>

        {minuteStatus !== "NONE" && (
          <span
            className={`rounded-full border px-4 py-1.5 text-xs font-black ${
              isLocked
                ? "border-violet-300 bg-violet-100 text-violet-800"
                : "border-violet-200 bg-violet-50 text-violet-700"
            }`}
          >
            {isLocked ? "DISAHKAN" : "DRAFT"}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
            Nomor Berita Acara
          </span>
          <input
            value={nomor}
            disabled={isLocked}
            onChange={(event) => setNomor(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white disabled:opacity-60"
            placeholder="Contoh: 012/BA-PAK/VIII/2026"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
            Hari / Tanggal Pemeriksaan
          </span>
          <input
            type="date"
            value={examinationDate}
            disabled={isLocked}
            onChange={(event) => setExaminationDate(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white disabled:opacity-60"
          />
        </label>

        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
              {field.label}
            </span>
            <input
              value={content[field.key] || ""}
              disabled={isLocked}
              onChange={(event) =>
                setContent((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white disabled:opacity-60"
            />
          </label>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
          Catatan Pemeriksaan
        </span>
        <textarea
          value={content.catatanPemeriksaan || ""}
          disabled={isLocked}
          onChange={(event) =>
            setContent((current) => ({
              ...current,
              catatanPemeriksaan: event.target.value,
            }))
          }
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white disabled:opacity-60"
        />
      </label>

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
        {!isLocked && (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                callApi({
                  action: "SAVE_DRAFT",
                  content: {
                    nomor,
                    examinationDate,
                    ...content,
                  },
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              Simpan Draft
            </button>

            {minuteStatus === "DRAFT" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => callApi({ action: "FINALIZE" })}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-800 disabled:opacity-60"
              >
                <LockKeyhole size={17} />
                Sahkan & Kunci Berita Acara
              </button>
            )}
          </>
        )}

        {minuteStatus !== "NONE" && (
          <a
            href={`/api/admin/dupak/${dupakId}/minutes/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800"
          >
            <ScrollText size={17} />
            Unduh PDF
          </a>
        )}

        {isLocked && status === "BERITA_ACARA_DISAHKAN" && (
          <button
            type="button"
            disabled={saving}
            onClick={() => callApi({ action: "FORWARD_INTEGRITY" })}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-800 disabled:opacity-60"
          >
            <Send size={17} />
            Teruskan ke Komite Integritas
          </button>
        )}
      </div>

      {isLocked && status === "BERITA_ACARA_DISAHKAN" && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900">
            Buka kembali berita acara (dengan alasan tercatat)
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none"
              placeholder="Alasan pembukaan kembali..."
            />

            <button
              type="button"
              disabled={saving || reopenReason.trim().length < 5}
              onClick={() =>
                callApi({ action: "REOPEN", reason: reopenReason })
              }
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Buka Kembali
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
