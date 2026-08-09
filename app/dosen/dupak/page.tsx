/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import DupakFormClient from "@/components/dosen/DupakFormClient";
import StatusTimeline from "@/components/workflow/StatusTimeline";
import { isLecturerEditable } from "@/lib/dupak-workflow";
import type { DupakStatus } from "@/lib/app-types";
import type { DupakCreditData, DupakPersonalData } from "@/lib/dupak-template";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toDateInput(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function toObject<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return value as T;
}

export default async function DosenDupakPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "DOSEN") redirect("/login");

  const lecturer = user.lecturerProfile;

  if (!lecturer) redirect("/login");

  const submission = await prisma.dupakSubmission.findUnique({
    where: {
      lecturerId: lecturer.id,
    },
    include: {
      itemEntries: {
        orderBy: [{ rowCode: "asc" }, { orderIndex: "asc" }],
      },
      itemReviews: {
        where: {
          assignment: {
            status: "ACTIVE",
          },
        },
        select: {
          rowCode: true,
          entryKey: true,
          status: true,
          comment: true,
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
      statusHistories: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      },
      pakAssignments: {
        where: {
          status: {
            in: ["ACTIVE", "COMPLETED"],
          },
        },
        include: {
          assessment: {
            select: {
              decision: true,
              lecturerRevisionNote: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  const evidences =
    submission?.evidences.map((evidence) => ({
      id: evidence.id,
      rowCode: evidence.rowCode,
      rowLabel: evidence.rowLabel,
      evidenceUrl: evidence.evidenceUrl ?? null,
      fileName: evidence.fileName ?? null,
      fileSize: evidence.fileSize ?? null,
      mimeType: evidence.mimeType ?? null,
      note: evidence.note,
      uploadedAt: evidence.uploadedAt.toISOString(),
    })) || [];

  const status = (submission?.status || "DRAFT") as DupakStatus;
  const editable = isLecturerEditable(status);

  const entries =
    submission?.itemEntries.map((entry) => ({
      id: entry.id,
      rowCode: entry.rowCode,
      title: entry.title,
      subCategory: entry.subCategory,
      description: entry.description,
      activityYear: entry.activityYear,
      credit: entry.credit,
      evidenceUrl: entry.evidenceUrl,
      orderIndex: entry.orderIndex,
    })) || [];

  // Komentar per item hanya ditampilkan setelah Tim PAK meminta revisi
  // (atau dosen sedang/telah mengirim ulang) agar penilaian berjalan tidak bocor.
  const showItemReviews =
    status === "PERLU_REVISI_TIM_PAK" ||
    status === "DIKIRIM_ULANG_SETELAH_REVISI" ||
    status === "REVISION";

  const reviews = showItemReviews
    ? (submission?.itemReviews || [])
        .filter((review) => review.status)
        .map((review) => ({
          rowCode: review.rowCode,
          entryKey: review.entryKey,
          status: review.status as
            | "SESUAI"
            | "PERLU_REVISI"
            | "TIDAK_SESUAI"
            | "DIREVISI_DOSEN",
          comment: review.comment,
        }))
    : [];

  const initialData = {
    nomor: submission?.nomor ?? "",
    instansi: submission?.instansi ?? lecturer.institution ?? "",
    masaPenilaianStart: toDateInput(submission?.masaPenilaianStart),
    masaPenilaianEnd: toDateInput(submission?.masaPenilaianEnd),
    personalData: toObject<DupakPersonalData>(submission?.personalData, {
      nama: lecturer.fullName,
      nidnOrNuptk: lecturer.nidnOrNuptk,
      jabatanAkademikTmt: lecturer.academicPosition,
      unitKerja: lecturer.studyProgram,
    }),
    creditData: toObject<DupakCreditData>(submission?.creditData, {}),
    supportNotes: submission?.supportNotes ?? "",
    currentStep: submission?.currentStep ?? 1,
    evidences,
    entries,
    reviews,
  };

  // Catatan revisi yang memang ditujukan kepada dosen (bukan catatan internal).
  const revisionNotes = [
    ...(submission?.adminNote &&
    (status === "PERLU_PERBAIKAN_ADMIN" || status === "DITOLAK_ADMIN")
      ? [
          {
            id: "admin",
            source: "Admin Tim PAK",
            note: submission.adminNote,
          },
        ]
      : []),
    ...(submission?.pakAssignments || [])
      .filter(
        (assignment) =>
          assignment.assessment?.decision === "PERLU_REVISI" &&
          assignment.assessment.lecturerRevisionNote,
      )
      .map((assignment) => ({
        id: assignment.id,
        source: "Tim PAK",
        note: assignment.assessment!.lecturerRevisionNote as string,
      })),
  ];

  return (
    <AppShell
      role="DOSEN"
      title="Pengisian DUPAK"
      subtitle="Isi format Daftar Usul Penetapan Angka Kredit dan unggah bukti dokumen per baris kegiatan."
    >
      <div className="space-y-6">
        {submission && (
          <StatusTimeline
            status={status}
            histories={submission.statusHistories}
          />
        )}

        {revisionNotes.length > 0 && (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h3 className="text-lg font-black text-amber-900">
              Catatan Revisi untuk Anda
            </h3>

            <div className="mt-3 grid gap-2">
              {revisionNotes.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-amber-200 bg-white px-4 py-3"
                >
                  <p className="text-xs font-black uppercase tracking-widest text-amber-600">
                    {item.source}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!editable && (
          <section className="rounded-[2rem] border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <p className="text-sm font-bold leading-6 text-sky-800">
              Pengajuan Anda sedang diproses dan formulir terkunci. Perubahan
              hanya dapat dilakukan jika pengajuan dikembalikan untuk revisi.
            </p>
          </section>
        )}

        <DupakFormClient initialData={initialData} readOnly={!editable} />
      </div>
    </AppShell>
  );
}
