/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import MetricCard from "@/components/dashboard/MetricCard";
import ActivityTimeline from "@/components/dashboard/AcitivityTimeline";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  UsersRound,
  XCircle,
} from "lucide-react";

function percent(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const dosen = await prisma.lecturerProfile.count();

  const totalSubmissions = await prisma.documentSubmission.count();

  const pending = await prisma.documentSubmission.count({
    where: {
      status: "PENDING",
    },
  });

  const valid = await prisma.documentSubmission.count({
    where: {
      status: "VALID",
    },
  });

  const revisi = await prisma.documentSubmission.count({
    where: {
      status: "REVISION",
    },
  });

  const rejected = await prisma.documentSubmission.count({
    where: {
      status: "REJECTED",
    },
  });

  const recentSubmissions = await prisma.documentSubmission.findMany({
    orderBy: {
      uploadedAt: "desc",
    },
    take: 6,
    include: {
      lecturer: true,
      requirement: {
        include: {
          category: true,
        },
      },
    },
  });

  const activityLogs = await prisma.activityLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 12,
    include: {
      actor: {
        select: {
          email: true,
          role: true,
        },
      },
    },
  });

  const validRate = percent(valid, totalSubmissions);

  return (
    <AppShell
      role="ADMIN"
      title="Dashboard Admin"
      subtitle="Pantau dokumen dosen, status verifikasi, dan aktivitas pengajuan secara terpusat."
    >
      <div className="space-y-6">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Dosen"
            value={dosen}
            desc="Dosen terdaftar"
            icon={<UsersRound size={24} />}
            tone="sky"
          />

          <MetricCard
            label="Total Dokumen"
            value={totalSubmissions}
            desc="Dokumen masuk"
            icon={<FileText size={24} />}
            tone="violet"
          />

          <MetricCard
            label="Menunggu"
            value={pending}
            desc="Perlu diperiksa"
            icon={<Clock3 size={24} />}
            tone="amber"
          />

          <MetricCard
            label="Valid"
            value={valid}
            desc={`${validRate}% dari dokumen`}
            icon={<CheckCircle2 size={24} />}
            tone="emerald"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                  Verification Pipeline
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Ringkasan Status
                </h2>

                <p className="mt-2 leading-7 text-slate-600">
                  Status dokumen masuk dapat dipantau sebelum admin melakukan
                  validasi lanjutan.
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <ShieldCheck size={27} />
              </div>
            </div>

            <div className="grid gap-3">
              <StatusRow
                icon={<CheckCircle2 size={18} />}
                label="Valid"
                value={valid}
                total={totalSubmissions}
                tone="emerald"
              />
              <StatusRow
                icon={<Clock3 size={18} />}
                label="Pending"
                value={pending}
                total={totalSubmissions}
                tone="amber"
              />
              <StatusRow
                icon={<RotateCcw size={18} />}
                label="Revisi"
                value={revisi}
                total={totalSubmissions}
                tone="sky"
              />
              <StatusRow
                icon={<XCircle size={18} />}
                label="Ditolak"
                value={rejected}
                total={totalSubmissions}
                tone="rose"
              />
            </div>

            <a
              href="/admin/dosen"
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-slate-800"
            >
              Buka Daftar Dosen
              <ArrowRight size={20} />
            </a>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                  Recent Uploads
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Dokumen Terbaru
                </h2>
              </div>

              <a
                href="/admin/dosen"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Lihat Semua
                <ArrowRight size={17} />
              </a>
            </div>

            <div className="grid gap-3">
              {recentSubmissions.length > 0 ? (
                recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                        <GraduationCap size={21} />
                      </div>

                      <div>
                        <p className="font-black text-slate-950">
                          {submission.lecturer.fullName}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {submission.requirement.name} •{" "}
                          {submission.requirement.category.name}
                        </p>
                      </div>
                    </div>

                    <StatusPill status={submission.status} />
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="font-bold text-slate-500">
                    Belum ada dokumen masuk.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <ActivityTimeline
          title="Aktivitas Sistem"
          subtitle="Riwayat aktivitas terbaru, termasuk upload dokumen dan verifikasi admin."
          logs={activityLogs}
          variant="ADMIN"
          emptyText="Belum ada aktivitas sistem."
        />
      </div>
    </AppShell>
  );
}

function StatusRow({
  icon,
  label,
  value,
  total,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  tone: "emerald" | "amber" | "sky" | "rose";
}) {
  const width = percent(value, total);

  const styles = {
    emerald: "bg-emerald-600 text-emerald-700 bg-emerald-50",
    amber: "bg-amber-500 text-amber-700 bg-amber-50",
    sky: "bg-sky-600 text-sky-700 bg-sky-50",
    rose: "bg-rose-600 text-rose-700 bg-rose-50",
  };

  const bar = {
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    sky: "bg-sky-600",
    rose: "bg-rose-600",
  };

  const badge = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${badge[tone]}`}
          >
            {icon}
          </div>

          <p className="font-black text-slate-800">{label}</p>
        </div>

        <p className="font-black text-slate-950">{value}</p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${bar[tone]}`}
          style={{ width: `${width}%` }}
        />
      </div>
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
