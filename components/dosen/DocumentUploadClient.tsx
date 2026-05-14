/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  UploadCloud,
} from "lucide-react";

type RequirementPayload = {
  id: string;
  code: string;
  name: string;
  inputType: "FILE" | "URL" | "FILE_AND_URL" | "METADATA_ONLY";
  isYearly: boolean;
  yearStart: number | null;
  yearEnd: number | null;
  maxSizeMb: number;
  requiresLetterNumber: boolean;
  requiresLetterDate: boolean;
  requiresExternalUrl: boolean;
  allowedMimeTypes: string[];
};

type Props = {
  requirement: RequirementPayload;
};

const skpPredicates = ["Sangat Baik", "Baik", "Cukup", "Kurang"];

function mimeToAccept(mimes: string[]) {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg,.jpeg",
    "image/png": ".png",
  };

  return mimes.map((mime) => map[mime] || mime).join(",");
}

export default function DocumentUploadClient({ requirement }: Props) {
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const yearStart = requirement.yearStart || 2023;
  const yearEnd = requirement.yearEnd || currentYear;

  const yearOptions = useMemo(() => {
    if (!requirement.isYearly) return [];

    return Array.from(
      { length: yearEnd - yearStart + 1 },
      (_, index) => yearStart + index,
    ).reverse();
  }, [requirement.isYearly, yearStart, yearEnd]);

  const needsFile =
    requirement.inputType === "FILE" ||
    requirement.inputType === "FILE_AND_URL";

  const needsUrl =
    requirement.inputType === "URL" ||
    requirement.inputType === "FILE_AND_URL" ||
    requirement.requiresExternalUrl;

  const [file, setFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState<number>(
    yearOptions[0] || currentYear,
  );
  const [externalUrl, setExternalUrl] = useState("");
  const [letterNumber, setLetterNumber] = useState("");
  const [letterDate, setLetterDate] = useState("");
  const [skpPredicate, setSkpPredicate] = useState("Sangat Baik");

  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const resetForm = () => {
    setFile(null);
    setExternalUrl("");
    setLetterNumber("");
    setLetterDate("");
  };

  const upload = async () => {
    setMessage(null);

    if (needsFile && !file) {
      setMessage({
        type: "error",
        text: "File dokumen wajib dipilih.",
      });
      return;
    }

    if (needsUrl && !externalUrl.trim()) {
      setMessage({
        type: "error",
        text: "Tautan wajib diisi.",
      });
      return;
    }

    if (requirement.isYearly && !academicYear) {
      setMessage({
        type: "error",
        text: "Tahun dokumen wajib dipilih.",
      });
      return;
    }

    if (requirement.requiresLetterNumber && !letterNumber.trim()) {
      setMessage({
        type: "error",
        text: "Nomor surat wajib diisi.",
      });
      return;
    }

    if (requirement.requiresLetterDate && !letterDate) {
      setMessage({
        type: "error",
        text: "Tanggal surat wajib diisi.",
      });
      return;
    }

    const formData = new FormData();

    formData.append("requirementId", requirement.id);

    if (file) formData.append("file", file);
    if (requirement.isYearly) {
      formData.append("academicYear", String(academicYear));
    }
    if (externalUrl.trim()) {
      formData.append("externalUrl", externalUrl.trim());
    }
    if (letterNumber.trim()) {
      formData.append("letterNumber", letterNumber.trim());
    }
    if (letterDate) {
      formData.append("letterDate", letterDate);
    }

    if (requirement.code === "SKP_TAHUNAN") {
      formData.append("skpPredicate", skpPredicate);
    }

    setIsUploading(true);

    try {
      const response = await fetch("/api/dosen/documents/upload", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: json.message || "Gagal menyimpan dokumen.",
        });
        return;
      }

      resetForm();

      setMessage({
        type: "success",
        text: json.message || "Dokumen berhasil disimpan.",
      });

      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Tidak dapat terhubung ke server.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <UploadCloud size={19} />
        </div>

        <div>
          <p className="text-sm font-black text-slate-900">Form Pengisian</p>
          <p className="text-xs font-bold text-slate-400">
            Maksimal {requirement.maxSizeMb} MB
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {requirement.isYearly && (
          <FieldGroup label="Tahun SKP" icon={<CalendarDays size={14} />}>
            <select
              value={academicYear}
              onChange={(event) => setAcademicYear(Number(event.target.value))}
              className="input-industrial"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </FieldGroup>
        )}

        {requirement.code === "SKP_TAHUNAN" && (
          <FieldGroup label="Predikat SKP">
            <select
              value={skpPredicate}
              onChange={(event) => setSkpPredicate(event.target.value)}
              className="input-industrial"
            >
              {skpPredicates.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FieldGroup>
        )}

        {needsUrl && (
          <FieldGroup label="Tautan / URL" icon={<Link2 size={14} />}>
            <input
              type="url"
              value={externalUrl}
              onChange={(event) => setExternalUrl(event.target.value)}
              placeholder="https://..."
              className="input-industrial"
            />
          </FieldGroup>
        )}

        {requirement.requiresLetterNumber && (
          <FieldGroup label="Nomor Surat" icon={<FileText size={14} />}>
            <input
              type="text"
              value={letterNumber}
              onChange={(event) => setLetterNumber(event.target.value)}
              placeholder="Contoh: 123/UN/2026"
              className="input-industrial"
            />
          </FieldGroup>
        )}

        {requirement.requiresLetterDate && (
          <FieldGroup label="Tanggal Surat">
            <input
              type="date"
              value={letterDate}
              onChange={(event) => setLetterDate(event.target.value)}
              className="input-industrial"
            />
          </FieldGroup>
        )}

        {needsFile && (
          <FieldGroup label="File Dokumen">
            <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-sky-300 hover:bg-sky-50">
              <UploadCloud className="mx-auto mb-2 text-slate-400" size={24} />

              <p className="text-sm font-black text-slate-700">
                {file ? file.name : "Pilih file dokumen"}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                PDF, JPG, JPEG, PNG
              </p>

              <input
                type="file"
                accept={mimeToAccept(requirement.allowedMimeTypes)}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </FieldGroup>
        )}

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

        <button
          type="button"
          onClick={upload}
          disabled={isUploading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <UploadCloud size={17} />
              Simpan Dokumen
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .input-industrial {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: rgb(51 65 85);
          outline: none;
          transition: 0.2s ease;
        }

        .input-industrial:focus {
          border-color: rgb(56 189 248);
          box-shadow: 0 0 0 4px rgb(224 242 254);
          background: white;
        }
      `}</style>
    </div>
  );
}

function FieldGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
        {icon}
        {label}
      </span>

      {children}
    </label>
  );
}
