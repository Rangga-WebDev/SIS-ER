/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import StatusTimeline from "@/components/workflow/StatusTimeline";
import ReviewDecisionForm from "@/components/workflow/ReviewDecisionForm";
import { canKomiteSee } from "@/lib/pak-access";
import type { DupakStatus } from "@/lib/app-types";

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

export default async function KomitePengajuanDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "KOMITE_INTEGRITAS_AKADEMIK") redirect("/login");

  const { id } = await params;

  const submission = await prisma.dupakSubmission.findUnique({
    where: {
      id,
    },
    include: {
      lecturer: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
          submissions: {
            include: {
              requirement: {
                include: {
                  category: true,
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
        orderBy: {
          createdAt: "desc",
        },
      },
      statusHistories: {
        orderBy: {
          createdAt: "desc",
        },
        take: 15,
      },
    },
  });

  // Komite hanya boleh membuka pengajuan pada tahap integritas ke atas.
  if (!submission || !canKomiteSee(submission.status)) {
    redirect("/komite/dashboard");
  }

  const status = submission.status as DupakStatus;

  // Dokumen relevan: persyaratan khusus, karya ilmiah, dan dokumen pendukung.
  const documents = submission.lecturer.submissions;

  return (
    <AppShell
      role="KOMITE_INTEGRITAS_AKADEMIK"
      title="Pemeriksaan Integritas Akademik"
      subtitle="Riwayat pengusul, dokumen persyaratan khusus, dan keputusan pemeriksaan."
    >
      <div className="space-y-6">
        <Link
          href="/komite/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Kembali ke Dashboard
        </Link>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-700">
            Riwayat Pengusul
          </p>

          <h2 className="mt-2 text-3xl font-black text-slate-950">
            {submission.lecturer.fullName}
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            {submission.lecturer.user.email} • NIDN/NUPTK:{" "}
            {submission.lecturer.nidnOrNuptk}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <InfoBox
              label="Fakultas / Prodi"
              value={`${submission.lecturer.faculty || "-"} / ${submission.lecturer.studyProgram}`}
            />
            <InfoBox
              label="Jabatan Akademik"
              value={submission.lecturer.academicPosition}
            />
            <InfoBox
              label="Status Dosen"
              value={submission.lecturer.lecturerStatus}
            />
          </div>
        </section>

        <StatusTimeline
          status={status}
          histories={submission.statusHistories}
        />

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
              <FileText size={21} />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-950">
                Dokumen Pengusul ({documents.length})
              </h3>
              <p className="text-sm font-semibold text-slate-500">
                Termasuk persyaratan khusus, artikel ilmiah, korespondensi, dan
                hasil Turnitin bila diunggah.
              </p>
            </div>
          </div>

          {documents.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-400">
              Pengusul belum memiliki dokumen tersimpan.
            </p>
          ) : (
            <div className="mt-4 grid gap-2">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {document.requirement.name}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      {document.requirement.category.name} • Status:{" "}
                      {document.status} • {formatDateTime(document.uploadedAt)}
                    </p>
                  </div>

                  <div className="flex gap-2">
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
                        <ExternalLink size={13} />
                        Buka Tautan
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {submission.integrityReviews.length > 0 && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-black text-slate-950">
              Riwayat Pemeriksaan Sebelumnya
            </h3>

            <div className="mt-4 grid gap-2">
              {submission.integrityReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="text-sm font-black text-slate-900">
                    {review.result}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    {review.note}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {formatDateTime(review.createdAt)} • {review.reviewerEmail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {status === "PEMERIKSAAN_INTEGRITAS" && (
          <ReviewDecisionForm
            title="Hasil Pemeriksaan Integritas"
            endpoint={`/api/komite/dupak/${submission.id}/review`}
            fieldName="result"
            options={[
              { value: "MEMENUHI", label: "Memenuhi" },
              { value: "PERLU_KLARIFIKASI", label: "Perlu Klarifikasi" },
              { value: "PERLU_PERBAIKAN", label: "Perlu Perbaikan" },
              { value: "TIDAK_MEMENUHI", label: "Tidak Memenuhi" },
            ]}
          />
        )}
      </div>
    </AppShell>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}
