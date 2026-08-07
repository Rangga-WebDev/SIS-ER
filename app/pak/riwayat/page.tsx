/** @format */

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { FileCheck2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import Pagination from "@/components/ui/Pagination";
import { getStatusBadgeClass, getStatusLabel } from "@/lib/dupak-workflow";
import { getPageCount, getPagination } from "@/lib/pagination";

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

export default async function PakRiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "TIM_PAK") redirect("/login");

  const params = await searchParams;
  const { page, pageSize, skip } = getPagination(params);
  const where: Prisma.PakAssignmentWhereInput = {
    pakUserId: user.id,
    status: {
      in: ["COMPLETED", "CANCELLED", "REASSIGNED"],
    },
  };

  const [assignments, totalItems] = await Promise.all([
    prisma.pakAssignment.findMany({
      where,
      select: {
        id: true,
        status: true,
        assessment: {
          select: {
            decision: true,
            isRatified: true,
            ratifiedAt: true,
            totalScore: true,
          },
        },
        submission: {
          select: {
            status: true,
            lecturer: {
              select: {
                fullName: true,
                studyProgram: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.pakAssignment.count({ where }),
  ]);

  const pageCount = getPageCount(totalItems, pageSize);

  if (totalItems > 0 && page > pageCount) {
    redirect(`/pak/riwayat?page=${pageCount}&pageSize=${pageSize}`);
  }

  return (
    <AppShell
      role="TIM_PAK"
      title="Riwayat Penilaian"
      subtitle="Penugasan yang telah selesai, dibatalkan, atau dialihkan."
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <FileCheck2 size={21} />
          </div>

          <h2 className="text-xl font-black text-slate-950">
            Riwayat Penugasan ({totalItems})
          </h2>
        </div>

        {assignments.length === 0 ? (
          <p className="p-10 text-center text-sm font-bold text-slate-400">
            Belum ada riwayat penilaian.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-5">Pengusul</th>
                  <th className="p-5">Status Penugasan</th>
                  <th className="p-5">Keputusan</th>
                  <th className="p-5">Total Nilai</th>
                  <th className="p-5">Disahkan</th>
                  <th className="p-5">Status Pengajuan</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {assignments.map((item) => (
                  <tr key={item.id}>
                    <td className="p-5">
                      <p className="font-black text-slate-900">
                        {item.submission.lecturer.fullName}
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        {item.submission.lecturer.studyProgram}
                      </p>
                    </td>

                    <td className="p-5 font-bold text-slate-600">
                      {item.status === "COMPLETED"
                        ? "Selesai"
                        : item.status === "CANCELLED"
                          ? "Dibatalkan"
                          : "Dialihkan"}
                    </td>

                    <td className="p-5 font-bold text-slate-600">
                      {item.assessment?.decision === "DITERIMA"
                        ? "Diterima"
                        : item.assessment?.decision === "PERLU_REVISI"
                          ? "Perlu Revisi"
                          : "-"}
                    </td>

                    <td className="p-5 font-black text-slate-900">
                      {item.assessment?.totalScore ?? "-"}
                    </td>

                    <td className="p-5 font-bold text-slate-600">
                      {formatDateTime(item.assessment?.ratifiedAt)}
                    </td>

                    <td className="p-5">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(item.submission.status)}`}
                      >
                        {getStatusLabel(item.submission.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pathname="/pak/riwayat"
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
        />
      </section>
    </AppShell>
  );
}
