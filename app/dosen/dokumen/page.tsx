/** @format */

import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  UserRound,
  XCircle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import DocumentUploadClient from "@/components/dosen/DocumentUploadClient";
import DocumentVersionHistory from "@/components/documents/DocumentVersionHistory";
import FilePreviewModal from "@/components/documents/FilePreviewModal";
import type { DocumentStatus } from "@/lib/app-types";
import type { ReactNode } from "react";

const multiTextMetadataCodes = ["MATA_KULIAH_DIAMPU", "RANTING_ILMU_KEPAKARAN"];

function isMultiTextMetadataRequirement(code: string) {
  return multiTextMetadataCodes.includes(code);
}

function getMetadataItems(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  const data = metadata as {
    items?: unknown;
    metadataItems?: unknown;
  };

  const rawItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.metadataItems)
      ? data.metadataItems
      : [];

  return rawItems.map((item) => String(item || "").trim()).filter(Boolean);
}

function formatDateTime(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function percentage(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function getRequirementStatus(
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

function getCategoryProgress(
  requirements: { submissions: { status: DocumentStatus }[] }[],
) {
  if (requirements.length === 0) return 0;

  const filled = requirements.filter(
    (requirement) => requirement.submissions.length > 0,
  ).length;

  return percentage(filled, requirements.length);
}

function getCategoryTone(code: string) {
  if (code === "ANGKA_KREDIT") {
    return {
      icon: "bg-sky-100 text-sky-700",
      bar: "bg-sky-700",
      chip: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (code === "IKD") {
    return {
      icon: "bg-blue-100 text-blue-700",
      bar: "bg-blue-700",
      chip: "border-blue-200 bg-blue-50 text-blue-700",
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

function getCategoryIcon(code: string) {
  if (code === "ANGKA_KREDIT") return <GraduationCap size={25} />;
  if (code === "IKD") return <FileText size={25} />;
  if (code === "SYARAT_KHUSUS") return <ShieldCheck size={25} />;
  if (code === "DOKUMEN_REKOMENDASI") return <FileText size={25} />;
  return <UserRound size={25} />;
}

function normalizeAllowedMimeTypes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  return ["application/pdf", "image/jpeg", "image/png"];
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DosenDokumenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "DOSEN") redirect("/login");

  const lecturer = user.lecturerProfile;

  if (!lecturer) redirect("/login");

  const { q } = await searchParams;
  const query = String(q || "").trim();
  const normalizedQuery = query.toLowerCase();

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

  const allRequirements = categories.flatMap(
    (category) => category.requirements,
  );

  const allSubmissions = allRequirements.flatMap(
    (requirement) => requirement.submissions,
  );

  const totalRequirements = allRequirements.length;

  const uploadedRequirements = allRequirements.filter(
    (requirement) => requirement.submissions.length > 0,
  ).length;

  const validCount = allSubmissions.filter(
    (submission) => submission.status === "VALID",
  ).length;

  const pendingCount = allSubmissions.filter(
    (submission) => submission.status === "PENDING",
  ).length;

  const revisionCount = allSubmissions.filter(
    (submission) => submission.status === "REVISION",
  ).length;

  const rejectedCount = allSubmissions.filter(
    (submission) => submission.status === "REJECTED",
  ).length;

  const globalProgress = percentage(uploadedRequirements, totalRequirements);

  const filteredCategories = normalizedQuery
    ? categories
        .map((category) => ({
          ...category,
          requirements: category.requirements.filter((requirement) =>
            [requirement.name, requirement.description || "", category.name]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery),
          ),
        }))
        .filter((category) => category.requirements.length > 0)
    : categories;

  const filteredRequirementCount = filteredCategories.reduce(
    (sum, category) => sum + category.requirements.length,
    0,
  );

  return (
    <AppShell
      role="DOSEN"
      title="Pengisian Dokumen"
      subtitle="Lengkapi dokumen, tautan, metadata, dan bukti pendukung pengajuan jabatan akademik."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 p-6">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                Workspace Dosen
              </p>

              <h2 className="mt-2 break-words text-3xl font-black text-slate-950">
                {lecturer.fullName}
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Lengkapi seluruh dokumen wajib. File maksimal 5 MB dapat
                diunggah langsung, sedangkan file besar dapat diganti dengan
                link Google Drive.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="NIDN/NUPTK" value={lecturer.nidnOrNuptk} />
                <InfoCard label="Program Studi" value={lecturer.studyProgram} />
                <InfoCard
                  label="Jabatan Akademik"
                  value={lecturer.academicPosition}
                />
                <InfoCard
                  label="Status Dosen"
                  value={lecturer.lecturerStatus}
                />
              </div>
            </div>

            <div className="min-w-0 border-t border-slate-100 bg-slate-950 p-6 text-white xl:border-l xl:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-400">
                    Kelengkapan Dokumen
                  </p>

                  <p className="mt-2 text-5xl font-black">{globalProgress}%</p>

                  <p className="mt-2 text-sm font-semibold text-slate-400">
                    {uploadedRequirements} dari {totalRequirements} syarat sudah
                    diisi
                  </p>
                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <UploadCloud size={32} />
                </div>
              </div>

              <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                  style={{ width: `${globalProgress}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3 text-center">
                <DarkCounter label="Valid" value={validCount} />
                <DarkCounter label="Pending" value={pendingCount} />
                <DarkCounter label="Revisi" value={revisionCount} />
                <DarkCounter label="Tolak" value={rejectedCount} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricMini
            icon={<FileText size={21} />}
            label="Total Syarat"
            value={totalRequirements}
            desc="Requirement dokumen"
            tone="sky"
          />

          <MetricMini
            icon={<UploadCloud size={21} />}
            label="Terisi"
            value={uploadedRequirements}
            desc="Sudah dikirim"
            tone="violet"
          />

          <MetricMini
            icon={<CheckCircle2 size={21} />}
            label="Valid"
            value={validCount}
            desc="Diterima admin"
            tone="emerald"
          />

          <MetricMini
            icon={<RotateCcw size={21} />}
            label="Tindak Lanjut"
            value={pendingCount + revisionCount + rejectedCount}
            desc="Pending/revisi/tolak"
            tone="amber"
          />
        </section>

        {query && (
          <section className="flex flex-col gap-3 rounded-[2rem] border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold leading-6 text-sky-800">
              Menampilkan {filteredRequirementCount} dokumen untuk pencarian
              {` "${query}"`}.
            </p>

            <a
              href="/dosen/dokumen"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-sky-700 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100"
            >
              Hapus Pencarian
            </a>
          </section>
        )}

        {query && filteredCategories.length === 0 && (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h3 className="text-xl font-black text-slate-950">
              Tidak Ada Hasil Pencarian
            </h3>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Tidak ditemukan dokumen yang cocok dengan {`"${query}"`}.
            </p>
          </section>
        )}

        {filteredCategories.map((category, categoryIndex) => {
          const tone = getCategoryTone(category.code);
          const categoryProgress = getCategoryProgress(category.requirements);

          return (
            <details
              key={category.id}
              open={categoryIndex === 0}
              className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
            >
              <summary className="cursor-pointer list-none border-b border-slate-100 p-6 transition hover:bg-slate-50/80">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
                    >
                      {getCategoryIcon(category.code)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="break-words text-2xl font-black text-slate-950">
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
                  const mainStatus = getRequirementStatus(
                    requirement.submissions,
                  );

                  const isMetadataOnly = isMultiTextMetadataRequirement(
                    requirement.code,
                  );

                  return (
                    <article
                      key={requirement.id}
                      className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
                    >
                      <div className="border-b border-slate-200 bg-white p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="break-words text-lg font-black text-slate-950">
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

                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                                {isMetadataOnly
                                  ? "ISIAN TEKS"
                                  : requirement.inputType}
                              </span>

                              <StatusPill status={mainStatus} />
                            </div>

                            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                              {requirement.helperText ||
                                requirement.description}
                            </p>
                          </div>

                          <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-500">
                            {requirement.submissions.length} data
                          </div>
                        </div>
                      </div>

                      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-w-0 p-5">
                          {requirement.submissions.length === 0 ? (
                            <EmptySubmission isMetadataOnly={isMetadataOnly} />
                          ) : (
                            <div className="space-y-4">
                              {requirement.submissions.map((submission) => (
                                <div
                                  key={submission.id}
                                  className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5"
                                >
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                      <p className="break-words text-lg font-black text-slate-950">
                                        {submission.academicYear
                                          ? `${requirement.name} ${submission.academicYear}`
                                          : requirement.name}
                                      </p>

                                      {isMetadataOnly ? (
                                        <MetadataItemsDosen
                                          items={getMetadataItems(
                                            submission.metadata,
                                          )}
                                        />
                                      ) : (
                                        <>
                                          {submission.externalUrl ? (
                                            <p className="mt-2 break-all text-sm font-bold leading-6 text-sky-700">
                                              {submission.externalUrl}
                                            </p>
                                          ) : (
                                            <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-700">
                                              {submission.fileName ||
                                                "Metadata tersimpan"}
                                            </p>
                                          )}

                                          <div className="mt-4 flex flex-wrap gap-2">
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
                                                buttonLabel="Preview File"
                                              />
                                            )}

                                            {submission.externalUrl && (
                                              <a
                                                href={submission.externalUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                                              >
                                                Buka Link
                                                <ExternalLink size={16} />
                                              </a>
                                            )}
                                          </div>
                                        </>
                                      )}

                                      <div className="mt-4 flex flex-wrap gap-2">
                                        <MetaChip
                                          label="Upload"
                                          value={formatDateTime(
                                            submission.uploadedAt,
                                          )}
                                        />

                                        {submission.academicYear ? (
                                          <MetaChip
                                            label="Tahun"
                                            value={String(
                                              submission.academicYear,
                                            )}
                                          />
                                        ) : null}

                                        {submission.skpPredicate ? (
                                          <MetaChip
                                            label="Predikat"
                                            value={submission.skpPredicate}
                                          />
                                        ) : null}

                                        {submission.letterNumber ? (
                                          <MetaChip
                                            label="No. Surat"
                                            value={submission.letterNumber}
                                          />
                                        ) : null}

                                        {submission.letterDate ? (
                                          <MetaChip
                                            label="Tgl. Surat"
                                            value={formatDate(
                                              submission.letterDate,
                                            )}
                                          />
                                        ) : null}
                                      </div>
                                    </div>

                                    <StatusPill status={submission.status} />
                                  </div>

                                  {submission.adminNote && (
                                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
                                      Catatan admin: {submission.adminNote}
                                    </div>
                                  )}

                                  <DocumentVersionHistory
                                    versions={submission.versions}
                                    currentVersionNumber={
                                      submission.versionNumber
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 border-t border-slate-200 bg-white p-5 xl:border-l xl:border-t-0">
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
                              allowedMimeTypes: normalizeAllowedMimeTypes(
                                requirement.allowedMimeTypes,
                              ),
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
        })}
      </div>
    </AppShell>
  );
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words font-bold text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

function DarkCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">{label}</p>
    </div>
  );
}

function MetricMini({
  icon,
  label,
  value,
  desc,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  desc: string;
  tone: "sky" | "violet" | "emerald" | "amber";
}) {
  const styles = {
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${styles[tone]}`}
      >
        {icon}
      </div>

      <p className="text-sm font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>

      <p className="mt-2 text-sm font-semibold text-slate-500">{desc}</p>
    </article>
  );
}

function MetadataItemsDosen({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
        Belum ada metadata tersimpan.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-sky-700">
        Data yang Diisi
      </p>

      <ol className="mt-3 grid gap-2">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex min-w-0 gap-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <span className="shrink-0 font-black text-sky-700">
              {index + 1}.
            </span>
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EmptySubmission({
  isMetadataOnly = false,
}: {
  isMetadataOnly?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <CircleDashed className="mx-auto mb-3 text-slate-400" size={34} />

      <p className="font-black text-slate-700">
        {isMetadataOnly
          ? "Belum ada metadata yang dikirim"
          : "Belum ada dokumen atau tautan"}
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {isMetadataOnly
          ? "Isi minimal satu data pada form di samping untuk mengirim metadata."
          : "Unggah dokumen maksimal 5 MB atau gunakan link Google Drive jika file lebih besar."}
      </p>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-500">
      <span className="shrink-0 text-slate-400">{label}:</span>
      <span className="min-w-0 truncate">{value}</span>
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
    PENDING: <CircleDashed size={14} />,
    VALID: <CheckCircle2 size={14} />,
    REVISION: <RotateCcw size={14} />,
    REJECTED: <XCircle size={14} />,
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
        styles[status] || styles.NOT_UPLOADED
      }`}
    >
      {icons[status]}
      {labels[status] || status}
    </span>
  );
}
