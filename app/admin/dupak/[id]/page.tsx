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
import DupakVerifyForm from "@/components/admin/DupakVerifyForm";
import PakAssignmentForm, {
  type AssignmentItem,
  type PakMemberOption,
} from "@/components/admin/PakAssignmentForm";
import BeritaAcaraForm, {
  type MinuteContent,
} from "@/components/admin/BeritaAcaraForm";
import StatusTimeline from "@/components/workflow/StatusTimeline";
import { getStatusLabel } from "@/lib/dupak-workflow";
import type { DupakStatus } from "@/lib/app-types";
import {
  computeDupakSubtotals,
  type DupakCreditData,
  type DupakPersonalData,
} from "@/lib/dupak-template";

function toObject<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return value as T;
}

const VERIFIABLE_STATUSES: DupakStatus[] = [
  "SUBMITTED",
  "DITOLAK_ADMIN",
  "REJECTED",
];

const ASSIGNABLE_STATUSES: DupakStatus[] = [
  "LOLOS_VERIFIKASI_ADMIN",
  "DITUGASKAN_KE_TIM_PAK",
  "SEDANG_DINILAI",
  "DIKIRIM_ULANG_SETELAH_REVISI",
];

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
          evidenceUrl: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          note: true,
          uploadedAt: true,
        },
      },
      pakAssignments: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          pakUser: {
            select: {
              email: true,
            },
          },
          assessment: {
            select: {
              isRatified: true,
              decision: true,
              totalScore: true,
            },
          },
        },
      },
      examinationMinute: true,
      statusHistories: {
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
    },
  });

  if (!submission) redirect("/admin/dupak");

  const pakMembersRaw = await prisma.user.findMany({
    where: {
      role: "TIM_PAK",
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      _count: {
        select: {
          pakAssignments: {
            where: {
              status: "ACTIVE",
            },
          },
        },
      },
    },
    orderBy: {
      email: "asc",
    },
  });

  const pakMembers: PakMemberOption[] = pakMembersRaw.map((member) => ({
    id: member.id,
    email: member.email,
    activeCount: member._count.pakAssignments,
  }));

  const assignments: AssignmentItem[] = submission.pakAssignments.map(
    (assignment) => ({
      id: assignment.id,
      pakUserId: assignment.pakUserId,
      pakEmail: assignment.pakUser.email,
      status: assignment.status,
      deadline: assignment.deadline?.toISOString() || null,
      assignmentNote: assignment.assignmentNote,
      isRatified: assignment.assessment?.isRatified || false,
    }),
  );

  const status = submission.status as DupakStatus;
  const minute = submission.examinationMinute;
  const minuteContent = toObject<MinuteContent>(minute?.content, {});

  // Prefill unsur BA dari subtotal penilai; isian admin yang tersimpan menang.
  const creditDataObject = toObject<DupakCreditData>(submission.creditData, {});
  const subtotals = computeDupakSubtotals(creditDataObject);

  const asText = (value?: number) => (value ? String(value) : "");

  const unsurPendidikanTotal =
    (subtotals["JUMLAH_UNSUR_PENDIDIKAN"]?.assessorTotal || 0) +
    (subtotals["JUMLAH_UNSUR_PENGAJARAN"]?.assessorTotal || 0);

  const minuteDefaults: MinuteContent = {
    jabatanSaatIni: submission.lecturer.academicPosition,
    unsurPendidikan: asText(Math.round(unsurPendidikanTotal * 100) / 100),
    unsurPenelitian: asText(
      subtotals["JUMLAH_UNSUR_PENELITIAN"]?.assessorTotal,
    ),
    unsurPengabdian: asText(
      subtotals["JUMLAH_UNSUR_PENGABDIAN"]?.assessorTotal,
    ),
    unsurPenunjang: asText(subtotals["JUMLAH_UNSUR_PENUNJANG"]?.assessorTotal),
    jumlahKeseluruhan: asText(
      subtotals["JUMLAH_UTAMA_DAN_PENUNJANG"]?.assessorTotal,
    ),
    kumDicapai: asText(subtotals["JUMLAH_UTAMA_DAN_PENUNJANG"]?.assessorTotal),
  };

  const mergedMinuteContent: MinuteContent = { ...minuteDefaults };

  for (const [key, value] of Object.entries(minuteContent)) {
    if (String(value || "").trim()) {
      mergedMinuteContent[key as keyof MinuteContent] = value;
    }
  }

  const evidences =
    submission.evidences.map((evidence) => ({
      id: evidence.id,
      rowCode: evidence.rowCode,
      rowLabel: evidence.rowLabel,
      evidenceUrl: evidence.evidenceUrl ?? null,
      fileName: evidence.fileName ?? null,
      fileSize: evidence.fileSize ?? null,
      mimeType: evidence.mimeType ?? null,
      note: evidence.note,
      uploadedAt: evidence.uploadedAt,
    })) || [];

  return (
    <AppShell
      role="ADMIN"
      title="Detail Pengajuan DUPAK"
      subtitle="Verifikasi, penugasan Tim PAK, pemantauan penilaian, dan berita acara dalam satu halaman."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/dupak"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Kembali ke Pengajuan DUPAK
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

                <p className="mt-1 flex items-center gap-2 text-sm font-black">
                  <CheckCircle2 size={16} className="shrink-0" />
                  {getStatusLabel(status)}
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

        <StatusTimeline
          status={status}
          histories={submission.statusHistories}
        />

        {VERIFIABLE_STATUSES.includes(status) && (
          <DupakVerifyForm dupakId={submission.id} />
        )}

        <PakAssignmentForm
          dupakId={submission.id}
          canAssign={ASSIGNABLE_STATUSES.includes(status)}
          pakMembers={pakMembers}
          assignments={assignments}
        />

        <BeritaAcaraForm
          dupakId={submission.id}
          status={status}
          minuteStatus={
            minute ? (minute.status === "FINAL" ? "FINAL" : "DRAFT") : "NONE"
          }
          initialNomor={minute?.nomor || ""}
          initialDate={
            minute?.examinationDate
              ? minute.examinationDate.toISOString().slice(0, 10)
              : ""
          }
          initialContent={mergedMinuteContent}
        />

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
