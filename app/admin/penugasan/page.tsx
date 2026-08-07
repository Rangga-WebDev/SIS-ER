/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowRight, ClipboardCheck, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import Pagination from "@/components/ui/Pagination";
import { getStatusBadgeClass, getStatusLabel } from "@/lib/dupak-workflow";
import { getPageCount, getPagination } from "@/lib/pagination";

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function AdminPenugasanPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    readyPage?: string;
    activePage?: string;
    pageSize?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const query = String(params.q || "").trim();
  const readyPagination = getPagination({
    page: params.readyPage,
    pageSize: params.pageSize,
  });
  const activePagination = getPagination({
    page: params.activePage,
    pageSize: params.pageSize,
  });

  const lecturerFilter = (
    query
      ? {
          lecturer: {
            OR: [
              { fullName: { contains: query, mode: "insensitive" as const } },
              {
                nidnOrNuptk: { contains: query, mode: "insensitive" as const },
              },
              {
                studyProgram: { contains: query, mode: "insensitive" as const },
              },
            ],
          },
        }
      : {}
  ) satisfies Prisma.DupakSubmissionWhereInput;

  const readyWhere = {
    status: "LOLOS_VERIFIKASI_ADMIN" as const,
    ...lecturerFilter,
  } satisfies Prisma.DupakSubmissionWhereInput;

  const activeWhere = {
    status: {
      in: [
        "DITUGASKAN_KE_TIM_PAK",
        "SEDANG_DINILAI",
        "DIKIRIM_ULANG_SETELAH_REVISI",
        "PERLU_REVISI_TIM_PAK",
      ],
    },
    ...lecturerFilter,
  } satisfies Prisma.DupakSubmissionWhereInput;

  const submissionSelect = {
    id: true,
    status: true,
    submittedAt: true,
    lecturer: {
      select: {
        fullName: true,
        nidnOrNuptk: true,
        faculty: true,
        studyProgram: true,
        academicPosition: true,
      },
    },
    pakAssignments: {
      where: {
        status: "ACTIVE" as const,
      },
      select: {
        id: true,
        deadline: true,
        pakUser: {
          select: {
            email: true,
          },
        },
      },
    },
  } satisfies Prisma.DupakSubmissionSelect;

  const [readyToAssign, readyCount, assigned, assignedCount, pakMembers] =
    await Promise.all([
      prisma.dupakSubmission.findMany({
        where: readyWhere,
        select: submissionSelect,
        orderBy: {
          updatedAt: "desc",
        },
        skip: readyPagination.skip,
        take: readyPagination.pageSize,
      }),

      prisma.dupakSubmission.count({ where: readyWhere }),

      prisma.dupakSubmission.findMany({
        where: activeWhere,
        select: submissionSelect,
        orderBy: {
          updatedAt: "desc",
        },
        skip: activePagination.skip,
        take: activePagination.pageSize,
      }),

      prisma.dupakSubmission.count({ where: activeWhere }),

      prisma.user.findMany({
        where: {
          role: "TIM_PAK",
        },
        select: {
          id: true,
          email: true,
          status: true,
          _count: {
            select: {
              pakAssignments: {
                where: {
                  status: "ACTIVE",
                },
              },
            },
          },
        },
        orderBy: {
          email: "asc",
        },
      }),
    ]);

  const readyPageCount = getPageCount(readyCount, readyPagination.pageSize);
  const activePageCount = getPageCount(
    assignedCount,
    activePagination.pageSize,
  );

  if (
    (readyCount > 0 && readyPagination.page > readyPageCount) ||
    (assignedCount > 0 && activePagination.page > activePageCount)
  ) {
    const redirectParams = new URLSearchParams({
      readyPage: String(Math.min(readyPagination.page, readyPageCount)),
      activePage: String(Math.min(activePagination.page, activePageCount)),
      pageSize: String(readyPagination.pageSize),
    });

    if (query) redirectParams.set("q", query);
    redirect(`/admin/penugasan?${redirectParams.toString()}`);
  }

  return (
    <AppShell
      role="ADMIN"
      title="Penugasan Tim PAK"
      subtitle="Tugaskan pengajuan yang lolos verifikasi kepada Tim PAK, pantau beban kerja, dan kelola pengalihan."
    >
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <UsersRound size={21} />
            </div>

            <h2 className="text-xl font-black text-slate-950">
              Beban Kerja Tim PAK
            </h2>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {pakMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="truncate text-sm font-black text-slate-900">
                  {member.email}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {member._count.pakAssignments} tugas aktif •{" "}
                  <span
                    className={
                      member.status === "ACTIVE"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  >
                    {member.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </span>
                </p>
              </div>
            ))}

            {pakMembers.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-400">
                Belum ada akun Tim PAK. Kelola pada menu Kelola Tim PAK.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                <ClipboardCheck size={21} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Siap Ditugaskan ({readyCount})
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  Pengajuan lolos verifikasi Admin yang belum memiliki penilai.
                </p>
              </div>
            </div>

            <form method="GET" className="w-full lg:max-w-sm">
              <input
                name="q"
                defaultValue={query}
                placeholder="Cari nama, NIDN/NUPTK, atau prodi..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
              <input
                type="hidden"
                name="pageSize"
                value={readyPagination.pageSize}
              />
            </form>
          </div>

          {readyToAssign.length === 0 ? (
            <p className="p-8 text-center text-sm font-bold text-slate-400">
              Tidak ada pengajuan yang menunggu penugasan.
            </p>
          ) : (
            <SubmissionTable submissions={readyToAssign} />
          )}

          <Pagination
            pathname="/admin/penugasan"
            page={readyPagination.page}
            pageSize={readyPagination.pageSize}
            totalItems={readyCount}
            pageParam="readyPage"
            pageSizeParam="pageSize"
            query={{
              q: query || undefined,
              activePage: String(activePagination.page),
            }}
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black text-slate-950">
              Sudah Ditugaskan / Dalam Penilaian ({assignedCount})
            </h2>
          </div>

          {assigned.length === 0 ? (
            <p className="p-8 text-center text-sm font-bold text-slate-400">
              Belum ada pengajuan dalam tahap penilaian.
            </p>
          ) : (
            <SubmissionTable submissions={assigned} />
          )}

          <Pagination
            pathname="/admin/penugasan"
            page={activePagination.page}
            pageSize={activePagination.pageSize}
            totalItems={assignedCount}
            pageParam="activePage"
            pageSizeParam="pageSize"
            query={{
              q: query || undefined,
              readyPage: String(readyPagination.page),
            }}
          />
        </section>
      </div>
    </AppShell>
  );
}

type SubmissionRow = {
  id: string;
  status: string;
  submittedAt: Date | null;
  lecturer: {
    fullName: string;
    nidnOrNuptk: string;
    faculty: string | null;
    studyProgram: string;
    academicPosition: string;
  };
  pakAssignments: {
    id: string;
    deadline: Date | null;
    pakUser: {
      email: string;
    };
  }[];
};

function SubmissionTable({ submissions }: { submissions: SubmissionRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="p-5">Dosen</th>
            <th className="p-5">Fakultas / Prodi</th>
            <th className="p-5">Jabatan</th>
            <th className="p-5">Status</th>
            <th className="p-5">Tim PAK Ditugaskan</th>
            <th className="p-5">Batas Waktu</th>
            <th className="p-5">Aksi</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {submissions.map((item) => (
            <tr key={item.id} className="transition hover:bg-slate-50">
              <td className="p-5">
                <p className="font-black text-slate-900">
                  {item.lecturer.fullName}
                </p>
                <p className="text-xs font-bold text-slate-400">
                  {item.lecturer.nidnOrNuptk}
                </p>
              </td>

              <td className="p-5 font-semibold text-slate-600">
                {item.lecturer.faculty || "-"} / {item.lecturer.studyProgram}
              </td>

              <td className="p-5 font-semibold text-slate-600">
                {item.lecturer.academicPosition}
              </td>

              <td className="p-5">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(item.status)}`}
                >
                  {getStatusLabel(item.status)}
                </span>
              </td>

              <td className="p-5">
                {item.pakAssignments.length === 0 ? (
                  <span className="text-xs font-bold text-slate-400">
                    Belum ditugaskan
                  </span>
                ) : (
                  <div className="space-y-1">
                    {item.pakAssignments.map((assignment) => (
                      <p
                        key={assignment.id}
                        className="text-xs font-black text-slate-700"
                      >
                        {assignment.pakUser.email}
                      </p>
                    ))}
                  </div>
                )}
              </td>

              <td className="p-5 font-bold text-slate-600">
                {formatDate(item.pakAssignments[0]?.deadline)}
              </td>

              <td className="p-5">
                <Link
                  href={`/admin/dupak/${item.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-indigo-800"
                >
                  Kelola
                  <ArrowRight size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
