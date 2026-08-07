/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowRight, ClipboardCheck } from "lucide-react";
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

export default async function PakTugasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "TIM_PAK") redirect("/login");

  const params = await searchParams;
  const query = String(params.q || "").trim();
  const { page, pageSize, skip } = getPagination(params);

  const where = {
    pakUserId: user.id,
    status: "ACTIVE" as const,
    ...(query
      ? {
          submission: {
            lecturer: {
              OR: [
                {
                  fullName: { contains: query, mode: "insensitive" as const },
                },
                {
                  nidnOrNuptk: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  studyProgram: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        }
      : {}),
  } satisfies Prisma.PakAssignmentWhereInput;

  const [assignments, totalItems] = await Promise.all([
    prisma.pakAssignment.findMany({
      where,
      select: {
        id: true,
        deadline: true,
        assessment: {
          select: {
            decision: true,
            isRatified: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            lecturer: {
              select: {
                fullName: true,
                nidnOrNuptk: true,
                studyProgram: true,
                academicPosition: true,
              },
            },
          },
        },
      },
      orderBy: [{ deadline: "asc" }, { assignedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.pakAssignment.count({ where }),
  ]);

  const pageCount = getPageCount(totalItems, pageSize);

  if (totalItems > 0 && page > pageCount) {
    const redirectParams = new URLSearchParams({
      page: String(pageCount),
      pageSize: String(pageSize),
    });
    if (query) redirectParams.set("q", query);
    redirect(`/pak/tugas?${redirectParams.toString()}`);
  }

  return (
    <AppShell
      role="TIM_PAK"
      title="Tugas Penilaian"
      subtitle="Daftar pengajuan DUPAK yang ditugaskan kepada Anda. Pengajuan dosen lain tidak dapat diakses."
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <ClipboardCheck size={21} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Monitoring DUPAK Ditugaskan
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                {totalItems} penugasan aktif
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
            <input type="hidden" name="pageSize" value={pageSize} />
          </form>
        </div>

        {assignments.length === 0 ? (
          <p className="p-10 text-center text-sm font-bold text-slate-400">
            {query
              ? `Tidak ada tugas yang cocok dengan "${query}".`
              : "Belum ada tugas penilaian aktif."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-5">Pengusul</th>
                  <th className="p-5">Program Studi</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Keputusan Saya</th>
                  <th className="p-5">Batas Waktu</th>
                  <th className="p-5">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {assignments.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="p-5">
                      <p className="font-black text-slate-900">
                        {item.submission.lecturer.fullName}
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        {item.submission.lecturer.nidnOrNuptk} •{" "}
                        {item.submission.lecturer.academicPosition}
                      </p>
                    </td>

                    <td className="p-5 font-semibold text-slate-600">
                      {item.submission.lecturer.studyProgram}
                    </td>

                    <td className="p-5">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(item.submission.status)}`}
                      >
                        {getStatusLabel(item.submission.status)}
                      </span>
                    </td>

                    <td className="p-5 font-bold text-slate-600">
                      {item.assessment?.isRatified
                        ? "Disahkan"
                        : item.assessment?.decision === "DITERIMA"
                          ? "Diterima"
                          : item.assessment?.decision === "PERLU_REVISI"
                            ? "Perlu Revisi"
                            : "Belum ada"}
                    </td>

                    <td className="p-5 font-bold text-slate-600">
                      {formatDate(item.deadline)}
                    </td>

                    <td className="p-5">
                      <Link
                        href={`/pak/tugas/${item.id}`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-sky-800"
                      >
                        Nilai
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pathname="/pak/tugas"
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          query={{ q: query || undefined }}
        />
      </section>
    </AppShell>
  );
}
