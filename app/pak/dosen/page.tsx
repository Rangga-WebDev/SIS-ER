/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowRight, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import LecturerAvatar from "@/components/ui/LecturerAvatar";
import Pagination from "@/components/ui/Pagination";
import { getPageCount, getPagination } from "@/lib/pagination";

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function PakDosenListPage({
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
        submission: {
          select: {
            lecturer: {
              select: {
                id: true,
                fullName: true,
                nidnOrNuptk: true,
                studyProgram: true,
                academicPosition: true,
                documentStatus: true,
                verificationStatus: true,
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
    redirect(`/pak/dosen?${redirectParams.toString()}`);
  }

  return (
    <AppShell
      role="TIM_PAK"
      title="Dosen Ditugaskan"
      subtitle="Profil dan dokumen dosen yang pengajuannya sedang Anda nilai. Dosen lain tidak dapat diakses."
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <UsersRound size={21} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Daftar Dosen Ditugaskan
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                {totalItems} dosen dengan penugasan aktif
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
              ? `Tidak ada dosen yang cocok dengan "${query}".`
              : "Belum ada dosen yang ditugaskan kepada Anda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-5">Dosen</th>
                  <th className="p-5">Program Studi</th>
                  <th className="p-5">Status Dokumen</th>
                  <th className="p-5">Status Verifikasi</th>
                  <th className="p-5">Batas Waktu Nilai</th>
                  <th className="p-5">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {assignments.map((item) => {
                  const lecturer = item.submission.lecturer;

                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="p-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <LecturerAvatar
                            lecturerId={lecturer.id}
                            name={lecturer.fullName}
                            size="sm"
                          />

                          <div className="min-w-0">
                            <p className="font-black text-slate-900">
                              {lecturer.fullName}
                            </p>
                            <p className="text-xs font-bold text-slate-400">
                              {lecturer.nidnOrNuptk} •{" "}
                              {lecturer.academicPosition}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-5 font-semibold text-slate-600">
                        {lecturer.studyProgram}
                      </td>

                      <td className="p-5">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                          {lecturer.documentStatus}
                        </span>
                      </td>

                      <td className="p-5">
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                          {lecturer.verificationStatus}
                        </span>
                      </td>

                      <td className="p-5 font-bold text-slate-600">
                        {formatDate(item.deadline)}
                      </td>

                      <td className="p-5">
                        <Link
                          href={`/pak/dosen/${lecturer.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-sky-800"
                        >
                          Lihat Detail
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pathname="/pak/dosen"
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          query={{ q: query || undefined }}
        />
      </section>
    </AppShell>
  );
}
