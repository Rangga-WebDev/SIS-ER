/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import Pagination from "@/components/ui/Pagination";
import { getPageCount, getPagination } from "@/lib/pagination";
import { getStatusBadgeClass, getStatusLabel } from "@/lib/dupak-workflow";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  RotateCcw,
  Search,
  UsersRound,
  XCircle,
} from "lucide-react";

type DupakLite = {
  id: string;
  status: string;
  completionPercent: number;
  currentStep: number;
  submittedAt: Date | null;
  updatedAt: Date;
};

type LecturerWithDupak = {
  id: string;
  fullName: string;
  nidnOrNuptk: string;
  studyProgram: string;
  academicPosition: string;
  user: {
    email: string;
  };
  dupakSubmissions: DupakLite | null;
};

function statusLabel(status?: string | null) {
  if (!status) return "Belum Mengisi";
  return getStatusLabel(status);
}

function statusStyle(status?: string | null) {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-600";
  return getStatusBadgeClass(status);
}

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function AdminDupakPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const query = String(params.q || "").trim();
  const { page, pageSize, skip } = getPagination(params);

  const lecturerWhere = (
    query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" as const } },
            { nidnOrNuptk: { contains: query, mode: "insensitive" as const } },
            { studyProgram: { contains: query, mode: "insensitive" as const } },
            {
              user: {
                email: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}
  ) satisfies Prisma.LecturerProfileWhereInput;

  const [lecturers, totalMatching, total, dupakGroups] = await Promise.all([
    prisma.lecturerProfile.findMany({
      where: lecturerWhere,
      orderBy: {
        fullName: "asc",
      },
      skip,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        nidnOrNuptk: true,
        studyProgram: true,
        academicPosition: true,
        user: {
          select: {
            email: true,
          },
        },
        dupakSubmissions: {
          select: {
            id: true,
            status: true,
            completionPercent: true,
            currentStep: true,
            submittedAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.lecturerProfile.count({ where: lecturerWhere }),
    prisma.lecturerProfile.count(),
    prisma.dupakSubmission.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const pageCount = getPageCount(totalMatching, pageSize);

  if (totalMatching > 0 && page > pageCount) {
    const redirectParams = new URLSearchParams({
      page: String(pageCount),
      pageSize: String(pageSize),
    });

    if (query) redirectParams.set("q", query);
    redirect(`/admin/dupak?${redirectParams.toString()}`);
  }

  const typedLecturers = lecturers as LecturerWithDupak[];
  const statusCount = (statuses: string[]) =>
    dupakGroups
      .filter((group) => statuses.includes(group.status))
      .reduce((sum, group) => sum + group._count._all, 0);

  const filled = dupakGroups.reduce((sum, group) => sum + group._count._all, 0);
  const submitted = statusCount(["SUBMITTED"]);
  const approved = statusCount([
    "APPROVED",
    "DITERIMA_TIM_PAK",
    "PENILAIAN_DISAHKAN",
    "BERITA_ACARA_DRAFT",
    "BERITA_ACARA_DISAHKAN",
    "PEMERIKSAAN_INTEGRITAS",
    "PEMERIKSAAN_SENAT",
    "SELESAI",
  ]);
  const revision = statusCount([
    "REVISION",
    "PERLU_PERBAIKAN_ADMIN",
    "PERLU_REVISI_TIM_PAK",
  ]);

  return (
    <AppShell
      role="ADMIN"
      title="Monitoring DUPAK"
      subtitle="Pantau dosen yang sudah mengisi DUPAK, progres pengisian, dan preview data."
    >
      <div className="space-y-6">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <Metric
            icon={<UsersRound size={22} />}
            label="Total Dosen"
            value={total}
          />

          <Metric
            icon={<FileText size={22} />}
            label="Sudah Mengisi"
            value={filled}
          />

          <Metric
            icon={<Clock3 size={22} />}
            label="Dikirim"
            value={submitted}
          />

          <Metric
            icon={<CheckCircle2 size={22} />}
            label="Disetujui"
            value={approved}
          />

          <Metric
            icon={<RotateCcw size={22} />}
            label="Revisi"
            value={revision}
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <ClipboardList size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Daftar Pengisian DUPAK Dosen
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Admin dapat melihat progres dan membuka preview DUPAK setiap
                    dosen.
                  </p>
                </div>
              </div>

              <form
                method="GET"
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-400 transition focus-within:border-sky-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100 lg:max-w-md"
              >
                <button
                  type="submit"
                  aria-label="Cari dosen"
                  className="text-slate-400 transition hover:text-sky-700"
                >
                  <Search size={19} />
                </button>

                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Cari nama, NIDN/NUPTK, prodi, atau email..."
                  className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                />
                <input type="hidden" name="pageSize" value={pageSize} />
              </form>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-5">Dosen</th>
                  <th className="p-5">Program Studi</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Progress</th>
                  <th className="p-5">Update Terakhir</th>
                  <th className="p-5">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {typedLecturers.map((lecturer) => {
                  const dupak = lecturer.dupakSubmissions;
                  const progress = dupak?.completionPercent ?? 0;

                  return (
                    <tr
                      key={lecturer.id}
                      className="border-t border-slate-100 align-top transition hover:bg-slate-50"
                    >
                      <td className="p-5">
                        <p className="font-black text-slate-950">
                          {lecturer.fullName}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {lecturer.user.email}
                        </p>

                        <p className="mt-2 text-xs font-black text-slate-500">
                          NIDN/NUPTK: {lecturer.nidnOrNuptk}
                        </p>
                      </td>

                      <td className="p-5">
                        <p className="font-bold text-slate-700">
                          {lecturer.studyProgram}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {lecturer.academicPosition}
                        </p>
                      </td>

                      <td className="p-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyle(
                            dupak?.status,
                          )}`}
                        >
                          {statusLabel(dupak?.status)}
                        </span>
                      </td>

                      <td className="p-5">
                        <div className="w-56">
                          <div className="mb-2 flex justify-between text-xs font-black text-slate-500">
                            <span>Pengisian</span>
                            <span>{progress}%</span>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-sky-700"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>

                          {dupak ? (
                            <p className="mt-2 text-xs font-bold text-slate-400">
                              Step {dupak.currentStep} dari 4
                            </p>
                          ) : (
                            <p className="mt-2 text-xs font-bold text-slate-400">
                              Belum mulai
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-5">
                        <p className="font-bold text-slate-600">
                          {formatDate(dupak?.updatedAt)}
                        </p>

                        {dupak?.submittedAt ? (
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            Dikirim: {formatDate(dupak.submittedAt)}
                          </p>
                        ) : null}
                      </td>

                      <td className="p-5">
                        {dupak ? (
                          <Link
                            href={`/admin/dupak/${dupak.id}`}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-slate-800"
                          >
                            Preview
                            <ArrowRight size={17} />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 font-black text-slate-400">
                            Belum Ada
                            <XCircle size={17} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            pathname="/admin/dupak"
            page={page}
            pageSize={pageSize}
            totalItems={totalMatching}
            query={{ q: query || undefined }}
          />
        </section>
      </div>
    </AppShell>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        {icon}
      </div>

      <p className="text-sm font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>
    </article>
  );
}
