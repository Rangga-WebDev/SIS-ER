/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import DupakFormClient from "@/components/dosen/DupakFormClient";
import type { DupakCreditData, DupakPersonalData } from "@/lib/dupak-template";

/**
 * Helper untuk mengubah Date ke string input date yyyy-mm-dd
 */
function toDateInput(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

/**
 * Helper untuk memastikan object
 */
function toObject<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fallback;
  return value as T;
}

export default async function DosenDupakPage() {
  const user = await getCurrentUser();

  // Redirect jika belum login atau bukan dosen
  if (!user || user.role !== "DOSEN") redirect("/login");

  const lecturer = user.lecturerProfile;

  if (!lecturer) redirect("/login");

  // Ambil submission DUPAK dosen
  const submission = await prisma.dupakSubmission.findUnique({
    where: { lecturerId: lecturer.id },
  });

  // Default values jika submission belum ada
  const initialData = {
    nomor: submission?.nomor ?? "",
    instansi: submission?.instansi ?? lecturer.institution ?? "",
    masaPenilaianStart: submission?.masaPenilaianStart
      ? submission.masaPenilaianStart.toISOString().slice(0, 10)
      : "",
    masaPenilaianEnd: submission?.masaPenilaianEnd
      ? submission.masaPenilaianEnd.toISOString().slice(0, 10)
      : "",
    personalData: toObject<DupakPersonalData>(submission?.personalData, {
      nama: lecturer.fullName,
      nidnOrNuptk: lecturer.nidnOrNuptk,
      jabatanAkademikTmt: lecturer.academicPosition,
      unitKerja: lecturer.studyProgram,
    }),
    creditData: toObject<DupakCreditData>(submission?.creditData, {}),
    supportNotes: submission?.supportNotes ?? "",
    currentStep: submission?.currentStep ?? 1, // default step 1
  };

  return (
    <AppShell
      role="DOSEN"
      title="Pengisian DUPAK"
      subtitle="Isi format Daftar Usul Penetapan Angka Kredit secara bertahap."
    >
      <DupakFormClient initialData={initialData} />
    </AppShell>
  );
}
