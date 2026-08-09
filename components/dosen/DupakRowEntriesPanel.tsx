/** @format */

"use client";

// Panel rincian kegiatan (sub-item) per baris DUPAK milik dosen.
// Multi-entri: daftar kegiatan dengan field kontekstual + link bukti per rincian.

import { useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  getRowDetailProfile,
  getRowSubCategorySuggestions,
} from "@/lib/dupak-template";

export type DupakEntryItem = {
  id: string;
  rowCode: string;
  title: string;
  subCategory: string | null;
  description: string | null;
  activityYear: string | null;
  credit: string | null;
  evidenceUrl: string | null;
  orderIndex: number;
};

export type LecturerReviewItem = {
  rowCode: string;
  entryKey: string;
  status: "SESUAI" | "PERLU_REVISI" | "TIDAK_SESUAI" | "DIREVISI_DOSEN";
  comment: string | null;
};

type EntryFormState = {
  title: string;
  subCategory: string;
  description: string;
  activityYear: string;
  credit: string;
  evidenceUrl: string;
};

const EMPTY_FORM: EntryFormState = {
  title: "",
  subCategory: "",
  description: "",
  activityYear: "",
  credit: "",
  evidenceUrl: "",
};

function reviewBadge(status: LecturerReviewItem["status"]) {
  if (status === "SESUAI") {
    return {
      label: "✓ Sesuai",
      cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (status === "PERLU_REVISI") {
    return {
      label: "! Perlu Revisi",
      cls: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  if (status === "TIDAK_SESUAI") {
    return {
      label: "× Tidak Sesuai",
      cls: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  return {
    label: "↺ Sudah Direvisi",
    cls: "border-sky-200 bg-sky-50 text-sky-700",
  };
}

export default function DupakRowEntriesPanel({
  rowCode,
  rowLabel,
  entries,
  reviews,
  readOnly,
  onEntriesChange,
}: {
  rowCode: string;
  rowLabel: string;
  entries: DupakEntryItem[];
  reviews: LecturerReviewItem[];
  readOnly: boolean;
  onEntriesChange: (rowCode: string, entries: DupakEntryItem[]) => void;
}) {
  const profile = getRowDetailProfile(rowCode);
  const suggestions = getRowSubCategorySuggestions(rowCode);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EntryFormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const rowEntries = entries
    .filter((entry) => entry.rowCode === rowCode)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const reviewFor = (entryKey: string) =>
    reviews.find(
      (review) => review.rowCode === rowCode && review.entryKey === entryKey,
    );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setFormOpen(true);
  };

  const openEdit = (entry: DupakEntryItem) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      subCategory: entry.subCategory || "",
      description: entry.description || "",
      activityYear: entry.activityYear || "",
      credit: entry.credit || "",
      evidenceUrl: entry.evidenceUrl || "",
    });
    setError("");
    setFormOpen(true);
  };

  const submitForm = async () => {
    setBusy(true);
    setError("");

    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(
        isEdit
          ? `/api/dosen/dupak/entries/${editingId}`
          : "/api/dosen/dupak/entries",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isEdit ? form : { rowCode, ...form }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Gagal menyimpan rincian.");
        return;
      }

      const saved = result.entry as DupakEntryItem;

      const next = isEdit
        ? entries.map((entry) => (entry.id === saved.id ? saved : entry))
        : [...entries, saved];

      onEntriesChange(rowCode, next);
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (entry: DupakEntryItem) => {
    const confirmed = window.confirm(
      `Hapus rincian "${entry.title}"? Riwayat penilaiannya tetap tersimpan.`,
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/dosen/dupak/entries/${entry.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Gagal menghapus rincian.");
        return;
      }

      onEntriesChange(
        rowCode,
        entries.filter((item) => item.id !== entry.id),
      );
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-slate-700">
          Rincian Kegiatan — {rowLabel}
          <span className="ml-2 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-black text-slate-600">
            {rowEntries.length}
          </span>
        </p>

        {!readOnly && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-800"
          >
            <Plus size={16} />
            Tambah Rincian
          </button>
        )}
      </div>

      {rowEntries.length === 0 && !formOpen && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          Belum ada rincian. Tambahkan setiap kegiatan (misal per judul karya
          atau per mahasiswa bimbingan) agar penilaian lebih akurat. Angka
          kredit baris ini akan dihitung otomatis dari jumlah rincian.
        </p>
      )}

      {rowEntries.map((entry) => {
        const review = reviewFor(entry.id);
        const badge = review ? reviewBadge(review.status) : null;

        return (
          <div
            key={entry.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900">
                  {entry.title}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  {[entry.subCategory, entry.description, entry.activityYear]
                    .filter(Boolean)
                    .join(" • ") || "Tanpa keterangan tambahan"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                    AK: {entry.credit || "0"}
                  </span>

                  {entry.evidenceUrl ? (
                    <a
                      href={entry.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 transition hover:bg-sky-100"
                    >
                      <ExternalLink size={12} />
                      Bukti Google Drive
                    </a>
                  ) : (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                      Belum ada bukti
                    </span>
                  )}

                  {badge && (
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>

                {review?.comment &&
                  (review.status === "PERLU_REVISI" ||
                    review.status === "TIDAK_SESUAI") && (
                    <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                      Catatan Tim PAK: {review.comment}
                    </p>
                  )}
              </div>

              {!readOnly && (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openEdit(entry)}
                    title="Ubah rincian"
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeEntry(entry)}
                    title="Hapus rincian"
                    className="rounded-xl border border-rose-200 bg-white p-2.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {formOpen && !readOnly && (
        <div className="rounded-xl border-2 border-sky-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-slate-900">
              {editingId ? "Ubah Rincian" : "Tambah Rincian Baru"}
            </p>

            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setError("");
              }}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">
                {profile.titleLabel} <span className="text-rose-600">*</span>
              </span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={profile.titlePlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>

            {(profile.subCategoryLabel || suggestions.length > 0) && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">
                  {profile.subCategoryLabel || "Kategori"}
                </span>
                <input
                  list={`subcategory-${rowCode}`}
                  value={form.subCategory}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subCategory: event.target.value,
                    }))
                  }
                  placeholder={
                    suggestions[0]
                      ? `Contoh: ${suggestions[0]}`
                      : "Kategori (opsional)"
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                />
                {suggestions.length > 0 && (
                  <datalist id={`subcategory-${rowCode}`}>
                    {suggestions.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                )}
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">
                {profile.yearLabel}
              </span>
              <input
                value={form.activityYear}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    activityYear: event.target.value,
                  }))
                }
                placeholder="Contoh: 2024"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>

            {profile.descriptionLabel && (
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">
                  {profile.descriptionLabel}
                </span>
                <input
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder={profile.descriptionPlaceholder || ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">
                Angka Kredit Diajukan
              </span>
              <input
                inputMode="decimal"
                value={form.credit}
                onChange={(event) => {
                  const value = event.target.value;
                  if (/^$|^[0-9]+([.,][0-9]*)?$/.test(value)) {
                    setForm((current) => ({ ...current, credit: value }));
                  }
                }}
                placeholder="Contoh: 12,5"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">
                Link Bukti Google Drive
              </span>
              <input
                value={form.evidenceUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    evidenceUrl: event.target.value,
                  }))
                }
                placeholder="https://drive.google.com/..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>
          </div>

          {error && (
            <p className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              <AlertCircle size={16} />
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy || form.title.trim().length < 3}
              onClick={submitForm}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-sky-800 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {editingId ? "Simpan Perubahan" : "Simpan Rincian"}
            </button>

            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setError("");
              }}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {error && !formOpen && (
        <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          <AlertCircle size={16} />
          {error}
        </p>
      )}
    </div>
  );
}
