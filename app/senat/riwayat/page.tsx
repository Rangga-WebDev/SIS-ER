/** @format */

import { redirect } from "next/navigation";
import { Scale } from "lucide-react";
import { getCurrentUser, getUserRoles, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import Pagination from "@/components/ui/Pagination";
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

export default async function SenatRiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!hasRole(user, "TIM_SENAT")) redirect("/login");

  const params = await searchParams;
  const { page, pageSize, skip } = getPagination(params);

  const [reviews, totalItems] = await Promise.all([
    prisma.senateReview.findMany({
      select: {
        id: true,
        decision: true,
        note: true,
        reviewerEmail: true,
        createdAt: true,
        submission: {
          select: {
            lecturer: {
              select: {
                fullName: true,
                nidnOrNuptk: true,
                studyProgram: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.senateReview.count(),
  ]);

  const pageCount = getPageCount(totalItems, pageSize);

  if (totalItems > 0 && page > pageCount) {
    redirect(`/senat/riwayat?page=${pageCount}&pageSize=${pageSize}`);
  }

  return (
    <AppShell
      role="TIM_SENAT"
      availableRoles={getUserRoles(user)}
      title="Riwayat Keputusan Senat"
      subtitle="Seluruh keputusan Tim Senat yang pernah diberikan."
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <Scale size={21} />
          </div>

          <h2 className="text-xl font-black text-slate-950">
            Riwayat Keputusan ({totalItems})
          </h2>
        </div>

        {reviews.length === 0 ? (
          <p className="p-10 text-center text-sm font-bold text-slate-400">
            Belum ada keputusan senat.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-5">Pengusul</th>
                  <th className="p-5">Keputusan</th>
                  <th className="p-5">Catatan</th>
                  <th className="p-5">Pemberi Keputusan</th>
                  <th className="p-5">Waktu</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td className="p-5">
                      <p className="font-black text-slate-900">
                        {review.submission.lecturer.fullName}
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        {review.submission.lecturer.nidnOrNuptk} •{" "}
                        {review.submission.lecturer.studyProgram}
                      </p>
                    </td>

                    <td className="p-5 font-black text-slate-800">
                      {review.decision === "DISETUJUI"
                        ? "Disetujui"
                        : "Dikembalikan"}
                    </td>

                    <td className="max-w-xs p-5 text-sm font-semibold leading-6 text-slate-600">
                      {review.note || "-"}
                    </td>

                    <td className="p-5 font-bold text-slate-600">
                      {review.reviewerEmail || "-"}
                    </td>

                    <td className="p-5 font-bold text-slate-600">
                      {formatDateTime(review.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pathname="/senat/riwayat"
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
        />
      </section>
    </AppShell>
  );
}
