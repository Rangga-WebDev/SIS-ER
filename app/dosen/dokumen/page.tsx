/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import DocumentUploadClient from "@/components/dosen/DocumentUploadClient";
import DocumentVersionHistory from "@/components/documents/DocumentVersionHistory";
import FilePreviewModal from "@/components/documents/FilePreviewModal";

import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  RotateCcw,
  Search,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import type { DocumentStatus } from "@prisma/client";
import type { ReactNode } from "react";

type SearchParams = {
  status?: string;
  category?: string;
  q?: string;
};

const statusFilters = [
  { label: "Semua", value: "ALL" },
  { label: "Belum Upload", value: "NOT_UPLOADED" },
  { label: "Menunggu", value: "PENDING" },
  { label: "Valid", value: "VALID" },
  { label: "Revisi", value: "REVISION" },
  { label: "Ditolak", value: "REJECTED" },
];

function getCategoryIcon(code: string) {
  if (code === "ANGKA_KREDIT") return <Award size={25} />;
  if (code === "SYARAT_KHUSUS") return <ShieldCheck size={25} />;
  if (code === "DOKUMEN_REKOMENDASI") return <FileCheck2 size={25} />;
  return <BookOpenCheck size={25} />;
}

function getCategoryTone(code: string) {
  if (code === "ANGKA_KREDIT") {
    return {
      icon: "bg-sky-100 text-sky-700",
      bar: "bg-sky-700",
      chip: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (code === "SYARAT_KHUSUS") {
    return {
      icon: "bg-violet-100 text-violet-700",
      bar: "bg-violet-700",
      chip: "border-violet-200 bg-violet-50 text-violet-700",
    };
  }

  if (code === "DOKUMEN_REKOMENDASI") {
    return {
      icon: "bg-emerald-100 text-emerald-700",
      bar: "bg-emerald-700",
      chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    icon: "bg-slate-100 text-slate-700",
    bar: "bg-slate-700",
    chip: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

function getSubmissionMainStatus(
  submissions: { status: DocumentStatus }[],
): DocumentStatus | "NOT_UPLOADED" {
  if (submissions.length === 0) return "NOT_UPLOADED";

  if (submissions.some((item) => item.status === "REJECTED")) {
    return "REJECTED";
  }

  if (submissions.some((item) => item.status === "REVISION")) {
    return "REVISION";
  }

  if (submissions.some((item) => item.status === "PENDING")) {
    return "PENDING";
  }

  if (submissions.every((item) => item.status === "VALID")) {
    return "VALID";
  }

  return submissions[0]?.status || "PENDING";
}

function calculateProgress(
  items: { submissions: { status: DocumentStatus }[] }[],
) {
  if (items.length === 0) return 0;

  const uploaded = items.filter((item) => item.submissions.length > 0).length;

  return Math.round((uploaded / items.length) * 100);
}

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function buildQuery(params: SearchParams, patch: SearchParams) {
  const search = new URLSearchParams();

  const merged = {
    ...params,
    ...patch,
  };

  if (merged.status && merged.status !== "ALL") {
    search.set("status", merged.status);
  }

  if (merged.category && merged.category !== "ALL") {
    search.set("category", merged.category);
  }

  if (merged.q) {
    search.set("q", merged.q);
  }

  const query = search.toString();

  return query ? `/dosen/dokumen?${query}` : "/dosen/dokumen";
}

export default async function DosenDokumenPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};

  const selectedStatus = params.status || "ALL";
  const selectedCategory = params.category || "ALL";
  const keyword = (params.q || "").toLowerCase().trim();

  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "DOSEN") redirect("/login");

  const lecturer = user.lecturerProfile;

  if (!lecturer) redirect("/login");

  const categories = await prisma.documentCategory.findMany({
    orderBy: {
      order: "asc",
    },
    include: {
      requirements: {
        where: {
          audience: {
            in: ["DOSEN", "BOTH"],
          },
        },
        orderBy: {
          order: "asc",
        },
        include: {
          submissions: {
            where: {
              lecturerId: lecturer.id,
            },
            orderBy: [
              {
                academicYear: "desc",
              },
              {
                uploadedAt: "desc",
              },
            ],
            include: {
              versions: {
                orderBy: {
                  versionNumber: "desc",
                },
              },
            },
          },
        },
      },
    },
  });

  const totalRequirement = categories.reduce(
    (acc, category) => acc + category.requirements.length,
    0,
  );

  const totalUploaded = categories.reduce((acc, category) => {
    return (
      acc +
      category.requirements.filter(
        (requirement) => requirement.submissions.length > 0,
      ).length
    );
  }, 0);

  const totalValid = categories.reduce((acc, category) => {
    return (
      acc +
      category.requirements.filter((requirement) => {
        const status = getSubmissionMainStatus(requirement.submissions);
        return status === "VALID";
      }).length
    );
  }, 0);

  const totalRevision = categories.reduce((acc, category) => {
    return (
      acc +
      category.requirements.filter((requirement) => {
        const status = getSubmissionMainStatus(requirement.submissions);
        return status === "REVISION";
      }).length
    );
  }, 0);

  const totalPending = categories.reduce((acc, category) => {
    return (
      acc +
      category.requirements.filter((requirement) => {
        const status = getSubmissionMainStatus(requirement.submissions);
        return status === "PENDING";
      }).length
    );
  }, 0);

  const totalRejected = categories.reduce((acc, category) => {
    return (
      acc +
      category.requirements.filter((requirement) => {
        const status = getSubmissionMainStatus(requirement.submissions);
        return status === "REJECTED";
      }).length
    );
  }, 0);

  const globalProgress =
    totalRequirement > 0
      ? Math.round((totalUploaded / totalRequirement) * 100)
      : 0;

  const filteredCategories = categories
    .filter((category) => {
      if (selectedCategory === "ALL") return true;
      return category.code === selectedCategory;
    })
    .map((category) => {
      const requirements = category.requirements.filter((requirement) => {
        const status = getSubmissionMainStatus(requirement.submissions);

        const matchStatus =
          selectedStatus === "ALL" ? true : status === selectedStatus;

        const matchKeyword = keyword
          ? [
              category.name,
              category.code,
              requirement.name,
              requirement.code,
              requirement.description || "",
              requirement.helperText || "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(keyword)
          : true;

        return matchStatus && matchKeyword;
      });

      return {
        ...category,
        requirements,
      };
    })
    .filter((category) => category.requirements.length > 0);

  return (
    <AppShell
      role="DOSEN"
      title="Upload Dokumen"
      subtitle="Kelola seluruh dokumen kenaikan jabatan dalam satu workspace terpusat."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                Document Center
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Pusat Upload Dokumen Dosen
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Semua kategori dokumen ditampilkan dalam satu halaman. Gunakan
                filter untuk menemukan dokumen, upload file, simpan link profil,
                isi tahun SKP, dan lengkapi metadata surat.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryBox
                  icon={<FileText size={20} />}
                  label="Total Syarat"
                  value={totalRequirement}
                />
                <SummaryBox
                  icon={<UploadCloud size={20} />}
                  label="Terisi"
                  value={totalUploaded}
                />
                <SummaryBox
                  icon={<CheckCircle2 size={20} />}
                  label="Valid"
                  value={totalValid}
                />
                <SummaryBox
                  icon={<RotateCcw size={20} />}
                  label="Revisi"
                  value={totalRevision}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-950 p-6 text-white xl:border-l xl:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-400">
                    Completion Rate
                  </p>
                  <p className="mt-2 text-5xl font-black">{globalProgress}%</p>
                  <p className="mt-2 text-sm font-semibold text-slate-400">
                    {totalUploaded} dari {totalRequirement} syarat sudah terisi
                  </p>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <CheckCircle2 size={32} />
                </div>
              </div>

              <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                  style={{ width: `${globalProgress}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <DarkCounter label="Pending" value={totalPending} />
                <DarkCounter label="Revisi" value={totalRevision} />
                <DarkCounter label="Ditolak" value={totalRejected} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-sky-700">
                <Filter size={17} />
                Filter Dokumen
              </div>

              <p className="text-sm leading-6 text-slate-500">
                Gunakan filter untuk mempersingkat tampilan dokumen yang
                panjang.
              </p>
            </div>

            <form className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
              <div className="relative min-w-[280px]">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  name="q"
                  defaultValue={params.q || ""}
                  placeholder="Cari dokumen, kategori, atau syarat..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <select
                name="category"
                defaultValue={selectedCategory}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.code}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                name="status"
                defaultValue={selectedStatus}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                {statusFilters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                Terapkan
              </button>

              <Link
                href="/dosen/dokumen"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </Link>
            </form>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {statusFilters.map((item) => {
              const active = selectedStatus === item.value;

              return (
                <Link
                  key={item.value}
                  href={buildQuery(params, { status: item.value })}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                    active
                      ? "border-sky-300 bg-sky-700 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>

        {filteredCategories.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <CircleDashed className="mx-auto mb-4 text-slate-400" size={38} />
            <h3 className="text-xl font-black text-slate-950">
              Tidak ada dokumen yang cocok
            </h3>
            <p className="mx-auto mt-2 max-w-xl leading-7 text-slate-500">
              Coba ubah filter status, kategori, atau kata kunci pencarian.
            </p>
            <Link
              href="/dosen/dokumen"
              className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
            >
              Reset Filter
            </Link>
          </section>
        ) : (
          filteredCategories.map((category, categoryIndex) => {
            const tone = getCategoryTone(category.code);
            const categoryProgress = calculateProgress(category.requirements);

            return (
              <details
                key={category.id}
                open={categoryIndex === 0 || selectedCategory !== "ALL"}
                className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
              >
                <summary className="cursor-pointer list-none border-b border-slate-100 p-6 transition hover:bg-slate-50/80">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
                      >
                        {getCategoryIcon(category.code)}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-black text-slate-950">
                            {category.name}
                          </h2>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${tone.chip}`}
                          >
                            {category.requirements.length} item
                          </span>
                        </div>

                        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
                          {category.description}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-[240px] rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-500">
                        <span>Kelengkapan</span>
                        <span>{categoryProgress}%</span>
                      </div>

                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${tone.bar}`}
                          style={{ width: `${categoryProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </summary>

                <div className="grid gap-4 p-6">
                  {category.requirements.map((requirement) => {
                    const mainStatus = getSubmissionMainStatus(
                      requirement.submissions,
                    );

                    return (
                      <article
                        key={requirement.id}
                        className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
                      >
                        <div className="grid gap-0 xl:grid-cols-[1fr_330px]">
                          <div className="p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="text-lg font-black text-slate-950">
                                    {requirement.name}
                                  </h3>

                                  {requirement.isRequired ? (
                                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                                      Wajib
                                    </span>
                                  ) : (
                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                                      Opsional
                                    </span>
                                  )}

                                  {requirement.isYearly && (
                                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                                      Tahunan
                                    </span>
                                  )}

                                  <StatusPill status={mainStatus} />
                                </div>

                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                  {requirement.description}
                                </p>

                                {requirement.helperText && (
                                  <p className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-500">
                                    {requirement.helperText}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3">
                              {requirement.submissions.length > 0 ? (
                                requirement.submissions.map((submission) => (
                                  <div
                                    key={submission.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                  >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                      <div>
                                        <p className="font-black text-slate-900">
                                          {submission.academicYear
                                            ? `${requirement.name} ${submission.academicYear}`
                                            : requirement.name}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                          {submission.fileName ||
                                            submission.externalUrl ||
                                            "Metadata tersimpan"}
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                          <MetaChip
                                            label="Upload"
                                            value={formatDateTime(
                                              submission.uploadedAt,
                                            )}
                                          />

                                          {submission.fileSize && (
                                            <MetaChip
                                              label="Ukuran"
                                              value={formatFileSize(
                                                submission.fileSize,
                                              )}
                                            />
                                          )}

                                          {submission.academicYear && (
                                            <MetaChip
                                              label="Tahun"
                                              value={String(
                                                submission.academicYear,
                                              )}
                                            />
                                          )}

                                          {submission.skpPredicate && (
                                            <MetaChip
                                              label="Predikat"
                                              value={submission.skpPredicate}
                                            />
                                          )}

                                          {submission.letterNumber && (
                                            <MetaChip
                                              label="No Surat"
                                              value={submission.letterNumber}
                                            />
                                          )}

                                          {submission.letterDate && (
                                            <MetaChip
                                              label="Tgl Surat"
                                              value={formatDate(
                                                submission.letterDate,
                                              )}
                                            />
                                          )}
                                        </div>

                                        {submission.adminNote && (
                                          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800">
                                            Catatan admin:{" "}
                                            {submission.adminNote}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        <StatusPill
                                          status={submission.status}
                                        />

                                        {submission.storagePath && (
                                          <FilePreviewModal
                                            title={
                                              submission.academicYear
                                                ? `${requirement.name} ${submission.academicYear}`
                                                : requirement.name
                                            }
                                            fileName={submission.fileName}
                                            mimeType={submission.mimeType}
                                            previewUrl={`/api/files/${submission.id}`}
                                            downloadUrl={`/api/files/${submission.id}?download=1`}
                                          />
                                        )}

                                        {submission.externalUrl && (
                                          <a
                                            href={submission.externalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                                          >
                                            Buka Link
                                          </a>
                                        )}
                                      </div>
                                      <DocumentVersionHistory
                                        versions={submission.versions}
                                        currentVersionNumber={
                                          submission.versionNumber
                                        }
                                      />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm font-bold text-slate-500">
                                  Belum ada data yang disimpan untuk syarat ini.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-slate-200 bg-white p-5 xl:border-l xl:border-t-0">
                            <DocumentUploadClient
                              requirement={{
                                id: requirement.id,
                                code: requirement.code,
                                name: requirement.name,
                                inputType: requirement.inputType,
                                isYearly: requirement.isYearly,
                                yearStart: requirement.yearStart,
                                yearEnd: requirement.yearEnd,
                                maxSizeMb: requirement.maxSizeMb,
                                requiresLetterNumber:
                                  requirement.requiresLetterNumber,
                                requiresLetterDate:
                                  requirement.requiresLetterDate,
                                requiresExternalUrl:
                                  requirement.requiresExternalUrl,
                                allowedMimeTypes: requirement.allowedMimeTypes,
                              }}
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </details>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

function SummaryBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm">
        {icon}
      </div>

      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
    </div>
  );
}

function DarkCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">{label}</p>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
      <span className="text-slate-400">{label}:</span> {value}
    </span>
  );
}

function StatusPill({ status }: { status: DocumentStatus | "NOT_UPLOADED" }) {
  const styles: Record<string, string> = {
    NOT_UPLOADED: "border-slate-200 bg-slate-50 text-slate-600",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    VALID: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REVISION: "border-sky-200 bg-sky-50 text-sky-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700",
  };

  const labels: Record<string, string> = {
    NOT_UPLOADED: "Belum Upload",
    PENDING: "Menunggu",
    VALID: "Valid",
    REVISION: "Revisi",
    REJECTED: "Ditolak",
  };

  const icons: Record<string, ReactNode> = {
    NOT_UPLOADED: <CircleDashed size={14} />,
    PENDING: <Clock3 size={14} />,
    VALID: <CheckCircle2 size={14} />,
    REVISION: <RotateCcw size={14} />,
    REJECTED: <XCircle size={14} />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
        styles[status] || styles.NOT_UPLOADED
      }`}
    >
      {icons[status]}
      {labels[status] || status}
    </span>
  );
}
