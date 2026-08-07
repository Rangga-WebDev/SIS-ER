/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowRight, Scale } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import MetricCard from "@/components/dashboard/MetricCard";
import Pagination from "@/components/ui/Pagination";
import { getStatusBadgeClass, getStatusLabel } from "@/lib/dupak-workflow";
import { getPageCount, getPagination } from "@/lib/pagination";

export default async function SenatDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "TIM_SENAT") redirect("/login");

  const params = await searchParams;
  const query = String(params.q || "").trim();
  const { page, pageSize, skip } = getPagination(params);

  const incomingWhere = {
    status: "PEMERIKSAAN_SENAT" as const,
    examinationMinute: {
      status: "FINAL" as const,
    },
    ...(query
      ? {
          lecturer: {
            OR: [
              { fullName: { contains: query, mode: "insensitive" as const } },
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
        }
      : {}),
  } satisfies Prisma.DupakSubmissionWhereInput;

  const [incoming, incomingCount, finishedCount, totalDecisions] =
    await Promise.all([
      prisma.dupakSubmission.findMany({
        where: incomingWhere,
        select: {
          id: true,
          status: true,
          lecturer: {
            select: {
              fullName: true,
              nidnOrNuptk: true,
              faculty: true,
              studyProgram: true,
              academicPosition: true,
            },
          },
          examinationMinute: {
            select: {
              nomor: true,
              ratifiedAt: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: pageSize,
      }),
      prisma.dupakSubmission.count({ where: incomingWhere }),
      prisma.dupakSubmission.count({
        where: {
          status: "SELESAI",
          examinationMinute: {
            status: "FINAL",
          },
        },
      }),
      prisma.senateReview.count(),
    ]);

  const pageCount = getPageCount(incomingCount, pageSize);

  if (incomingCount > 0 && page > pageCount) {
    const redirectParams = new URLSearchParams({
      page: String(pageCount),
      pageSize: String(pageSize),
    });
    if (query) redirectParams.set("q", query);
    redirect(`/senat/dashboard?${redirectParams.toString()}`);
  }

  return (
    <AppShell
      role="TIM_SENAT"
      title="Dashboard Tim Senat"
      subtitle="Tinjau berita acara Tim PAK yang telah disahkan dan beri keputusan senat."
    >
      <div className="space-y-6">
        <section className="grid gap-5 md:grid-cols-3">
          <MetricCard
            label="Pengajuan Masuk"
            value={incomingCount}
            desc="Menunggu keputusan senat"
            icon={<Scale size={24} />}
            tone="sky"
          />

          <MetricCard
            label="Selesai"
            value={finishedCount}
            desc="Seluruh tahapan tuntas"
            icon={<Scale size={24} />}
            tone="emerald"
          />

          <MetricCard
            label="Total Keputusan"
            value={totalDecisions}
            desc="Keputusan senat tercatat"
            icon={<Scale size={24} />}
            tone="violet"
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black text-slate-950">
              Pengajuan Masuk ({incomingCount})
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Hanya pengajuan dengan berita acara yang sudah disahkan.
            </p>
          </div>

          {incoming.length === 0 ? (
            <p className="p-10 text-center text-sm font-bold text-slate-400">
              Tidak ada pengajuan yang menunggu keputusan senat.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="p-5">Pengusul</th>
                    <th className="p-5">Fakultas / Prodi</th>
                    <th className="p-5">Nomor BA</th>
                    <th className="p-5">Status</th>
                    <th className="p-5">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {incoming.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="p-5">
                        <p className="font-black text-slate-900">
                          {item.lecturer.fullName}
                        </p>
                        <p className="text-xs font-bold text-slate-400">
                          {item.lecturer.nidnOrNuptk} •{" "}
                          {item.lecturer.academicPosition}
                        </p>
                      </td>

                      <td className="p-5 font-semibold text-slate-600">
                        {item.lecturer.faculty || "-"} /{" "}
                        {item.lecturer.studyProgram}
                      </td>

                      <td className="p-5 font-bold text-slate-600">
                        {item.examinationMinute?.nomor || "-"}
                      </td>

                      <td className="p-5">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(item.status)}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      <td className="p-5">
                        <Link
                          href={`/senat/pengajuan/${item.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-800"
                        >
                          Tinjau
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
            pathname="/senat/dashboard"
            page={page}
            pageSize={pageSize}
            totalItems={incomingCount}
            query={{ q: query || undefined }}
          />
        </section>
      </div>
    </AppShell>
  );
}
