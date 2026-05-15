/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import DupakPreview from "@/components/dupak/DupakPreview";
import type { DupakCreditData, DupakPersonalData } from "@/lib/dupak-template";

function toObject<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fallback;
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
  params: Promise<{ id: string }>;
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
          user: true,
        },
      },
    },
  });

  if (!submission) redirect("/admin/dupak");

  return (
    <AppShell
      role="ADMIN"
      title="Preview DUPAK"
      subtitle="Preview hasil pengisian DUPAK dosen."
    >
      <div className="space-y-6">
        <Link
          href="/admin/dupak"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Kembali ke Monitoring DUPAK
        </Link>

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
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
        />
      </div>
    </AppShell>
  );
}
