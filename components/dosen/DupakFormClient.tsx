/** @format */

"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileUp,
  Loader2,
  Paperclip,
  Save,
  Send,
  UploadCloud,
} from "lucide-react";
import {
  DUPAK_PERSONAL_FIELDS,
  DUPAK_TEMPLATE_ROWS,
  getAssessorTotal,
  getProposerTotal,
  type DupakCreditData,
  type DupakPersonalData,
} from "@/lib/dupak-template";
import DupakPreview from "@/components/dupak/DupakPreview";
import FilePreviewModal from "@/components/documents/FilePreviewModal";
import DupakEvidenceLinkCell, {
  type DupakEvidenceItem,
} from "@/components/dosen/DupakEvidenceLinkCell";

type InitialDupak = {
  nomor: string;
  instansi: string;
  masaPenilaianStart: string;
  masaPenilaianEnd: string;
  personalData: DupakPersonalData;
  creditData: DupakCreditData;
  supportNotes: string;
  currentStep: number;
  evidences: DupakEvidenceItem[];
};

type Props = {
  initialData: InitialDupak;
};

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

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

export default function DupakFormClient({ initialData }: Props) {
  const router = useRouter();

  const [step, setStep] = useState(initialData.currentStep || 1);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [form, setForm] = useState<InitialDupak>({
    ...initialData,
    evidences: initialData.evidences || [],
  });

  const inputRows = useMemo(
    () => DUPAK_TEMPLATE_ROWS.filter((row) => row.type === "ITEM"),
    [],
  );

  const evidenceMap = useMemo(() => {
    const map = new Map<string, DupakEvidenceItem>();

    for (const evidence of form.evidences) {
      if (!map.has(evidence.rowCode)) {
        map.set(evidence.rowCode, evidence);
      }
    }

    return map;
  }, [form.evidences]);

  const filledCreditRows = inputRows.filter((row) => {
    const value = form.creditData[row.code];

    return (
      Number(value?.oldProposer || 0) > 0 ||
      Number(value?.newProposer || 0) > 0 ||
      Number(value?.oldAssessor || 0) > 0 ||
      Number(value?.newAssessor || 0) > 0
    );
  }).length;

  const progress = Math.min(
    100,
    Math.round(
      (((form.nomor ? 1 : 0) +
        (form.instansi ? 1 : 0) +
        (form.masaPenilaianStart ? 1 : 0) +
        (form.masaPenilaianEnd ? 1 : 0) +
        DUPAK_PERSONAL_FIELDS.filter((field) =>
          String(form.personalData[field.key] || "").trim(),
        ).length +
        filledCreditRows) /
        (4 + DUPAK_PERSONAL_FIELDS.length + inputRows.length)) *
        100,
    ),
  );

  const updateRoot = (key: keyof InitialDupak, value: string | number) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updatePersonal = (key: keyof DupakPersonalData, value: string) => {
    setForm((current) => ({
      ...current,
      personalData: {
        ...current.personalData,
        [key]: value,
      },
    }));
  };

  const updateCredit = (
    code: string,
    key: "oldProposer" | "newProposer" | "oldAssessor" | "newAssessor",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      creditData: {
        ...current.creditData,
        [code]: {
          ...current.creditData[code],
          [key]: value,
        },
      },
    }));
  };

  const upsertEvidence = (evidence: DupakEvidenceItem) => {
    setForm((current) => {
      const filtered = current.evidences.filter(
        (item) => item.rowCode !== evidence.rowCode,
      );

      return {
        ...current,
        evidences: [evidence, ...filtered],
      };
    });
  };

  const save = async (action: "SAVE" | "SUBMIT") => {
    setMessage(null);
    setSaving(true);

    try {
      const response = await fetch("/api/dosen/dupak", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nomor: form.nomor,
          instansi: form.instansi,
          masaPenilaianStart: form.masaPenilaianStart,
          masaPenilaianEnd: form.masaPenilaianEnd,
          personalData: form.personalData,
          creditData: form.creditData,
          supportNotes: form.supportNotes,
          currentStep: step,
          action,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: json.message || "Gagal menyimpan DUPAK.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: json.message || "DUPAK berhasil disimpan.",
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
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
              Pengisian DUPAK
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Format Daftar Usul Penetapan Angka Kredit
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Isi data DUPAK secara bertahap. Pada bagian angka kredit, unggah
              bukti dokumen pada setiap baris kegiatan yang relevan.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Progress
              </p>
              <p className="mt-1 text-4xl font-black">{progress}%</p>
            </div>

            <div className="rounded-3xl bg-sky-700 p-5 text-white">
              <p className="text-xs font-black uppercase tracking-widest text-sky-100">
                Bukti
              </p>
              <p className="mt-1 text-4xl font-black">
                {form.evidences.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-700"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StepButton
          step={1}
          active={step === 1}
          setStep={setStep}
          label="Header"
        />
        <StepButton
          step={2}
          active={step === 2}
          setStep={setStep}
          label="Identitas"
        />
        <StepButton
          step={3}
          active={step === 3}
          setStep={setStep}
          label="Angka Kredit & Bukti"
        />
        <StepButton
          step={4}
          active={step === 4}
          setStep={setStep}
          label="Preview"
        />
      </div>

      {message && (
        <div
          className={`flex gap-2 rounded-2xl border p-4 text-sm font-bold leading-6 ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {step === 1 && (
        <Card title="Informasi Utama DUPAK">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nomor DUPAK">
              <input
                value={form.nomor}
                onChange={(event) => updateRoot("nomor", event.target.value)}
                className="input-dupak"
                placeholder="Nomor DUPAK"
              />
            </Field>

            <Field label="Instansi">
              <input
                value={form.instansi}
                onChange={(event) => updateRoot("instansi", event.target.value)}
                className="input-dupak"
                placeholder="Nama instansi"
              />
            </Field>

            <Field label="Masa Penilaian Mulai">
              <input
                type="date"
                value={form.masaPenilaianStart}
                onChange={(event) =>
                  updateRoot("masaPenilaianStart", event.target.value)
                }
                className="input-dupak"
              />
            </Field>

            <Field label="Masa Penilaian Selesai">
              <input
                type="date"
                value={form.masaPenilaianEnd}
                onChange={(event) =>
                  updateRoot("masaPenilaianEnd", event.target.value)
                }
                className="input-dupak"
              />
            </Field>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Keterangan Perorangan">
          <div className="grid gap-5 md:grid-cols-2">
            {DUPAK_PERSONAL_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  value={form.personalData[field.key] || ""}
                  onChange={(event) =>
                    updatePersonal(field.key, event.target.value)
                  }
                  className="input-dupak"
                  placeholder={field.placeholder}
                />
              </Field>
            ))}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Unsur yang Dinilai dan Bukti Dokumen">
          <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold leading-6 text-sky-800">
            Pada setiap baris kegiatan, isi angka kredit dan unggah bukti
            dokumen pendukung. Bukti dapat berupa PDF, JPG, JPEG, atau PNG
            maksimal 5 MB.
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead>
                <tr className="bg-slate-950 text-white">
                  <th rowSpan={2} className="border border-slate-700 p-3">
                    Unsur/Sub Unsur/Butir Kegiatan
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-700 p-3 text-center"
                  >
                    Instansi Pengusul
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-700 p-3 text-center"
                  >
                    Tim Penilai
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-700 p-3 text-center"
                  >
                    Bukti Dokumen
                  </th>
                </tr>

                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-700 p-3 text-center">
                    Lama
                  </th>
                  <th className="border border-slate-700 p-3 text-center">
                    Baru
                  </th>
                  <th className="border border-slate-700 p-3 text-center">
                    Jumlah
                  </th>
                  <th className="border border-slate-700 p-3 text-center">
                    Lama
                  </th>
                  <th className="border border-slate-700 p-3 text-center">
                    Baru
                  </th>
                  <th className="border border-slate-700 p-3 text-center">
                    Jumlah
                  </th>
                </tr>
              </thead>

              <tbody>
                {DUPAK_TEMPLATE_ROWS.map((row) => {
                  const value = form.creditData[row.code];
                  const evidence = evidenceMap.get(row.code) || null;

                  if (row.type === "SECTION") {
                    return (
                      <tr key={row.code} className="bg-sky-50">
                        <td
                          colSpan={8}
                          className="border border-slate-200 p-3 font-black text-sky-900"
                        >
                          {row.label}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={row.code}
                      className={
                        row.type === "TOTAL" ? "bg-slate-100" : "bg-white"
                      }
                    >
                      <td
                        className={`border border-slate-200 p-3 ${
                          row.type === "TOTAL"
                            ? "font-black text-slate-950"
                            : "font-semibold text-slate-700"
                        }`}
                        style={{ paddingLeft: `${12 + row.level * 18}px` }}
                      >
                        {row.label}
                      </td>

                      {row.type === "TOTAL" ? (
                        <>
                          <ReadOnlyCell value={getProposerTotal(value)} />
                          <ReadOnlyCell value={0} />
                          <ReadOnlyCell value={getProposerTotal(value)} />
                          <ReadOnlyCell value={getAssessorTotal(value)} />
                          <ReadOnlyCell value={0} />
                          <ReadOnlyCell value={getAssessorTotal(value)} />
                          <td className="border border-slate-200 p-3 text-center text-xs font-bold text-slate-400">
                            Tidak perlu bukti
                          </td>
                        </>
                      ) : (
                        <>
                          <InputCell
                            value={value?.oldProposer || ""}
                            onChange={(v) =>
                              updateCredit(row.code, "oldProposer", v)
                            }
                          />
                          <InputCell
                            value={value?.newProposer || ""}
                            onChange={(v) =>
                              updateCredit(row.code, "newProposer", v)
                            }
                          />
                          <ReadOnlyCell value={getProposerTotal(value)} />
                          <InputCell
                            value={value?.oldAssessor || ""}
                            onChange={(v) =>
                              updateCredit(row.code, "oldAssessor", v)
                            }
                          />
                          <InputCell
                            value={value?.newAssessor || ""}
                            onChange={(v) =>
                              updateCredit(row.code, "newAssessor", v)
                            }
                          />
                          <ReadOnlyCell value={getAssessorTotal(value)} />
                          <DupakEvidenceLinkCell
                            rowCode={row.code}
                            rowLabel={row.label}
                            evidence={evidence}
                            onUploaded={upsertEvidence}
                          />
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <Field label="Lampiran Pendukung DUPAK Umum">
              <textarea
                value={form.supportNotes}
                onChange={(event) =>
                  updateRoot("supportNotes", event.target.value)
                }
                className="input-dupak min-h-32"
                placeholder="Tuliskan daftar lampiran pendukung DUPAK secara umum..."
              />
            </Field>
          </div>
        </Card>
      )}

      {step === 4 && (
        <DupakPreview
          nomor={form.nomor}
          instansi={form.instansi}
          masaPenilaianStart={form.masaPenilaianStart}
          masaPenilaianEnd={form.masaPenilaianEnd}
          personalData={form.personalData}
          creditData={form.creditData}
          supportNotes={form.supportNotes}
        />
      )}

      <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <ClipboardList size={21} />
          </div>

          <div>
            <p className="font-black text-slate-950">Aksi DUPAK</p>
            <p className="text-sm font-semibold text-slate-500">
              Simpan sebagai draft atau kirim ke admin untuk diperiksa.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={saving}
            onClick={() => save("SAVE")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Simpan Draft
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => save("SUBMIT")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-800 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            Kirim ke Admin
          </button>
        </div>
      </div>

      <style jsx>{`
        .input-dupak {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.85rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: rgb(51 65 85);
          outline: none;
          transition: 0.2s ease;
        }

        .input-dupak:focus {
          border-color: rgb(56 189 248);
          background: white;
          box-shadow: 0 0 0 4px rgb(224 242 254);
        }
      `}</style>
    </section>
  );
}

function StepButton({
  step,
  active,
  setStep,
  label,
}: {
  step: number;
  active: boolean;
  setStep: (step: number) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => setStep(step)}
      className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
        active
          ? "bg-slate-950 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {step}. {label}
    </button>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Eye size={20} />
        </div>
        <h3 className="text-xl font-black text-slate-950">{title}</h3>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function InputCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <td className="border border-slate-200 p-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-700 outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
        placeholder="0"
      />
    </td>
  );
}

function ReadOnlyCell({ value }: { value: number }) {
  return (
    <td className="border border-slate-200 bg-slate-50 p-2 text-center font-black text-slate-800">
      {value || "-"}
    </td>
  );
}

function EvidenceCell({
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setLocalError(null);

    try {
      const formData = new FormData();

      formData.append("rowCode", rowCode);
      formData.append("rowLabel", rowLabel);
      formData.append("file", file);

      const response = await fetch("/api/dosen/dupak/evidence", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        setLocalError(json.message || "Gagal upload bukti.");
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
        evidenceUrl: uploadedEvidence.evidenceUrl ?? null,
        fileName: uploadedEvidence.fileName ?? null,
        fileSize: uploadedEvidence.fileSize ?? null,
        mimeType: uploadedEvidence.mimeType ?? null,
        note: uploadedEvidence.note ?? null,
        uploadedAt:
          typeof uploadedEvidence.uploadedAt === "string"
            ? uploadedEvidence.uploadedAt
            : new Date(uploadedEvidence.uploadedAt).toISOString(),
      });
    } catch {
      setLocalError("Tidak dapat terhubung ke server.");
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <td className="border border-slate-200 p-3 align-top">
      <div className="min-w-[260px] space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              upload(file);
            }
          }}
        />

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black text-sky-700 transition hover:bg-sky-100 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : evidence ? (
            <FileUp size={16} />
          ) : (
            <UploadCloud size={16} />
          )}
          {uploading
            ? "Mengupload..."
            : evidence
              ? "Ganti Bukti"
              : "Upload Bukti"}
        </button>

        {evidence ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-2">
              <Paperclip size={16} className="mt-0.5 shrink-0 text-slate-400" />

              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-800">
                  {evidence.fileName}
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-400">
                  {formatFileSize(evidence.fileSize)} •{" "}
                  {formatDateTime(evidence.uploadedAt)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <FilePreviewModal
                title={`Bukti ${rowLabel}`}
                fileName={evidence.fileName}
                mimeType={evidence.mimeType}
                previewUrl={`/api/files/dupak-evidence/${evidence.id}`}
                downloadUrl={`/api/files/dupak-evidence/${evidence.id}?download=1`}
                buttonLabel="Preview"
              />

              <a
                href={`/api/files/dupak-evidence/${evidence.id}?download=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                <Download size={14} />
                Download
              </a>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs font-bold text-slate-400">
            Belum ada bukti
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
