/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Paperclip,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import DupakPreview from "@/components/dupak/DupakPreview";
import type { DupakCreditData, DupakPersonalData } from "@/lib/dupak-template";

function toObject<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return value as T;
}

function statusLabel(status: string) {
  if (status === "DRAFT") return "Draft";
  if (status === "SUBMITTED") return "Dikirim";
  if (status === "REVISION") return "Revisi";
  if (status === "APPROVED") return "Disetujui";
  if (status === "REJECTED") return "Ditolak";
  return status;
}

export default async function AdminDupakDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

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
        },
      },
      evidences: {
        orderBy: {
          uploadedAt: "desc",
        },
        select: {
          id: true,
          rowCode: true,
          rowLabel: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          note: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!submission) redirect("/admin/dupak");

  const evidences = submission.evidences.map((evidence) => ({
    id: evidence.id,
    rowCode: evidence.rowCode,
    rowLabel: evidence.rowLabel,
    fileName: evidence.fileName,
    fileSize: evidence.fileSize,
    mimeType: evidence.mimeType,
    note: evidence.note,
    uploadedAt: evidence.uploadedAt,
  }));

  return (
    <AppShell
      role="ADMIN"
      title="Preview DUPAK"
      subtitle="Preview hasil pengisian DUPAK dosen beserta bukti dokumen per baris kegiatan."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/dupak"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Kembali ke Monitoring DUPAK
          </Link>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={`/api/admin/dupak/${submission.id}/export/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-800"
            >
              <Download size={18} />
              Download PDF
            </a>

            <a
              href={`/api/admin/dupak/${submission.id}/export/excel`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
            >
              <FileSpreadsheet size={18} />
              Download Excel
            </a>
          </div>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                Data Dosen
              </p>

              <h2 className="mt-2 text-3xl font-black text-slate-950">
                {submission.lecturer.fullName}
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                {submission.lecturer.user.email} •{" "}
                {submission.lecturer.studyProgram}
              </p>

              <p className="mt-2 text-sm font-bold text-slate-400">
                NIDN/NUPTK: {submission.lecturer.nidnOrNuptk}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Status
                </p>

                <p className="mt-1 flex items-center gap-2 font-black">
                  <CheckCircle2 size={17} />
                  {statusLabel(submission.status)}
                </p>
              </div>

              <div className="rounded-2xl bg-sky-700 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-widest text-sky-100">
                  Progress
                </p>

                <p className="mt-1 flex items-center gap-2 font-black">
                  <Clock3 size={17} />
                  {submission.completionPercent}%
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-700 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-100">
                  Bukti
                </p>

                <p className="mt-1 flex items-center gap-2 font-black">
                  <Paperclip size={17} />
                  {evidences.length} file
                </p>
              </div>
            </div>
          </div>
        </section>

        <DupakPreview
          nomor={submission.nomor}
          instansi={submission.instansi}
          masaPenilaianStart={submission.masaPenilaianStart}
          masaPenilaianEnd={submission.masaPenilaianEnd}
          personalData={toObject<DupakPersonalData>(
            submission.personalData,
            {},
          )}
          creditData={toObject<DupakCreditData>(submission.creditData, {})}
          supportNotes={submission.supportNotes}
          evidences={evidences}
          showEvidenceColumn
        />
      </div>
    </AppShell>
  );
}
