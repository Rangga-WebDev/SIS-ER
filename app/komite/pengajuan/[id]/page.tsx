/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FileText,
  Mail,
  ScanSearch,
} from "lucide-react";
import { getCurrentUser, getUserRoles, hasRole } from "@/lib/auth";
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
  if (!hasRole(user, "KOMITE_INTEGRITAS_AKADEMIK")) redirect("/login");

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

  // Dokumen Tim Komite: gabungan item Syarat Khusus + Rekomendasi Fakultas.
  const documents = submission.lecturer.submissions;
  const rekomendasiFakultasDocs = documents.filter(
    (document) => document.requirement.code === "REKOMENDASI_FAKULTAS",
  );
  const artikelDocs = documents.filter(
    (document) => document.requirement.code === "DOKUMEN_ARTIKEL",
  );
  const korespondensiDocs = documents.filter(
    (document) => document.requirement.code === "DOKUMEN_KORESPONDENSI",
  );
  const turnitinDocs = documents.filter(
    (document) => document.requirement.code === "DOKUMEN_UJI_KEMIRIPAN",
  );

  return (
    <AppShell
      role="KOMITE_INTEGRITAS_AKADEMIK"
      availableRoles={getUserRoles(user)}
      title="Pemeriksaan Integritas Akademik"
      subtitle="Periksa dokumen artikel, korespondensi, uji kemiripan, dan rekomendasi fakultas."
    >
      <div className="space-y-5">
        <Link
          href="/komite/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Kembali ke Dashboard
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-700">
            Riwayat Pengusul
          </p>

          <h2 className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
            {submission.lecturer.fullName}
          </h2>

          <p className="mt-2 break-words text-sm font-semibold text-slate-500">
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

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
              <ScanSearch size={21} />
            </div>

            <div className="min-w-0">
              <h3 className="text-xl font-black text-slate-950">
                Dokumen Tim Komite
              </h3>
              <p className="break-words text-sm font-semibold text-slate-500">
                Gabungan item Syarat Khusus dan Dokumen Rekomendasi yang perlu
                diperiksa oleh Tim Komite.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <DocGroup
              title="Artikel"
              description="Artikel ilmiah yang menjadi bukti pendukung karya ilmiah."
              icon={<FileText size={18} />}
              documents={artikelDocs}
            />

            <DocGroup
              title="Korespondensi"
              description="Bukti submit, review, accepted, atau komunikasi dengan pengelola jurnal."
              icon={<Mail size={18} />}
              documents={korespondensiDocs}
            />

            <DocGroup
              title="Hasil Turnitin"
              description="Dokumen uji kemiripan atau similarity check artikel ilmiah."
              icon={<ScanSearch size={18} />}
              documents={turnitinDocs}
            />

            <DocGroup
              title="Rekomendasi Fakultas"
              description="Surat rekomendasi dari fakultas pengusul."
              icon={<Building2 size={18} />}
              documents={rekomendasiFakultasDocs}
            />
          </div>
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
      <p className="mt-1 break-words font-bold text-slate-900">{value}</p>
    </div>
  );
}

type IntegrityDocument = {
  id: string;
  status: string;
  uploadedAt: Date | null;
  storagePath: string | null;
  externalUrl: string | null;
  requirement: {
    name: string;
  };
};

function DocGroup({
  title,
  description,
  icon,
  documents,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  documents: IntegrityDocument[];
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words font-black text-slate-900">{title}</p>
          <p className="break-words text-xs font-semibold text-slate-500">
            {description}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
          {documents.length} berkas
        </span>
      </div>

      {documents.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-400">
          Belum ada dokumen pada bagian ini.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {documents.map((document) => (
            <div
              key={document.id}
              className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-slate-900">
                  {document.requirement.name}
                </p>
                <p className="text-xs font-bold text-slate-500">
                  Status: {document.status} •{" "}
                  {document.uploadedAt
                    ? new Intl.DateTimeFormat("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(document.uploadedAt))
                    : "-"}
                </p>
              </div>

              <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
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
    </div>
  );
}
