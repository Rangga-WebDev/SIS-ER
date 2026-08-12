/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowRight, FileText, ScanSearch } from "lucide-react";
import { getCurrentUser, getUserRoles, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import MetricCard from "@/components/dashboard/MetricCard";
import Pagination from "@/components/ui/Pagination";
import { getStatusBadgeClass, getStatusLabel } from "@/lib/dupak-workflow";
import { getPageCount, getPagination } from "@/lib/pagination";
import { computeResearchProportion } from "@/lib/dupak-template";
import { canKomiteSee, toCreditData } from "@/lib/pak-access";
import { KOMITE_VISIBLE_STATUSES } from "@/lib/access-policy";

const committeeDocumentCodes = [
  "DOKUMEN_ARTIKEL",
  "DOKUMEN_KORESPONDENSI",
  "DOKUMEN_UJI_KEMIRIPAN",
  "REKOMENDASI_FAKULTAS",
];

function isUploadedDocument(document: {
  storagePath: string | null;
  externalUrl: string | null;
}) {
  return Boolean(document.storagePath || document.externalUrl);
}

export default async function KomiteDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!hasRole(user, "KOMITE_INTEGRITAS_AKADEMIK")) redirect("/login");

  const params = await searchParams;
  const query = String(params.q || "").trim();
  const { page, pageSize, skip } = getPagination(params);

  const incomingWhere = {
    status: {
      in: KOMITE_VISIBLE_STATUSES,
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

  const [
    incoming,
    incomingCount,
    forwardedCount,
    totalReviews,
    latestCommitteeDocuments,
  ] = await Promise.all([
    prisma.dupakSubmission.findMany({
      where: incomingWhere,
      select: {
        id: true,
        status: true,
        creditData: true,
        lecturer: {
          select: {
            fullName: true,
            nidnOrNuptk: true,
            faculty: true,
            studyProgram: true,
            academicPosition: true,
            submissions: {
              where: {
                requirement: {
                  code: {
                    in: committeeDocumentCodes,
                  },
                },
              },
              select: {
                id: true,
                status: true,
                storagePath: true,
                externalUrl: true,
                requirement: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: {
                uploadedAt: "desc",
              },
            },
          },
        },
        integrityReviews: {
          select: {
            result: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
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
        status: {
          in: ["PEMERIKSAAN_SENAT", "SELESAI"],
        },
      },
    }),
    prisma.integrityReview.count(),
    prisma.documentSubmission.findMany({
      where: {
        requirement: {
          code: {
            in: committeeDocumentCodes,
          },
        },
        OR: [{ externalUrl: { not: null } }, { storagePath: { not: null } }],
        lecturer: query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { nidnOrNuptk: { contains: query, mode: "insensitive" } },
                { studyProgram: { contains: query, mode: "insensitive" } },
              ],
            }
          : undefined,
      },
      select: {
        id: true,
        status: true,
        externalUrl: true,
        storagePath: true,
        uploadedAt: true,
        lecturer: {
          select: {
            fullName: true,
            nidnOrNuptk: true,
            studyProgram: true,
            dupakSubmissions: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        requirement: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
      take: 12,
    }),
  ]);

  const pageCount = getPageCount(incomingCount, pageSize);

  if (incomingCount > 0 && page > pageCount) {
    const redirectParams = new URLSearchParams({
      page: String(pageCount),
      pageSize: String(pageSize),
    });
    if (query) redirectParams.set("q", query);
    redirect(`/komite/dashboard?${redirectParams.toString()}`);
  }

  return (
    <AppShell
      role="KOMITE_INTEGRITAS_AKADEMIK"
      availableRoles={getUserRoles(user)}
      title="Dashboard Komite Integritas Akademik"
      subtitle="Periksa integritas akademik pengusul pada pengajuan yang telah mencapai tahap pemeriksaan."
    >
      <div className="space-y-5">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Pengajuan Masuk"
            value={incomingCount}
            desc="Menunggu pemeriksaan"
            icon={<ScanSearch size={24} />}
            tone="sky"
          />

          <MetricCard
            label="Sudah Diteruskan"
            value={forwardedCount}
            desc="Lolos ke tahap berikutnya"
            icon={<ArrowRight size={24} />}
            tone="emerald"
          />

          <MetricCard
            label="Total Pemeriksaan"
            value={totalReviews}
            desc="Seluruh keputusan komite"
            icon={<ScanSearch size={24} />}
            tone="violet"
          />
        </section>

        <section className="max-w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <h2 className="text-xl font-black text-slate-950">
              Pengajuan Masuk ({incomingCount})
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Pengajuan yang sudah lolos verifikasi admin dapat dibuka oleh Tim
              Komite.
            </p>
          </div>

          {incoming.length === 0 ? (
            <p className="p-10 text-center text-sm font-bold text-slate-400">
              Tidak ada pengajuan yang menunggu pemeriksaan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="p-4">Pengusul</th>
                    <th className="p-4">Fakultas / Prodi</th>
                    <th className="p-4">Jabatan</th>
                    <th className="p-4">Dokumen Komite</th>
                    <th className="p-4">Proporsi</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Hasil</th>
                    <th className="p-4">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {incoming.map((item) => {
                    const proporsi = computeResearchProportion(
                      toCreditData(item.creditData),
                    );
                    const uploadedCommitteeDocuments =
                      item.lecturer.submissions.filter(isUploadedDocument);

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="p-4 align-top">
                          <p className="max-w-[180px] break-words font-black text-slate-900">
                            {item.lecturer.fullName}
                          </p>
                          <p className="text-xs font-bold text-slate-400">
                            {item.lecturer.nidnOrNuptk}
                          </p>
                        </td>

                        <td className="p-4 align-top font-semibold text-slate-600">
                          {item.lecturer.faculty || "-"} /{" "}
                          {item.lecturer.studyProgram}
                        </td>

                        <td className="p-4 align-top font-semibold text-slate-600">
                          {item.lecturer.academicPosition}
                        </td>

                        <td className="p-4 align-top">
                          <div className="flex flex-col gap-2">
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                              <FileText size={13} />
                              {uploadedCommitteeDocuments.length}/4 terisi
                            </span>

                            {uploadedCommitteeDocuments.length > 0 ? (
                              <p className="max-w-56 break-words text-xs font-semibold leading-5 text-slate-500">
                                {uploadedCommitteeDocuments
                                  .map((document) => document.requirement.name)
                                  .join(", ")}
                              </p>
                            ) : (
                              <p className="text-xs font-bold text-slate-400">
                                Belum ada link/file komite.
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="p-4 align-top">
                          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                            {proporsi.percent}%
                          </span>
                        </td>

                        <td className="p-4 align-top">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(item.status)}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>

                        <td className="p-4 align-top font-bold text-slate-600">
                          {item.integrityReviews[0]?.result || "-"}
                        </td>

                        <td className="p-4 align-top">
                          <Link
                            href={`/komite/pengajuan/${item.id}`}
                            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-cyan-800"
                          >
                            Periksa
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
            pathname="/komite/dashboard"
            page={page}
            pageSize={pageSize}
            totalItems={incomingCount}
            query={{ q: query || undefined }}
          />
        </section>

        <section className="max-w-full overflow-hidden rounded-[2rem] border border-cyan-200 bg-white shadow-sm">
          <div className="border-b border-cyan-100 bg-cyan-50/60 p-4 sm:p-5">
            <h2 className="text-xl font-black text-slate-950">
              Dokumen Komite Terupload
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Link/file yang dikirim dosen untuk artikel, korespondensi, uji
              kemiripan, dan rekomendasi fakultas. Panel ini tampil meski DUPAK
              belum masuk tahap pemeriksaan integritas.
            </p>
          </div>

          {latestCommitteeDocuments.length === 0 ? (
            <p className="p-10 text-center text-sm font-bold text-slate-400">
              Belum ada dokumen komite yang diunggah.
            </p>
          ) : (
            <div className="grid min-w-0 gap-3 p-4 sm:p-5">
              {latestCommitteeDocuments.map((document) => (
                <div
                  key={document.id}
                  className="grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="break-words font-black text-slate-950">
                      {document.lecturer.fullName}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-500">
                      {document.requirement.name} •{" "}
                      {document.lecturer.nidnOrNuptk} •{" "}
                      {document.lecturer.studyProgram}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                        {document.externalUrl ? "Link Drive" : "File Upload"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
                        Dokumen {document.status}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
                        DUPAK{" "}
                        {document.lecturer.dupakSubmissions?.status ||
                          "Belum ada"}
                      </span>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-2 lg:justify-end">
                    {document.storagePath && (
                      <a
                        href={`/api/files/${document.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black text-white transition hover:bg-cyan-800"
                      >
                        <FileText size={13} />
                        Buka File
                      </a>
                    )}

                    {document.externalUrl && (
                      <a
                        href={document.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                      >
                        Buka Link
                        <ArrowRight size={13} />
                      </a>
                    )}

                    {document.lecturer.dupakSubmissions?.id &&
                      canKomiteSee(
                        document.lecturer.dupakSubmissions.status,
                      ) && (
                        <Link
                          href={`/komite/pengajuan/${document.lecturer.dupakSubmissions.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 transition hover:bg-cyan-100"
                        >
                          Buka Pengajuan
                          <ArrowRight size={13} />
                        </Link>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
