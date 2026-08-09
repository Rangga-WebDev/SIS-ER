/** @format */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLecturerEditable } from "@/lib/dupak-workflow";
import { flagLecturerRevision } from "@/lib/dupak-entries";
import type { DupakStatus } from "@/lib/app-types";
import { DUPAK_TEMPLATE_ROWS } from "@/lib/dupak-template";

export const runtime = "nodejs";

function toNullableString(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

function findDupakRow(rowCode: string) {
  return DUPAK_TEMPLATE_ROWS.find((row) => row.code === rowCode);
}

function isGoogleDriveUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname.includes("drive.google.com") ||
      url.hostname.includes("docs.google.com")
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireUser("DOSEN");

  if (error || !user) {
    return NextResponse.json(
      {
        message: "Tidak memiliki akses.",
      },
      { status: 401 },
    );
  }

  const lecturer = user.lecturerProfile;

  if (!lecturer) {
    return NextResponse.json(
      {
        message: "Profil dosen tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  try {
    const formData = await request.formData();

    const rowCode = String(formData.get("rowCode") || "").trim();
    const rowLabelFromClient = toNullableString(formData.get("rowLabel"));
    const evidenceUrl = toNullableString(formData.get("evidenceUrl"));
    const note = toNullableString(formData.get("note"));

    if (!rowCode) {
      return NextResponse.json(
        {
          message: "Kode baris DUPAK wajib dikirim.",
        },
        { status: 400 },
      );
    }

    const row = findDupakRow(rowCode);

    if (!row) {
      return NextResponse.json(
        {
          message: "Baris DUPAK tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    if (row.type !== "ITEM") {
      return NextResponse.json(
        {
          message: "Bukti hanya dapat disimpan pada baris kegiatan.",
        },
        { status: 400 },
      );
    }

    if (!evidenceUrl) {
      return NextResponse.json(
        {
          message: "Link Google Drive bukti DUPAK wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (!isGoogleDriveUrl(evidenceUrl)) {
      return NextResponse.json(
        {
          message: "Bukti DUPAK wajib menggunakan link Google Drive.",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.dupakSubmission.findUnique({
      where: {
        lecturerId: lecturer.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existing && !isLecturerEditable(existing.status as DupakStatus)) {
      return NextResponse.json(
        {
          message:
            "Pengajuan sedang diproses dan terkunci. Bukti hanya dapat diubah saat pengajuan dikembalikan untuk revisi.",
        },
        { status: 409 },
      );
    }

    const dupakSubmission = await prisma.dupakSubmission.upsert({
      where: {
        lecturerId: lecturer.id,
      },
      update: {},
      create: {
        lecturerId: lecturer.id,
        instansi: lecturer.institution,
        personalData: {
          nama: lecturer.fullName,
          nidnOrNuptk: lecturer.nidnOrNuptk,
          jabatanAkademikTmt: lecturer.academicPosition,
          unitKerja: lecturer.studyProgram,
        },
        creditData: {},
        status: "DRAFT",
        currentStep: 3,
        completionPercent: 0,
      },
    });

    const rowLabel = rowLabelFromClient || row.label;

    const existingEvidence = await prisma.dupakEvidence.findFirst({
      where: {
        dupakSubmissionId: dupakSubmission.id,
        rowCode,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    const evidence = existingEvidence
      ? await prisma.dupakEvidence.update({
          where: {
            id: existingEvidence.id,
          },
          data: {
            rowLabel,
            evidenceUrl,
            fileName: null,
            fileSize: null,
            mimeType: null,
            storagePath: null,
            note,
            uploaderId: user.id,
            uploaderEmail: user.email,
          },
        })
      : await prisma.dupakEvidence.create({
          data: {
            dupakSubmissionId: dupakSubmission.id,
            rowCode,
            rowLabel,
            evidenceUrl,
            fileName: null,
            fileSize: null,
            mimeType: null,
            storagePath: null,
            note,
            uploaderId: user.id,
            uploaderEmail: user.email,
          },
        });

    // Bukti level baris berubah: tandai penilaian bermasalah agar dinilai ulang.
    await prisma.$transaction((tx) =>
      flagLecturerRevision(tx, {
        submissionId: dupakSubmission.id,
        rowCode,
        entryKey: "",
        actorEmail: user.email,
        reason: "Bukti dokumen baris diperbarui dosen.",
      }),
    );

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: "DUPAK_EVIDENCE_LINK_SAVE",
        entity: "DupakEvidence",
        entityId: evidence.id,
        metadata: {
          lecturerId: lecturer.id,
          lecturerName: lecturer.fullName,
          dupakSubmissionId: dupakSubmission.id,
          rowCode,
          rowLabel,
          evidenceUrl,
        },
      },
    });

    return NextResponse.json({
      message: "Link bukti DUPAK berhasil disimpan.",
      evidence,
    });
  } catch (error) {
    console.error("DUPAK_EVIDENCE_LINK_SAVE_ERROR:", error);

    return NextResponse.json(
      {
        message: "Gagal menyimpan link bukti DUPAK.",
      },
      { status: 500 },
    );
  }
}
