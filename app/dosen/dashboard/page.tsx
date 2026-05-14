/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import MetricCard from "@/components/dashboard/MetricCard";
import ActivityTimeline from "@/components/dashboard/AcitivityTimeline";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";

function percent(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export default async function DosenDashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "DOSEN") redirect("/login");

  const lecturer = user.lecturerProfile;

  if (!lecturer) redirect("/login");

  const totalRequirement = await prisma.documentRequirement.count({
    where: {
      audience: {
        in: ["DOSEN", "BOTH"],
      },
    },
  });

  const submissions = await prisma.documentSubmission.findMany({
    where: {
      lecturerId: lecturer.id,
    },
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
    take: 6,
  });

  const submissionIds = submissions.map((submission) => submission.id);

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      OR: [
        {
          actorId: user.id,
        },
        ...(submissionIds.length > 0
          ? [
              {
                entity: "DocumentSubmission",
                entityId: {
                  in: submissionIds,
                },
              },
            ]
          : []),
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      actor: {
        select: {
          email: true,
          role: true,
        },
      },
    },
  });

  const uploaded = submissions.length;

  const valid = await prisma.documentSubmission.count({
    where: {
      lecturerId: lecturer.id,
      status: "VALID",
    },
  });

  const pending = await prisma.documentSubmission.count({
    where: {
      lecturerId: lecturer.id,
      status: "PENDING",
    },
  });

  const revision = await prisma.documentSubmission.count({
    where: {
      lecturerId: lecturer.id,
      status: "REVISION",
    },
  });

  const progress = percent(uploaded, totalRequirement);

  return (
    <AppShell
      role="DOSEN"
      title={`Halo, ${lecturer.fullName}`}
      subtitle="Pantau progres upload, status validasi, dan kelengkapan dokumen kenaikan jabatan Anda."
    >
      <div className="space-y-6">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Kebutuhan"
            value={totalRequirement}
            desc="Total dokumen yang perlu dipenuhi"
            icon={<FileText size={24} />}
            tone="sky"
          />

          <MetricCard
            label="Sudah Upload"
            value={uploaded}
            desc={`${progress}% dari total kebutuhan`}
            icon={<UploadCloud size={24} />}
            tone="violet"
          />

          <MetricCard
            label="Valid"
            value={valid}
            desc="Dokumen diterima admin"
            icon={<CheckCircle2 size={24} />}
            tone="emerald"
          />

          <MetricCard
            label="Perlu Tindak Lanjut"
            value={revision + pending}
            desc={`${pending} pending, ${revision} revisi`}
            icon={<Clock3 size={24} />}
            tone={revision > 0 ? "rose" : "amber"}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                  Progress
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Kelengkapan Dokumen
                </h2>

                <p className="mt-2 leading-7 text-slate-600">
                  Lengkapi seluruh dokumen agar admin dapat melakukan validasi.
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <ShieldCheck size={27} />
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-400">
                    Completion Rate
                  </p>
                  <p className="mt-2 text-5xl font-black">{progress}%</p>
                </div>

                <p className="pb-2 text-sm font-bold text-slate-400">
                  {uploaded}/{totalRequirement} dokumen
                </p>
              </div>

              <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <a
              href="/dosen/dokumen"
              className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-sky-700 px-5 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-sky-800"
            >
              Lanjut Upload Dokumen
              <ArrowRight size={20} />
            </a>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                  Profil Dosen
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Informasi Akademik
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <UserRound size={27} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Info label="Email" value={user.email} />
              <Info label="NIDN/NUPTK" value={lecturer.nidnOrNuptk} />
              <Info label="Program Studi" value={lecturer.studyProgram} />
              <Info label="Jabatan" value={lecturer.academicPosition} />
              <Info label="Status Dosen" value={lecturer.lecturerStatus} />
              <Info label="Institusi" value={lecturer.institution} />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                Aktivitas Terbaru
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Dokumen Terakhir
              </h2>
            </div>

            <a
              href="/dosen/dokumen"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Lihat Semua
              <ArrowRight size={17} />
            </a>
          </div>

          <div className="grid gap-3">
            {submissions.length > 0 ? (
              submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-black text-slate-950">
                      {submission.requirement.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {submission.requirement.category.name} •{" "}
                      {submission.fileName ||
                        submission.externalUrl ||
                        "Data metadata"}
                    </p>
                  </div>

                  <StatusPill status={submission.status} />
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <AlertCircle className="mx-auto mb-3 text-slate-400" />
                <p className="font-bold text-slate-500">
                  Belum ada dokumen yang diupload.
                </p>
              </div>
            )}
          </div>
        </section>
        <ActivityTimeline
          title="Aktivitas Saya"
          subtitle="Riwayat upload dokumen dan hasil verifikasi admin terhadap dokumen Anda."
          logs={activityLogs}
          variant="DOSEN"
          emptyText="Belum ada aktivitas dokumen."
        />
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-bold text-slate-900">{value || "-"}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    VALID: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    REVISION: "border-sky-200 bg-sky-50 text-sky-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700",
    NOT_UPLOADED: "border-slate-200 bg-slate-50 text-slate-600",
  };

  const labels: Record<string, string> = {
    VALID: "Valid",
    PENDING: "Menunggu",
    REVISION: "Revisi",
    REJECTED: "Ditolak",
    NOT_UPLOADED: "Belum Upload",
  };

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-black ${
        styles[status] || styles.NOT_UPLOADED
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
