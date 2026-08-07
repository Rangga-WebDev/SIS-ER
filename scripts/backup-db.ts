/** @format */

// Backup ringan seluruh tabel ke JSON sebelum migrasi struktur.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/prisma";

async function main() {
  const [
    users,
    lecturerProfiles,
    documentCategories,
    documentRequirements,
    documentSubmissions,
    documentVersions,
    verificationLogs,
    activityLogs,
    notifications,
    dupakSubmissions,
    dupakEvidences,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.lecturerProfile.findMany(),
    prisma.documentCategory.findMany(),
    prisma.documentRequirement.findMany(),
    prisma.documentSubmission.findMany(),
    prisma.documentVersion.findMany(),
    prisma.verificationLog.findMany(),
    prisma.activityLog.findMany(),
    prisma.notification.findMany(),
    prisma.dupakSubmission.findMany(),
    prisma.dupakEvidence.findMany(),
  ]);

  const backup = {
    createdAt: new Date().toISOString(),
    counts: {
      users: users.length,
      lecturerProfiles: lecturerProfiles.length,
      documentSubmissions: documentSubmissions.length,
      dupakSubmissions: dupakSubmissions.length,
    },
    data: {
      users,
      lecturerProfiles,
      documentCategories,
      documentRequirements,
      documentSubmissions,
      documentVersions,
      verificationLogs,
      activityLogs,
      notifications,
      dupakSubmissions,
      dupakEvidences,
    },
  };

  const dir = join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });

  const file = join(
    dir,
    `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );

  writeFileSync(file, JSON.stringify(backup, null, 2), "utf-8");

  console.log(`Backup selesai: ${file}`);
  console.log(`Ringkasan:`, backup.counts);
}

main()
  .catch((error) => {
    console.error("BACKUP_ERROR:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
