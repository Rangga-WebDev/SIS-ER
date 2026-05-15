/** @format */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageBucket, supabaseAdmin } from "@/lib/supabase-admin";
import { DUPAK_TEMPLATE_ROWS } from "@/lib/dupak-template";

export const runtime = "nodejs";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140);
}

function toNullableString(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

function findDupakRow(rowCode: string) {
  return DUPAK_TEMPLATE_ROWS.find((row) => row.code === rowCode);
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
    const note = toNullableString(formData.get("note"));
    const file = formData.get("file");

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
          message: "Bukti dokumen hanya dapat diunggah pada baris kegiatan.",
        },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          message: "File bukti dokumen wajib diunggah.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          message: `Ukuran file maksimal ${MAX_FILE_SIZE_MB} MB.`,
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          message:
            "Tipe file tidak diizinkan. Gunakan PDF, JPG, JPEG, atau PNG.",
        },
        { status: 400 },
      );
    }

    const dupakSubmission = await prisma.dupakSubmission.upsert({
      where: {
        lecturerId: lecturer.id,
      },
      update: {
        status: "DRAFT",
        currentStep: 3,
      },
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

    const fileName = safeFileName(file.name);
    const fileSize = file.size;
    const mimeType = file.type;
    const rowLabel = rowLabelFromClient || row.label;

    const storagePath = [
      "dupak",
      lecturer.id,
      dupakSubmission.id,
      rowCode,
      `${Date.now()}-${fileName}`,
    ].join("/");

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(storageBucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          message: uploadError.message,
        },
        { status: 500 },
      );
    }

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
            fileName,
            fileSize,
            mimeType,
            storagePath,
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
            fileName,
            fileSize,
            mimeType,
            storagePath,
            note,
            uploaderId: user.id,
            uploaderEmail: user.email,
          },
        });

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: "DUPAK_EVIDENCE_UPLOAD",
        entity: "DupakEvidence",
        entityId: evidence.id,
        metadata: {
          lecturerId: lecturer.id,
          lecturerName: lecturer.fullName,
          dupakSubmissionId: dupakSubmission.id,
          rowCode,
          rowLabel,
          fileName,
          fileSize,
          mimeType,
        },
      },
    });

    return NextResponse.json({
      message: "Bukti dokumen DUPAK berhasil diunggah.",
      evidence,
    });
  } catch (error) {
    console.error("DUPAK_EVIDENCE_UPLOAD_ERROR:", error);

    return NextResponse.json(
      {
        message: "Gagal mengunggah bukti dokumen DUPAK.",
      },
      { status: 500 },
    );
  }
}
