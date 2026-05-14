/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  GraduationCap,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

type SearchParams = {
  q?: string;
  status?: string;
  sort?: string;
};

type LecturerStatusType =
  | "ALL"
  | "BELUM_UPLOAD"
  | "SEBAGIAN"
  | "LENGKAP"
  | "MENUNGGU_VALIDASI"
  | "PERLU_REVISI"
  | "DITOLAK"
  | "TERVERIFIKASI";

const statusFilters: {
  label: string;
  value: LecturerStatusType;
}[] = [
  { label: "Semua", value: "ALL" },
  { label: "Belum Upload", value: "BELUM_UPLOAD" },
  { label: "Sebagian", value: "SEBAGIAN" },
  { label: "Lengkap", value: "LENGKAP" },
  { label: "Menunggu Validasi", value: "MENUNGGU_VALIDASI" },
  { label: "Perlu Revisi", value: "PERLU_REVISI" },
  { label: "Ditolak", value: "DITOLAK" },
  { label: "Terverifikasi", value: "TERVERIFIKASI" },
];

const sortOptions = [
  { label: "Terbaru", value: "newest" },
  { label: "Nama A-Z", value: "name-asc" },
  { label: "Progress Tertinggi", value: "progress-desc" },
  { label: "Progress Terendah", value: "progress-asc" },
  { label: "Paling Banyak Revisi", value: "revision-desc" },
];

function percentage(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function buildQuery(params: SearchParams, patch: SearchParams) {
  const search = new URLSearchParams();

  const merged = {
    ...params,
    ...patch,
  };

  if (merged.q) search.set("q", merged.q);
  if (merged.status && merged.status !== "ALL")
    search.set("status", merged.status);
  if (merged.sort && merged.sort !== "newest") search.set("sort", merged.sort);

  const query = search.toString();

  return query ? `/admin/dosen?${query}` : "/admin/dosen";
}

function resolveLecturerStatus({
  uploadedRequired,
  totalRequired,
  validRequired,
  hasPending,
  hasRevision,
  hasRejected,
}: {
  uploadedRequired: number;
  totalRequired: number;
  validRequired: number;
  hasPending: boolean;
  hasRevision: boolean;
  hasRejected: boolean;
}): LecturerStatusType {
  if (uploadedRequired === 0) return "BELUM_UPLOAD";
  if (hasRejected) return "DITOLAK";
  if (hasRevision) return "PERLU_REVISI";
  if (validRequired >= totalRequired && totalRequired > 0)
    return "TERVERIFIKASI";
  if (hasPending) return "MENUNGGU_VALIDASI";
  if (uploadedRequired >= totalRequired) return "LENGKAP";
  return "SEBAGIAN";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function AdminDosenPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};

  const q = (params.q || "").toLowerCase().trim();
  const selectedStatus = (params.status || "ALL") as LecturerStatusType;
  const selectedSort = params.sort || "newest";

  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const requiredRequirements = await prisma.documentRequirement.findMany({
    where: {
      isRequired: true,
      audience: {
        in: ["DOSEN", "BOTH"],
      },
    },
    select: {
      id: true,
    },
  });

  const totalRequired = requiredRequirements.length;
  const requiredIds = new Set(requiredRequirements.map((item) => item.id));

  const lecturers = await prisma.lecturerProfile.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: true,
      submissions: {
        include: {
          requirement: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          uploadedAt: "desc",
        },
      },
    },
  });

  const lecturerRows = lecturers.map((lecturer) => {
    const requiredSubmissions = lecturer.submissions.filter((item) =>
      requiredIds.has(item.requirementId),
    );

    const uploadedRequiredIds = new Set(
      requiredSubmissions.map((item) => item.requirementId),
    );

    const validRequiredIds = new Set(
      requiredSubmissions
        .filter((item) => item.status === "VALID")
        .map((item) => item.requirementId),
    );

    const valid = lecturer.submissions.filter(
      (item) => item.status === "VALID",
    ).length;
    const pending = lecturer.submissions.filter(
      (item) => item.status === "PENDING",
    ).length;
    const revision = lecturer.submissions.filter(
      (item) => item.status === "REVISION",
    ).length;
    const rejected = lecturer.submissions.filter(
      (item) => item.status === "REJECTED",
    ).length;

    const hasPending = pending > 0;
    const hasRevision = revision > 0;
    const hasRejected = rejected > 0;

    const uploadedRequired = uploadedRequiredIds.size;
    const validRequired = validRequiredIds.size;

    const progress = percentage(uploadedRequired, totalRequired);

    const resolvedStatus = resolveLecturerStatus({
      uploadedRequired,
      totalRequired,
      validRequired,
      hasPending,
      hasRevision,
      hasRejected,
    });

    const searchableText = [
      lecturer.fullName,
      lecturer.nidnOrNuptk,
      lecturer.studyProgram,
      lecturer.academicPosition,
      lecturer.lecturerStatus,
      lecturer.institution,
      lecturer.user.email,
    ]
      .join(" ")
      .toLowerCase();

    return {
      lecturer,
      progress,
      uploadedRequired,
      totalRequired,
      valid,
      pending,
      revision,
      rejected,
      resolvedStatus,
      searchableText,
      lastUpload: lecturer.submissions[0]?.uploadedAt || null,
    };
  });

  const filteredRows = lecturerRows
    .filter((row) => {
      const matchSearch = q ? row.searchableText.includes(q) : true;
      const matchStatus =
        selectedStatus === "ALL" ? true : row.resolvedStatus === selectedStatus;

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (selectedSort === "name-asc") {
        return a.lecturer.fullName.localeCompare(b.lecturer.fullName);
      }

      if (selectedSort === "progress-desc") {
        return b.progress - a.progress;
      }

      if (selectedSort === "progress-asc") {
        return a.progress - b.progress;
      }

      if (selectedSort === "revision-desc") {
        return b.revision - a.revision;
      }

      return b.lecturer.createdAt.getTime() - a.lecturer.createdAt.getTime();
    });

  const totalLecturers = lecturerRows.length;
  const totalSubmissions = lecturerRows.reduce(
    (acc, row) => acc + row.lecturer.submissions.length,
    0,
  );
  const totalValid = lecturerRows.reduce((acc, row) => acc + row.valid, 0);
  const totalPending = lecturerRows.reduce((acc, row) => acc + row.pending, 0);
  const totalRevision = lecturerRows.reduce(
    (acc, row) => acc + row.revision,
    0,
  );
  const totalRejected = lecturerRows.reduce(
    (acc, row) => acc + row.rejected,
    0,
  );

  const verifiedLecturers = lecturerRows.filter(
    (row) => row.resolvedStatus === "TERVERIFIKASI",
  ).length;

  const averageProgress =
    totalLecturers > 0
      ? Math.round(
          lecturerRows.reduce((acc, row) => acc + row.progress, 0) /
            totalLecturers,
        )
      : 0;

  return (
    <AppShell
      role="ADMIN"
      title="Daftar Dosen"
      subtitle="Pantau kelengkapan dokumen, status validasi, dan prioritas pemeriksaan dosen."
    >
      <div className="space-y-6">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <MetricBox
            icon={<UsersRound size={22} />}
            label="Total Dosen"
            value={totalLecturers}
            desc="Akun dosen terdaftar"
            tone="sky"
          />
          <MetricBox
            icon={<FileText size={22} />}
            label="Dokumen Masuk"
            value={totalSubmissions}
            desc="File/link/metadata"
            tone="violet"
          />
          <MetricBox
            icon={<CheckCircle2 size={22} />}
            label="Terverifikasi"
            value={verifiedLecturers}
            desc="Dosen lengkap valid"
            tone="emerald"
          />
          <MetricBox
            icon={<RotateCcw size={22} />}
            label="Perlu Revisi"
            value={totalRevision}
            desc="Dokumen dikembalikan"
            tone="amber"
          />
          <MetricBox
            icon={<TrendingUp size={22} />}
            label="Rata-rata Progress"
            value={`${averageProgress}%`}
            desc="Kelengkapan dokumen"
            tone="slate"
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
            <div className="p-6">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                Admin Monitoring
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Kelengkapan Dokumen Dosen
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Gunakan pencarian dan filter untuk menemukan dosen yang belum
                upload, sedang menunggu validasi, perlu revisi, ditolak, atau
                sudah terverifikasi.
              </p>
            </div>

            <div className="border-t border-slate-100 bg-slate-950 p-6 text-white xl:border-l xl:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-400">
                    Verification Queue
                  </p>
                  <p className="mt-2 text-5xl font-black">
                    {totalPending + totalRevision}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-400">
                    dokumen butuh perhatian admin
                  </p>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <ShieldCheck size={32} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
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
                Filter Dosen
              </div>

              <p className="text-sm leading-6 text-slate-500">
                Cari dosen berdasarkan nama, email, NIDN/NUPTK, program studi,
                atau jabatan akademik.
              </p>
            </div>

            <form className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
              <div className="relative min-w-[320px]">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  name="q"
                  defaultValue={params.q || ""}
                  placeholder="Cari nama, email, NIDN, prodi..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>

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

              <select
                name="sort"
                defaultValue={selectedSort}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                {sortOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                Terapkan
              </button>

              <Link
                href="/admin/dosen"
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

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-950">
                  Monitoring Dosen
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Menampilkan {filteredRows.length} dari {totalLecturers} dosen.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                Total syarat wajib: {totalRequired}
              </div>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="p-10 text-center">
              <AlertCircle className="mx-auto mb-4 text-slate-400" size={40} />
              <h3 className="text-xl font-black text-slate-950">
                Tidak ada dosen yang cocok
              </h3>
              <p className="mx-auto mt-2 max-w-xl leading-7 text-slate-500">
                Coba ubah kata kunci pencarian, filter status, atau reset
                filter.
              </p>

              <Link
                href="/admin/dosen"
                className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
              >
                Reset Filter
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="p-5">Dosen</th>
                    <th className="p-5">Akademik</th>
                    <th className="p-5">Progress</th>
                    <th className="p-5">Status Sistem</th>
                    <th className="p-5">Dokumen</th>
                    <th className="p-5">Aktivitas</th>
                    <th className="p-5">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.lecturer.id}
                      className="border-t border-slate-100 align-top transition hover:bg-slate-50/80"
                    >
                      <td className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                            <UserRoundCheck size={23} />
                          </div>

                          <div>
                            <p className="font-black text-slate-950">
                              {row.lecturer.fullName}
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-400">
                              {row.lecturer.user.email}
                            </p>

                            <p className="mt-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                              NIDN/NUPTK: {row.lecturer.nidnOrNuptk}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-5">
                        <p className="font-black text-slate-800">
                          {row.lecturer.studyProgram}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {row.lecturer.academicPosition}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {row.lecturer.lecturerStatus}
                        </p>
                      </td>

                      <td className="p-5">
                        <div className="w-56">
                          <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                            <span>
                              {row.uploadedRequired}/{row.totalRequired} wajib
                            </span>
                            <span>{row.progress}%</span>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${
                                row.progress >= 100
                                  ? "bg-emerald-600"
                                  : row.progress >= 60
                                    ? "bg-sky-700"
                                    : row.progress > 0
                                      ? "bg-amber-500"
                                      : "bg-slate-400"
                              }`}
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-5">
                        <LecturerStatusBadge status={row.resolvedStatus} />
                      </td>

                      <td className="p-5">
                        <div className="flex flex-wrap gap-2">
                          <MiniStatus
                            label="Valid"
                            value={row.valid}
                            tone="green"
                          />
                          <MiniStatus
                            label="Pending"
                            value={row.pending}
                            tone="amber"
                          />
                          <MiniStatus
                            label="Revisi"
                            value={row.revision}
                            tone="sky"
                          />
                          <MiniStatus
                            label="Tolak"
                            value={row.rejected}
                            tone="red"
                          />
                        </div>
                      </td>

                      <td className="p-5">
                        <p className="font-bold text-slate-700">
                          {row.lastUpload
                            ? `Upload terakhir ${formatDate(row.lastUpload)}`
                            : "Belum ada upload"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          Terdaftar {formatDate(row.lecturer.createdAt)}
                        </p>
                      </td>

                      <td className="p-5">
                        <Link
                          href={`/admin/dosen/${row.lecturer.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-slate-800"
                        >
                          Detail
                          <ArrowRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function MetricBox({
  icon,
  label,
  value,
  desc,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  desc: string;
  tone: "sky" | "violet" | "emerald" | "amber" | "slate";
}) {
  const styles = {
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <article className="group rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl">
      <div
        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:rotate-6 group-hover:scale-110 ${styles[tone]}`}
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

function DarkCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">{label}</p>
    </div>
  );
}

function MiniStatus({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "sky" | "red";
}) {
  const styles = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${styles[tone]}`}
    >
      {label}: {value}
    </span>
  );
}

function LecturerStatusBadge({ status }: { status: LecturerStatusType }) {
  const styles: Record<LecturerStatusType, string> = {
    ALL: "border-slate-200 bg-slate-50 text-slate-700",
    BELUM_UPLOAD: "border-slate-200 bg-slate-50 text-slate-700",
    SEBAGIAN: "border-amber-200 bg-amber-50 text-amber-700",
    LENGKAP: "border-sky-200 bg-sky-50 text-sky-700",
    MENUNGGU_VALIDASI: "border-amber-200 bg-amber-50 text-amber-700",
    PERLU_REVISI: "border-sky-200 bg-sky-50 text-sky-700",
    DITOLAK: "border-red-200 bg-red-50 text-red-700",
    TERVERIFIKASI: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  const labels: Record<LecturerStatusType, string> = {
    ALL: "Semua",
    BELUM_UPLOAD: "Belum Upload",
    SEBAGIAN: "Sebagian",
    LENGKAP: "Lengkap",
    MENUNGGU_VALIDASI: "Menunggu Validasi",
    PERLU_REVISI: "Perlu Revisi",
    DITOLAK: "Ditolak",
    TERVERIFIKASI: "Terverifikasi",
  };

  const icons: Record<LecturerStatusType, ReactNode> = {
    ALL: <FileText size={14} />,
    BELUM_UPLOAD: <AlertCircle size={14} />,
    SEBAGIAN: <Clock3 size={14} />,
    LENGKAP: <FileText size={14} />,
    MENUNGGU_VALIDASI: <Clock3 size={14} />,
    PERLU_REVISI: <RotateCcw size={14} />,
    DITOLAK: <XCircle size={14} />,
    TERVERIFIKASI: <CheckCircle2 size={14} />,
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${styles[status]}`}
    >
      {icons[status]}
      {labels[status]}
    </span>
  );
}
