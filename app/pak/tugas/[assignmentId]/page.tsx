/** @format */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, StickyNote, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import AppShell from "@/components/dashboard/AppShell";
import DupakPreview from "@/components/dupak/DupakPreview";
import AssessmentWorkbench, {
  type AssessmentEntryItem,
  type WorkbenchReview,
} from "@/components/pak/AssessmentWorkbench";
import PakDecisionForm from "@/components/pak/PakDecisionForm";
import StatusTimeline from "@/components/workflow/StatusTimeline";
import { toCreditData } from "@/lib/pak-access";
import {
  buildReviewUnits,
  computeReviewValidation,
  reviewUnitKey,
  type DupakItemReviewData,
} from "@/lib/dupak-review";
import type { DupakStatus } from "@/lib/app-types";
import {
  DUPAK_TEMPLATE_ROWS,
  type DupakPersonalData,
} from "@/lib/dupak-template";

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

export default async function PakTugasDetailPage({
  params,
}: {
  params: Promise<{
    assignmentId: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "TIM_PAK") redirect("/login");

  const { assignmentId } = await params;

  // Akses dibatasi ketat pada penugasan milik akun ini.
  const assignment = await prisma.pakAssignment.findFirst({
    where: {
      id: assignmentId,
      pakUserId: user.id,
    },
    include: {
      assessment: true,
      itemReviews: true,
      submission: {
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
          itemEntries: {
            orderBy: [{ rowCode: "asc" }, { orderIndex: "asc" }],
          },
          evidences: {
            orderBy: {
              uploadedAt: "desc",
            },
            select: {
              id: true,
              rowCode: true,
              rowLabel: true,
              evidenceUrl: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              note: true,
              uploadedAt: true,
            },
          },
          statusHistories: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          },
        },
      },
    },
  });

  if (!assignment) redirect("/pak/tugas");

  const submission = assignment.submission;
  const status = submission.status as DupakStatus;
  const creditData = toCreditData(submission.creditData);

  const isActive = assignment.status === "ACTIVE";
  const isRatified = assignment.assessment?.isRatified || false;

  // Unit penilaian: per rincian jika ada, per baris jika hanya AK/bukti.
  const reviewUnits = buildReviewUnits({
    creditData,
    entries: submission.itemEntries,
    evidences: submission.evidences,
  });

  const reviewData: DupakItemReviewData[] = assignment.itemReviews.map(
    (review) => ({
      rowCode: review.rowCode,
      entryKey: review.entryKey,
      assessedCredit: review.assessedCredit,
      status: review.status,
      comment: review.comment,
    }),
  );

  const reviewValidation = computeReviewValidation(reviewUnits, reviewData);

  // Total AK dinilai dihitung dari review milik unit yang masih relevan.
  const unitKeySet = new Set(
    reviewUnits.map((unit) => reviewUnitKey(unit.rowCode, unit.entryKey)),
  );

  const assessedTotal =
    Math.round(
      reviewData
        .filter((review) =>
          unitKeySet.has(reviewUnitKey(review.rowCode, review.entryKey)),
        )
        .reduce(
          (sum, review) =>
            sum +
            (Number(String(review.assessedCredit || "").replace(",", ".")) ||
              0),
          0,
        ) * 100,
    ) / 100;

  const rowLabelMap = new Map(
    DUPAK_TEMPLATE_ROWS.map((row) => [row.code, row.label]),
  );

  const rowEvidences: Record<string, string> = {};
  for (const evidence of submission.evidences) {
    if (evidence.evidenceUrl && !rowEvidences[evidence.rowCode]) {
      rowEvidences[evidence.rowCode] = evidence.evidenceUrl;
    }
  }

  const tableEntries: AssessmentEntryItem[] = submission.itemEntries.map(
    (entry) => ({
      id: entry.id,
      rowCode: entry.rowCode,
      title: entry.title,
      subCategory: entry.subCategory,
      description: entry.description,
      activityYear: entry.activityYear,
      credit: entry.credit,
      evidenceUrl: entry.evidenceUrl,
      orderIndex: entry.orderIndex,
    }),
  );

  const initialReviews: Record<string, WorkbenchReview> = {};
  for (const review of assignment.itemReviews) {
    initialReviews[reviewUnitKey(review.rowCode, review.entryKey)] = {
      assessedCredit: review.assessedCredit || "",
      status: (review.status || "") as WorkbenchReview["status"],
      comment: review.comment || "",
    };
  }

  // Catatan revisi otomatis dari komentar item bermasalah.
  const entryTitleMap = new Map(
    submission.itemEntries.map((entry) => [entry.id, entry.title]),
  );

  const suggestedRevisionNote = assignment.itemReviews
    .filter(
      (review) =>
        (review.status === "PERLU_REVISI" ||
          review.status === "TIDAK_SESUAI") &&
        String(review.comment || "").trim(),
    )
    .map((review) => {
      const rowLabel = rowLabelMap.get(review.rowCode) || review.rowCode;
      const entryTitle = review.entryKey
        ? entryTitleMap.get(review.entryKey)
        : null;
      const label = entryTitle ? `${rowLabel} — ${entryTitle}` : rowLabel;
      return `• ${label}: ${review.comment}`;
    })
    .join("\n");

  const pendingCount =
    reviewValidation.issues.length + reviewValidation.outstanding.length;

  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: "PAK_OPEN_SUBMISSION",
    entity: "PakAssignment",
    entityId: assignment.id,
    metadata: {
      submissionId: submission.id,
    },
  });

  const evidences = submission.evidences.map((evidence) => ({
    id: evidence.id,
    rowCode: evidence.rowCode,
    rowLabel: evidence.rowLabel,
    evidenceUrl: evidence.evidenceUrl ?? null,
    fileName: evidence.fileName ?? null,
    fileSize: evidence.fileSize ?? null,
    mimeType: evidence.mimeType ?? null,
    note: evidence.note,
    uploadedAt: evidence.uploadedAt,
  }));

  return (
    <AppShell
      role="TIM_PAK"
      title={`Penilaian DUPAK`}
      subtitle="Periksa rincian DUPAK, bukti dokumen per baris kegiatan, lalu isi penilaian dan keputusan."
    >
      <div className="space-y-6">
        <Link
          href="/pak/tugas"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Kembali ke Tugas Penilaian
        </Link>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                Identitas Pengusul
              </p>

              <h2 className="mt-2 text-3xl font-black text-slate-950">
                {submission.lecturer.fullName}
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                {submission.lecturer.user.email} •{" "}
                {submission.lecturer.studyProgram}
              </p>

              <p className="mt-2 text-sm font-bold text-slate-400">
                NIDN/NUPTK: {submission.lecturer.nidnOrNuptk} • Jabatan saat
                ini: {submission.lecturer.academicPosition}
              </p>

              {isActive && (
                <Link
                  href={`/pak/dosen/${submission.lecturer.id}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-black text-sky-700 transition hover:bg-sky-100"
                >
                  <UserRound size={16} />
                  Lihat Detail Dosen & Dokumen
                </Link>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Batas Waktu
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-black">
                  <CalendarClock size={16} />
                  {formatDate(assignment.deadline)}
                </p>
              </div>

              <div className="rounded-2xl bg-sky-700 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-widest text-sky-100">
                  Catatan Penugasan
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-black">
                  <StickyNote size={16} className="shrink-0" />
                  <span className="line-clamp-2">
                    {assignment.assignmentNote || "-"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {!isActive && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              Penugasan ini berstatus {assignment.status}. Anda tidak dapat
              mengubah penilaian.
            </p>
          )}
        </section>

        <StatusTimeline
          status={status}
          histories={submission.statusHistories}
        />

        <AssessmentWorkbench
          assignmentId={assignment.id}
          creditData={creditData}
          entries={tableEntries}
          rowEvidences={rowEvidences}
          initialReviews={initialReviews}
          readOnly={!isActive || isRatified}
        />

        {isActive && (
          <PakDecisionForm
            assignmentId={assignment.id}
            decision={assignment.assessment?.decision || null}
            isRatified={isRatified}
            isComplete={reviewValidation.okForAccept}
            missingCount={pendingCount}
            totalScore={reviewValidation.progress.total > 0 ? assessedTotal : 0}
            suggestedRevisionNote={suggestedRevisionNote || undefined}
          />
        )}

        <details className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer select-none rounded-[2rem] px-6 py-5 text-lg font-black text-slate-800 transition hover:bg-slate-50">
            Lihat Format DUPAK Lengkap (Lampiran)
          </summary>

          <div className="px-2 pb-2">
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
              evidences={evidences}
              entries={submission.itemEntries}
              showEvidenceColumn
            />
          </div>
        </details>
      </div>
    </AppShell>
  );
}
