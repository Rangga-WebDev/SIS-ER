/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/dashboard/AppShell";
import ProfileSettingsForm from "@/components/dosen/ProfileSettingsForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DosenSettingsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "DOSEN") redirect("/login");

  const lecturer = user.lecturerProfile;

  if (!lecturer) redirect("/login");

  return (
    <AppShell
      role="DOSEN"
      title="Pengaturan Profil"
      subtitle="Kelola data profil, informasi akademik, dan foto dosen."
    >
      <ProfileSettingsForm
        initialData={{
          id: lecturer.id,
          firstName: lecturer.firstName,
          lastName: lecturer.lastName,
          fullName: lecturer.fullName,
          nidnOrNuptk: lecturer.nidnOrNuptk,
          phone: lecturer.phone || "",
          institution: lecturer.institution,
          faculty: lecturer.faculty || "",
          studyProgram: lecturer.studyProgram,
          academicPosition: lecturer.academicPosition,
          lecturerStatus: lecturer.lecturerStatus,
        }}
      />
    </AppShell>
  );
}
