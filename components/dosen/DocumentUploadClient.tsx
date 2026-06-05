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
  Save,
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

const multiTextMetadataCodes = ["MATA_KULIAH_DIAMPU", "RANTING_ILMU_KEPAKARAN"];

function isMultiTextMetadataRequirement(code: string) {
  return multiTextMetadataCodes.includes(code);
}

function mimeToAccept(mimes: string[]) {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg,.jpeg",
    "image/png": ".png",
  };

  return mimes.map((mime) => map[mime] || mime).join(",");
}

function getMetadataLabels(code: string) {
  if (code === "MATA_KULIAH_DIAMPU") {
    return {
      title: "Mata Kuliah yang Diampu",
      label1: "Mata Kuliah 1",
      label2: "Mata Kuliah 2",
      label3: "Mata Kuliah 3",
      placeholder1: "Contoh: Sistem Terdistribusi",
      placeholder2: "Contoh: Pemrograman Web",
      placeholder3: "Contoh: Basis Data",
      helper: "Isi minimal 1 dan maksimal 3 mata kuliah yang diampu.",
    };
  }

  return {
    title: "Ranting Ilmu atau Kepakaran",
    label1: "Kepakaran 1",
    label2: "Kepakaran 2",
    label3: "Kepakaran 3",
    placeholder1: "Contoh: Software Engineering",
    placeholder2: "Contoh: Artificial Intelligence",
    placeholder3: "Contoh: Data Science",
    helper: "Isi minimal 1 dan maksimal 3 bidang kepakaran atau ranting ilmu.",
  };
}

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

  const isMultiTextMetadata = isMultiTextMetadataRequirement(requirement.code);

  const needsFile =
    !isMultiTextMetadata &&
    (requirement.inputType === "FILE" ||
      requirement.inputType === "FILE_AND_URL");

  const needsUrl =
    !isMultiTextMetadata &&
    (requirement.inputType === "URL" ||
      requirement.inputType === "FILE_AND_URL" ||
      requirement.requiresExternalUrl);

  const showDriveFallback = !isMultiTextMetadata && needsFile;

  const [file, setFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState<number>(
    yearOptions[0] || currentYear,
  );
  const [externalUrl, setExternalUrl] = useState("");
  const [letterNumber, setLetterNumber] = useState("");
  const [letterDate, setLetterDate] = useState("");
  const [skpPredicate, setSkpPredicate] = useState("Sangat Baik");

  const [metadataItem1, setMetadataItem1] = useState("");
  const [metadataItem2, setMetadataItem2] = useState("");
  const [metadataItem3, setMetadataItem3] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const maxBytes = requirement.maxSizeMb * 1024 * 1024;
  const fileTooLarge = Boolean(file && file.size > maxBytes);
  const acceptableFile = Boolean(file && file.size <= maxBytes);

  const resetForm = () => {
    setFile(null);
    setExternalUrl("");
    setLetterNumber("");
    setLetterDate("");

    if (isMultiTextMetadata) {
      setMetadataItem1("");
      setMetadataItem2("");
      setMetadataItem3("");
    }
  };

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setMessage(null);

    if (!selectedFile) return;

    if (selectedFile.size > maxBytes) {
      setMessage({
        type: "error",
        text: `File melebihi ${requirement.maxSizeMb} MB. Silakan unggah file ke Google Drive, lalu masukkan link Drive pada kolom alternatif.`,
      });
    }
  };

  const upload = async () => {
    setMessage(null);

    if (isMultiTextMetadata) {
      const metadataItems = [
        metadataItem1.trim(),
        metadataItem2.trim(),
        metadataItem3.trim(),
      ].filter(Boolean);

      if (metadataItems.length < 1) {
        setMessage({
          type: "error",
          text: "Minimal 1 data wajib diisi.",
        });
        return;
      }
    }

    if (needsFile && !acceptableFile && !externalUrl.trim()) {
      setMessage({
        type: "error",
        text: `File maksimal ${requirement.maxSizeMb} MB. Jika file lebih besar, isi link Google Drive sebagai pengganti upload file.`,
      });
      return;
    }

    if (fileTooLarge && externalUrl.trim() && !isGoogleDriveUrl(externalUrl)) {
      setMessage({
        type: "error",
        text: "Untuk file lebih dari 5 MB, link harus berasal dari Google Drive.",
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

    if (file && file.size <= maxBytes) {
      formData.append("file", file);
    }

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

    if (isMultiTextMetadata) {
      formData.append("metadataItem1", metadataItem1.trim());
      formData.append("metadataItem2", metadataItem2.trim());
      formData.append("metadataItem3", metadataItem3.trim());
    }

    setIsUploading(true);

    try {
      const response = await fetch("/api/dosen/documents/upload", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();

      let json: { message?: string } = {};

      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {
          message: text || "Server mengembalikan response tidak valid.",
        };
      }

      if (!response.ok) {
        setMessage({
          type: "error",
          text: json.message || "Gagal menyimpan data.",
        });
        return;
      }

      resetForm();

      setMessage({
        type: "success",
        text: json.message || "Data berhasil disimpan.",
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

  const metadataLabels = getMetadataLabels(requirement.code);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          {isMultiTextMetadata ? <Save size={19} /> : <UploadCloud size={19} />}
        </div>

        <div>
          <p className="text-sm font-black text-slate-900">
            {isMultiTextMetadata ? "Form Isian Metadata" : "Form Pengisian"}
          </p>

          <p className="text-xs font-bold text-slate-400">
            {isMultiTextMetadata
              ? "Isi minimal 1 data"
              : `Upload maksimal ${requirement.maxSizeMb} MB atau gunakan link Google Drive`}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {isMultiTextMetadata && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm font-black text-sky-900">
              {metadataLabels.title}
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-sky-700">
              {metadataLabels.helper}
            </p>
          </div>
        )}

        {isMultiTextMetadata && (
          <>
            <FieldGroup label={`${metadataLabels.label1} / Wajib`}>
              <input
                type="text"
                value={metadataItem1}
                onChange={(event) => setMetadataItem1(event.target.value)}
                placeholder={metadataLabels.placeholder1}
                className="input-industrial"
              />
            </FieldGroup>

            <FieldGroup label={`${metadataLabels.label2} / Opsional`}>
              <input
                type="text"
                value={metadataItem2}
                onChange={(event) => setMetadataItem2(event.target.value)}
                placeholder={metadataLabels.placeholder2}
                className="input-industrial"
              />
            </FieldGroup>

            <FieldGroup label={`${metadataLabels.label3} / Opsional`}>
              <input
                type="text"
                value={metadataItem3}
                onChange={(event) => setMetadataItem3(event.target.value)}
                placeholder={metadataLabels.placeholder3}
                className="input-industrial"
              />
            </FieldGroup>
          </>
        )}

        {!isMultiTextMetadata && requirement.isYearly && (
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

        {!isMultiTextMetadata && requirement.code === "SKP_TAHUNAN" && (
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

        {showDriveFallback && !needsUrl && (
          <FieldGroup
            label="Link Google Drive jika file lebih dari 5 MB"
            icon={<Link2 size={14} />}
          >
            <input
              type="url"
              value={externalUrl}
              onChange={(event) => setExternalUrl(event.target.value)}
              placeholder="https://drive.google.com/..."
              className="input-industrial"
            />

            <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
              Jika file lebih besar dari {requirement.maxSizeMb} MB, unggah file
              ke Google Drive, atur akses agar dapat dilihat, lalu tempel link
              Drive di sini.
            </p>
          </FieldGroup>
        )}

        {!isMultiTextMetadata && requirement.requiresLetterNumber && (
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

        {!isMultiTextMetadata && requirement.requiresLetterDate && (
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
                PDF, JPG, JPEG, PNG. Maksimal {requirement.maxSizeMb} MB.
              </p>

              <input
                type="file"
                accept={mimeToAccept(requirement.allowedMimeTypes)}
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] || null)
                }
                className="hidden"
              />
            </label>

            {fileTooLarge && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
                File terlalu besar dan tidak akan diupload langsung. Gunakan
                link Google Drive sebagai pengganti.
              </div>
            )}
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
          ) : isMultiTextMetadata ? (
            <>
              <Save size={17} />
              Simpan Data
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
