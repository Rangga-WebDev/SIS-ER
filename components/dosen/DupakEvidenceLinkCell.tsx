/** @format */

"use client";

import { useState } from "react";
import { ExternalLink, Link2, Loader2, Save } from "lucide-react";

export type DupakEvidenceItem = {
  id: string;
  rowCode: string;
  rowLabel: string;
  evidenceUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  note: string | null;
  uploadedAt: string;
};

function formatDateTime(date?: string | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function DupakEvidenceLinkCell({
  rowCode,
  rowLabel,
  evidence,
  onUploaded,
}: {
  rowCode: string;
  rowLabel: string;
  evidence: DupakEvidenceItem | null;
  onUploaded: (evidence: DupakEvidenceItem) => void;
}) {
  const [evidenceUrl, setEvidenceUrl] = useState(evidence?.evidenceUrl || "");
  const [note, setNote] = useState(evidence?.note || "");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const saveLink = async () => {
    setLocalError(null);

    if (!evidenceUrl.trim()) {
      setLocalError("Link Google Drive wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("rowCode", rowCode);
      formData.append("rowLabel", rowLabel);
      formData.append("evidenceUrl", evidenceUrl.trim());
      formData.append("note", note.trim());

      const response = await fetch("/api/dosen/dupak/evidence", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        setLocalError(json.message || "Gagal menyimpan link bukti.");
        return;
      }

      const uploadedEvidence = json.evidence as {
        id: string;
        rowCode: string;
        rowLabel: string;
        evidenceUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
        mimeType: string | null;
        note: string | null;
        uploadedAt: string;
      };

      onUploaded({
        id: uploadedEvidence.id,
        rowCode: uploadedEvidence.rowCode,
        rowLabel: uploadedEvidence.rowLabel,
        evidenceUrl: uploadedEvidence.evidenceUrl,
        fileName: uploadedEvidence.fileName,
        fileSize: uploadedEvidence.fileSize,
        mimeType: uploadedEvidence.mimeType,
        note: uploadedEvidence.note,
        uploadedAt: uploadedEvidence.uploadedAt,
      });
    } catch {
      setLocalError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <td className="border border-slate-200 p-3 align-top">
      <div className="min-w-[300px] space-y-3">
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
            <Link2 size={14} />
            Link Google Drive
          </label>

          <input
            type="url"
            value={evidenceUrl}
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://drive.google.com/..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Catatan opsional..."
          className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
        />

        <button
          type="button"
          disabled={saving}
          onClick={saveLink}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {saving ? "Menyimpan..." : evidence ? "Perbarui Link" : "Simpan Link"}
        </button>

        {evidence?.evidenceUrl ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-black text-emerald-700">
              Link bukti sudah tersimpan
            </p>

            <p className="mt-1 text-[11px] font-bold text-emerald-600">
              Update: {formatDateTime(evidence.uploadedAt)}
            </p>

            <a
              href={evidence.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
            >
              Buka Link
              <ExternalLink size={14} />
            </a>
          </div>
        ) : (
          <p className="text-center text-xs font-bold text-slate-400">
            Belum ada link bukti
          </p>
        )}

        {localError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {localError}
          </p>
        ) : null}
      </div>
    </td>
  );
}
