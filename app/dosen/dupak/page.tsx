/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import DupakFormClient from "@/components/dosen/DupakFormClient";
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

  const evidences =
    submission?.evidences.map((evidence) => ({
      id: evidence.id,
      rowCode: evidence.rowCode,
      rowLabel: evidence.rowLabel,
      fileName: evidence.fileName,
      fileSize: evidence.fileSize,
      mimeType: evidence.mimeType,
      note: evidence.note,
      uploadedAt: evidence.uploadedAt.toISOString(),
    })) || [];

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
  };

  return (
    <AppShell
      role="DOSEN"
      title="Pengisian DUPAK"
      subtitle="Isi format Daftar Usul Penetapan Angka Kredit dan unggah bukti dokumen per baris kegiatan."
    >
      <DupakFormClient initialData={initialData} />
    </AppShell>
  );
}
