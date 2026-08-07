/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import MetricCard from "@/components/dashboard/MetricCard";
import { getStatusBadgeClass, getStatusLabel } from "@/lib/dupak-workflow";

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function PakDashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "TIM_PAK") redirect("/login");

  const activeWhere = {
    pakUserId: user.id,
    status: "ACTIVE" as const,
  };

  const [
    active,
    activeCount,
    withAssessmentCount,
    decidedCount,
    needRevision,
    accepted,
    notRatified,
    ratified,
    nearDeadlineRows,
  ] = await Promise.all([
    prisma.pakAssignment.findMany({
      where: activeWhere,
      select: {
        id: true,
        deadline: true,
        submission: {
          select: {
            status: true,
            lecturer: {
              select: {
                fullName: true,
                studyProgram: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
      take: 6,
    }),
    prisma.pakAssignment.count({ where: activeWhere }),
    prisma.pakAssignment.count({
      where: {
        ...activeWhere,
        assessment: {
          isNot: null,
        },
      },
    }),
    prisma.pakAssignment.count({
      where: {
        ...activeWhere,
        assessment: {
          decision: {
            not: null,
          },
        },
      },
    }),
    prisma.pakAssignment.count({
      where: {
        ...activeWhere,
        assessment: {
          decision: "PERLU_REVISI",
        },
      },
    }),
    prisma.pakAssignment.count({
      where: {
        ...activeWhere,
        assessment: {
          decision: "DITERIMA",
        },
      },
    }),
    prisma.pakAssignment.count({
      where: {
        ...activeWhere,
        assessment: {
          decision: "DITERIMA",
          isRatified: false,
        },
      },
    }),
    prisma.pakAssignment.count({
      where: {
        pakUserId: user.id,
        assessment: {
          isRatified: true,
        },
      },
    }),
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS "count"
      FROM "PakAssignment" AS assignment
      LEFT JOIN "PakAssessment" AS assessment
        ON assessment."assignmentId" = assignment."id"
      WHERE assignment."pakUserId" = ${user.id}
        AND assignment."status" = 'ACTIVE'
        AND assignment."deadline" >= CURRENT_TIMESTAMP
        AND assignment."deadline" <= CURRENT_TIMESTAMP + INTERVAL '3 days'
        AND (assessment."id" IS NULL OR assessment."isRatified" = false)
    `,
  ]);

  const newTasks = activeCount - withAssessmentCount;
  const inProgress = withAssessmentCount - decidedCount;
  const nearDeadlineCount = nearDeadlineRows[0]?.count || 0;

  return (
    <AppShell
      role="TIM_PAK"
      title={`Dashboard Tim PAK`}
      subtitle="Ringkasan tugas penilaian DUPAK yang ditugaskan khusus kepada akun Anda."
    >
      <div className="space-y-6">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Tugas Baru"
            value={newTasks}
            desc="Belum mulai dinilai"
            icon={<ClipboardCheck size={24} />}
            tone="sky"
          />

          <MetricCard
            label="Sedang Diperiksa"
            value={inProgress}
            desc="Draft penilaian berjalan"
            icon={<Clock3 size={24} />}
            tone="violet"
          />

          <MetricCard
            label="Perlu Revisi"
            value={needRevision}
            desc="Menunggu perbaikan dosen"
            icon={<RotateCcw size={24} />}
            tone="amber"
          />

          <MetricCard
            label="Telah Diterima"
            value={accepted}
            desc={`${notRatified} belum disahkan`}
            icon={<CheckCircle2 size={24} />}
            tone="emerald"
          />
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <LockKeyhole size={21} />
              </div>

              <div>
                <p className="text-2xl font-black text-slate-950">{ratified}</p>
                <p className="text-sm font-bold text-slate-500">
                  Penilaian telah disahkan
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <AlarmClock size={21} />
              </div>

              <div>
                <p className="text-2xl font-black text-slate-950">
                  {nearDeadlineCount}
                </p>
                <p className="text-sm font-bold text-slate-500">
                  Tugas mendekati batas waktu (&lt; 3 hari)
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <FileCheck2 size={21} />
              </div>

              <h2 className="text-xl font-black text-slate-950">
                Tugas Penilaian Terbaru
              </h2>
            </div>

            <Link
              href="/pak/tugas"
              className="inline-flex items-center gap-2 text-sm font-black text-sky-700 hover:text-sky-900"
            >
              Lihat Semua
              <ArrowRight size={16} />
            </Link>
          </div>

          {active.length === 0 ? (
            <p className="p-8 text-center text-sm font-bold text-slate-400">
              Belum ada tugas penilaian aktif untuk akun Anda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {active.map((item) => (
                <Link
                  key={item.id}
                  href={`/pak/tugas/${item.id}`}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-black text-slate-900">
                      {item.submission.lecturer.fullName}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      {item.submission.lecturer.studyProgram} • Batas waktu:{" "}
                      {formatDate(item.deadline)}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(item.submission.status)}`}
                  >
                    {getStatusLabel(item.submission.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
