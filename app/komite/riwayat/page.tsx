/** @format */

import { redirect } from "next/navigation";
import { GaugeCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
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

export default async function KomiteRiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "KOMITE_INTEGRITAS_AKADEMIK") redirect("/login");

  const params = await searchParams;
  const { page, pageSize, skip } = getPagination(params);

  const [reviews, totalItems] = await Promise.all([
    prisma.integrityReview.findMany({
      select: {
        id: true,
        result: true,
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
    prisma.integrityReview.count(),
  ]);

  const pageCount = getPageCount(totalItems, pageSize);

  if (totalItems > 0 && page > pageCount) {
    redirect(`/komite/riwayat?page=${pageCount}&pageSize=${pageSize}`);
  }

  return (
    <AppShell
      role="KOMITE_INTEGRITAS_AKADEMIK"
      title="Riwayat Pemeriksaan"
      subtitle="Seluruh keputusan pemeriksaan integritas akademik yang pernah diberikan."
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
            <GaugeCircle size={21} />
          </div>

          <h2 className="text-xl font-black text-slate-950">
            Riwayat Keputusan ({totalItems})
          </h2>
        </div>

        {reviews.length === 0 ? (
          <p className="p-10 text-center text-sm font-bold text-slate-400">
            Belum ada riwayat pemeriksaan.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-5">Pengusul</th>
                  <th className="p-5">Hasil</th>
                  <th className="p-5">Catatan</th>
                  <th className="p-5">Pemeriksa</th>
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
                      {review.result}
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
          pathname="/komite/riwayat"
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
        />
      </section>
    </AppShell>
  );
}
