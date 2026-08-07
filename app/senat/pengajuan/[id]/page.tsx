/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import StatusTimeline from "@/components/workflow/StatusTimeline";
import ReviewDecisionForm from "@/components/workflow/ReviewDecisionForm";
import DupakPreview from "@/components/dupak/DupakPreview";
import {
  canSenateSee,
  computeAssessmentCompleteness,
  toCreditData,
} from "@/lib/pak-access";
import type { DupakStatus } from "@/lib/app-types";
import type { DupakPersonalData } from "@/lib/dupak-template";

function toObject<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return value as T;
}

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default async function SenatPengajuanDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "TIM_SENAT") redirect("/login");

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
      examinationMinute: true,
      pakAssignments: {
        where: {
          status: "COMPLETED",
        },
        include: {
          pakUser: {
            select: {
              email: true,
            },
          },
          assessment: {
            select: {
              totalScore: true,
              isRatified: true,
              ratifiedAt: true,
            },
          },
        },
      },
      senateReviews: {
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

  // Senat hanya boleh membuka pengajuan dengan berita acara sah.
  if (
    !submission ||
    !canSenateSee(submission.status) ||
    submission.examinationMinute?.status !== "FINAL"
  ) {
    redirect("/senat/dashboard");
  }

  const status = submission.status as DupakStatus;
  const creditData = toCreditData(submission.creditData);
  const completeness = computeAssessmentCompleteness(creditData);
  const minute = submission.examinationMinute;

  return (
    <AppShell
      role="TIM_SENAT"
      title="Tinjauan Tim Senat"
      subtitle="Berita acara pemeriksaan, hasil penilaian yang disahkan, dan keputusan senat."
    >
      <div className="space-y-6">
        <Link
          href="/senat/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Kembali ke Dashboard
        </Link>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-700">
                Identitas Pengusul
              </p>

              <h2 className="mt-2 text-3xl font-black text-slate-950">
                {submission.lecturer.fullName}
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                {submission.lecturer.user.email} • NIDN/NUPTK:{" "}
                {submission.lecturer.nidnOrNuptk} •{" "}
                {submission.lecturer.studyProgram}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-700 px-6 py-4 text-white">
              <p className="text-xs font-black uppercase tracking-widest text-blue-100">
                Total KUM Tim Penilai
              </p>
              <p className="mt-1 text-3xl font-black">
                {completeness.totalScore}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-violet-200 bg-violet-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-700 text-white">
                <ScrollText size={21} />
              </div>

              <div>
                <h3 className="text-xl font-black text-violet-950">
                  Berita Acara Pemeriksaan (Disahkan)
                </h3>
                <p className="text-sm font-bold text-violet-700">
                  Nomor: {minute?.nomor || "-"} • Tanggal pemeriksaan:{" "}
                  {formatDate(minute?.examinationDate)} • Disahkan:{" "}
                  {formatDate(minute?.ratifiedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-500">
              Tim Penilai
            </p>

            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {submission.pakAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-violet-200 bg-white px-4 py-3"
                >
                  <p className="text-sm font-black text-slate-900">
                    {assignment.pakUser.email}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    Total nilai: {assignment.assessment?.totalScore ?? "-"} •
                    Disahkan {formatDate(assignment.assessment?.ratifiedAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <StatusTimeline
          status={status}
          histories={submission.statusHistories}
        />

        {submission.senateReviews.length > 0 && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-black text-slate-950">
              Riwayat Keputusan Senat
            </h3>

            <div className="mt-4 grid gap-2">
              {submission.senateReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="text-sm font-black text-slate-900">
                    {review.decision === "DISETUJUI"
                      ? "Disetujui"
                      : "Dikembalikan"}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    {review.note}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {review.reviewerEmail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {status === "PEMERIKSAAN_SENAT" && (
          <ReviewDecisionForm
            title="Keputusan Tim Senat"
            endpoint={`/api/senat/dupak/${submission.id}/review`}
            fieldName="decision"
            options={[
              { value: "DISETUJUI", label: "Disetujui (Selesai)" },
              {
                value: "DIKEMBALIKAN",
                label: "Dikembalikan ke Pemeriksaan Integritas",
              },
            ]}
          />
        )}

        <DupakPreview
          nomor={submission.nomor}
          instansi={submission.instansi}
          masaPenilaianStart={submission.masaPenilaianStart}
          masaPenilaianEnd={submission.masaPenilaianEnd}
          personalData={toObject<DupakPersonalData>(
            submission.personalData,
            {},
          )}
          creditData={creditData}
          supportNotes={submission.supportNotes}
        />
      </div>
    </AppShell>
  );
}
