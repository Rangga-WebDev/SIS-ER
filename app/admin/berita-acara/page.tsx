/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowRight, ScrollText } from "lucide-react";
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

export default async function AdminBeritaAcaraPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const { page, pageSize, skip } = getPagination(params);

  const where: Prisma.DupakSubmissionWhereInput = {
    status: {
      in: [
        "PENILAIAN_DISAHKAN",
        "BERITA_ACARA_DRAFT",
        "BERITA_ACARA_DISAHKAN",
        "PEMERIKSAAN_INTEGRITAS",
        "PEMERIKSAAN_SENAT",
        "SELESAI",
      ],
    },
  };

  const [submissions, totalItems] = await Promise.all([
    prisma.dupakSubmission.findMany({
      where,
      select: {
        id: true,
        status: true,
        lecturer: {
          select: {
            fullName: true,
            nidnOrNuptk: true,
            studyProgram: true,
          },
        },
        examinationMinute: {
          select: {
            nomor: true,
            status: true,
            examinationDate: true,
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
    prisma.dupakSubmission.count({ where }),
  ]);

  const pageCount = getPageCount(totalItems, pageSize);

  if (totalItems > 0 && page > pageCount) {
    redirect(`/admin/berita-acara?page=${pageCount}&pageSize=${pageSize}`);
  }

  return (
    <AppShell
      role="ADMIN"
      title="Berita Acara Pemeriksaan"
      subtitle="Kelola berita acara untuk pengajuan yang penilaiannya telah disahkan Tim PAK."
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <ScrollText size={21} />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-950">
              Daftar Berita Acara ({totalItems})
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              Berita acara dibuat, disahkan, dan diunduh melalui halaman detail
              pengajuan.
            </p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <p className="p-10 text-center text-sm font-bold text-slate-400">
            Belum ada pengajuan dengan penilaian yang disahkan.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-5">Pengusul</th>
                  <th className="p-5">Nomor BA</th>
                  <th className="p-5">Tanggal Pemeriksaan</th>
                  <th className="p-5">Status BA</th>
                  <th className="p-5">Status Pengajuan</th>
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
                        {item.lecturer.nidnOrNuptk} •{" "}
                        {item.lecturer.studyProgram}
                      </p>
                    </td>

                    <td className="p-5 font-bold text-slate-600">
                      {item.examinationMinute?.nomor || "-"}
                    </td>

                    <td className="p-5 font-bold text-slate-600">
                      {formatDate(item.examinationMinute?.examinationDate)}
                    </td>

                    <td className="p-5">
                      {item.examinationMinute ? (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${
                            item.examinationMinute.status === "FINAL"
                              ? "border-violet-300 bg-violet-100 text-violet-800"
                              : "border-violet-200 bg-violet-50 text-violet-700"
                          }`}
                        >
                          {item.examinationMinute.status === "FINAL"
                            ? "Disahkan"
                            : "Draft"}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          Belum dibuat
                        </span>
                      )}
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
                        href={`/admin/dupak/${item.id}`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-violet-800"
                      >
                        Kelola BA
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
          pathname="/admin/berita-acara"
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
        />
      </section>
    </AppShell>
  );
}
