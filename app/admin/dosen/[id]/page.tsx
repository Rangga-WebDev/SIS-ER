/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import VerifySubmissionForm from "@/components/admin/VerifySubmissionForm";
import DocumentVersionHistory from "@/components/documents/DocumentVersionHistory";
import FilePreviewModal from "@/components/documents/FilePreviewModal";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Hash,
  Link2,
  Mail,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  UserRound,
  XCircle,
} from "lucide-react";
import type { DocumentStatus } from "@prisma/client";
import type { ReactNode } from "react";

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date?: Date | null) {
  if (!date) return "-";

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

function percentage(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function getCategoryProgress(
  requirements: { submissions: { status: DocumentStatus }[] }[],
) {
  if (requirements.length === 0) return 0;

  const uploaded = requirements.filter(
    (requirement) => requirement.submissions.length > 0,
  ).length;

  return Math.round((uploaded / requirements.length) * 100);
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

function getCategoryIcon(code: string) {
  if (code === "ANGKA_KREDIT") return <GraduationCap size={25} />;
  if (code === "SYARAT_KHUSUS") return <ShieldCheck size={25} />;
  if (code === "DOKUMEN_REKOMENDASI") return <FileText size={25} />;
  return <UserRound size={25} />;
}

export default async function AdminDosenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const lecturer = await prisma.lecturerProfile.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
    },
  });

  if (!lecturer) redirect("/admin/dosen");

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
              verificationLogs: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 5,
              },
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

  return (
    <AppShell
      role="ADMIN"
      title={lecturer.fullName}
      subtitle="Detail dokumen dosen, metadata pengajuan, preview file, dan verifikasi admin."
    >
      <div className="space-y-6">
        <Link
          href="/admin/dosen"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Kembali ke Daftar Dosen
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-sky-700">
                    <UserRound size={32} />
                  </div>

                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                      Profil Dosen
                    </p>

                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                      {lecturer.fullName}
                    </h2>

                    <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500">
                      <Mail size={16} />
                      {lecturer.user.email}
                    </p>
                  </div>
                </div>

                <LecturerStatusBox
                  documentStatus={lecturer.documentStatus}
                  verificationStatus={lecturer.verificationStatus}
                />
              </div>

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

            <div className="border-t border-slate-100 bg-slate-950 p-6 text-white xl:border-l xl:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-400">
                    Completion Rate
                  </p>

                  <p className="mt-2 text-5xl font-black">{globalProgress}%</p>

                  <p className="mt-2 text-sm font-semibold text-slate-400">
                    {uploadedRequirements} dari {totalRequirements} syarat sudah
                    diisi
                  </p>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <ShieldCheck size={32} />
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
            desc="Sudah dikirim dosen"
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

        {categories.map((category, categoryIndex) => {
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
                          {category.requirements.length} syarat
                        </span>
                      </div>

                      <p className="mt-2 max-w-3xl leading-7 text-slate-600">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-[240px] rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm font-bold text-slate-500">
                      <span>Progress Kategori</span>
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
                      <div className="border-b border-slate-200 bg-white p-5">
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

                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                                {requirement.inputType}
                              </span>

                              <StatusPill status={mainStatus} />
                            </div>

                            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                              {requirement.description}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-500">
                            {requirement.submissions.length} data
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 p-5">
                        {requirement.submissions.length === 0 ? (
                          <EmptyRequirement />
                        ) : (
                          requirement.submissions.map((submission) => (
                            <div
                              key={submission.id}
                              className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
                            >
                              <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
                                <div className="p-5">
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                      <p className="text-lg font-black text-slate-950">
                                        {submission.academicYear
                                          ? `${requirement.name} ${submission.academicYear}`
                                          : requirement.name}
                                      </p>

                                      <p className="mt-1 text-sm font-semibold text-slate-500">
                                        Dikirim pada{" "}
                                        {formatDateTime(submission.uploadedAt)}
                                      </p>
                                    </div>

                                    <StatusPill status={submission.status} />
                                  </div>

                                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                                    <MetaCard
                                      icon={<FileText size={16} />}
                                      label="Nama File"
                                      value={submission.fileName || "-"}
                                    />

                                    <MetaCard
                                      icon={<FileText size={16} />}
                                      label="Ukuran File"
                                      value={formatFileSize(
                                        submission.fileSize,
                                      )}
                                    />

                                    <MetaCard
                                      icon={<CalendarDays size={16} />}
                                      label="Tahun SKP"
                                      value={
                                        submission.academicYear
                                          ? String(submission.academicYear)
                                          : "-"
                                      }
                                    />

                                    <MetaCard
                                      icon={<CheckCircle2 size={16} />}
                                      label="Predikat SKP"
                                      value={submission.skpPredicate || "-"}
                                    />

                                    <MetaCard
                                      icon={<Hash size={16} />}
                                      label="Nomor Surat"
                                      value={submission.letterNumber || "-"}
                                    />

                                    <MetaCard
                                      icon={<CalendarDays size={16} />}
                                      label="Tanggal Surat"
                                      value={formatDate(submission.letterDate)}
                                    />

                                    <MetaCard
                                      icon={<Link2 size={16} />}
                                      label="Tautan Eksternal"
                                      value={submission.externalUrl || "-"}
                                      wide
                                    />
                                  </div>

                                  {submission.adminNote && (
                                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
                                      Catatan admin terakhir:{" "}
                                      {submission.adminNote}
                                    </div>
                                  )}

                                  <div className="mt-5 flex flex-wrap gap-3">
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

                                  <DocumentVersionHistory
                                    versions={submission.versions}
                                    currentVersionNumber={
                                      submission.versionNumber
                                    }
                                  />

                                  <VerificationTimeline
                                    logs={submission.verificationLogs}
                                  />
                                </div>

                                <div className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
                                  <VerifySubmissionForm
                                    submissionId={submission.id}
                                    currentStatus={
                                      submission.status === "NOT_UPLOADED"
                                        ? undefined
                                        : submission.status
                                    }
                                    currentNote={submission.adminNote}
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
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

function LecturerStatusBox({
  documentStatus,
  verificationStatus,
}: {
  documentStatus: string;
  verificationStatus: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Dokumen
        </p>
        <p className="mt-1 font-black text-slate-900">{documentStatus}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Verifikasi
        </p>
        <p className="mt-1 font-black text-slate-900">{verificationStatus}</p>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-bold text-slate-900">{value || "-"}</p>
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

function MetaCard({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
        {icon}
        {label}
      </div>

      <p className="break-words text-sm font-bold text-slate-700">{value}</p>
    </div>
  );
}

function EmptyRequirement() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <CircleDashed className="mx-auto mb-3 text-slate-400" size={34} />

      <p className="font-black text-slate-700">
        Belum ada dokumen atau metadata
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Dosen belum mengirim data untuk syarat ini. Setelah dosen upload atau
        mengisi link/metadata, admin dapat memverifikasi dari halaman ini.
      </p>
    </div>
  );
}

function VerificationTimeline({
  logs,
}: {
  logs: {
    id: string;
    status: DocumentStatus;
    note: string | null;
    reviewerEmail: string | null;
    createdAt: Date;
  }[];
}) {
  if (logs.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <MessageSquareText size={18} />
          Belum ada riwayat verifikasi.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-slate-500">
        Riwayat Verifikasi
      </p>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <StatusPill status={log.status} />

              <p className="text-xs font-bold text-slate-400">
                {formatDateTime(log.createdAt)}
              </p>
            </div>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              {log.note || "Tidak ada catatan."}
            </p>

            <p className="mt-2 text-xs font-black text-slate-400">
              Reviewer: {log.reviewerEmail || "-"}
            </p>
          </div>
        ))}
      </div>
    </div>
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
        styles[status] || styles.NOT_UPLOADED
      }`}
    >
      {icons[status]}
      {labels[status] || status}
    </span>
  );
}
