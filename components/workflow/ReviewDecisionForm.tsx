/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Gavel, Loader2 } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

type Props = {
  title: string;
  endpoint: string;
  fieldName: "result" | "decision";
  options: Option[];
};

// Form keputusan generik untuk Komite Integritas dan Tim Senat.
export default function ReviewDecisionForm({
  title,
  endpoint,
  fieldName,
  options,
}: Props) {
  const router = useRouter();

  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const submit = async () => {
    if (!value) {
      setMessage({ type: "error", text: "Pilih hasil keputusan dahulu." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [fieldName]: value,
          note,
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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
          <Gavel size={21} />
        </div>

        <h3 className="text-xl font-black text-slate-950">{title}</h3>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setValue(option.value)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
              value === option.value
                ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
          Catatan Keputusan (wajib)
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
          placeholder="Tuliskan pertimbangan keputusan..."
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

      <button
        type="button"
        disabled={saving}
        onClick={submit}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-800 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Gavel size={18} />
        )}
        Simpan Keputusan
      </button>
    </section>
  );
}
