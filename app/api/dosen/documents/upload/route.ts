/** @format */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageBucket, supabaseAdmin } from "@/lib/supabase-admin";
import { notifyAdmins } from "@/lib/notifications";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140);
}

function toNullableString(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

function toNullableInt(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();

  if (!text) return null;

  const parsed = Number.parseInt(text, 10);

  return Number.isNaN(parsed) ? null : parsed;
}

export async function POST(request: Request) {
  const { user, error } = await requireUser("DOSEN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Tidak memiliki akses." },
      { status: 401 },
    );
  }

  const lecturer = user.lecturerProfile;

  if (!lecturer) {
    return NextResponse.json(
      { message: "Profil dosen tidak ditemukan." },
      { status: 404 },
    );
  }

  const limit = rateLimit({
    key: `upload:${user.id}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(
      "Terlalu banyak upload dalam waktu singkat. Coba lagi sebentar.",
    );
  }

  const formData = await request.formData();

  const requirementId = String(formData.get("requirementId") || "");
  const academicYear = toNullableInt(formData.get("academicYear"));
  const skpPredicate = toNullableString(formData.get("skpPredicate"));
  const externalUrl = toNullableString(formData.get("externalUrl"));
  const letterNumber = toNullableString(formData.get("letterNumber"));
  const letterDateRaw = toNullableString(formData.get("letterDate"));
  const file = formData.get("file");

  if (!requirementId) {
    return NextResponse.json(
      { message: "Jenis dokumen wajib dipilih." },
      { status: 400 },
    );
  }

  const requirement = await prisma.documentRequirement.findUnique({
    where: {
      id: requirementId,
    },
    include: {
      category: true,
    },
  });

  if (!requirement) {
    return NextResponse.json(
      { message: "Jenis dokumen tidak ditemukan." },
      { status: 404 },
    );
  }

  const needsFile =
    requirement.inputType === "FILE" ||
    requirement.inputType === "FILE_AND_URL";

  const needsUrl =
    requirement.inputType === "URL" ||
    requirement.inputType === "FILE_AND_URL" ||
    requirement.requiresExternalUrl;

  if (requirement.isYearly && !academicYear) {
    return NextResponse.json(
      { message: "Tahun dokumen wajib dipilih." },
      { status: 400 },
    );
  }

  if (needsUrl && !externalUrl) {
    return NextResponse.json(
      { message: "Tautan wajib diisi." },
      { status: 400 },
    );
  }

  if (requirement.requiresLetterNumber && !letterNumber) {
    return NextResponse.json(
      { message: "Nomor surat wajib diisi." },
      { status: 400 },
    );
  }

  if (requirement.requiresLetterDate && !letterDateRaw) {
    return NextResponse.json(
      { message: "Tanggal surat wajib diisi." },
      { status: 400 },
    );
  }

  if (needsFile && !(file instanceof File)) {
    return NextResponse.json(
      { message: "File dokumen wajib diupload." },
      { status: 400 },
    );
  }

  const occurrenceKey = requirement.isYearly ? String(academicYear) : "default";

  const existingSubmission = await prisma.documentSubmission.findUnique({
    where: {
      lecturerId_requirementId_occurrenceKey: {
        lecturerId: lecturer.id,
        requirementId,
        occurrenceKey,
      },
    },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
      },
    },
  });

  const latestVersion =
    existingSubmission?.versions[0]?.versionNumber ||
    existingSubmission?.versionNumber ||
    0;

  const nextVersionNumber = latestVersion + 1;

  let fileName: string | null = null;
  let fileSize: number | null = null;
  let mimeType: string | null = null;
  let storagePath: string | null = null;

  if (file instanceof File) {
    const maxBytes = requirement.maxSizeMb * 1024 * 1024;

    if (file.size > maxBytes) {
      return NextResponse.json(
        { message: `Ukuran file maksimal ${requirement.maxSizeMb} MB.` },
        { status: 400 },
      );
    }

    if (!requirement.allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Tipe file tidak diizinkan." },
        { status: 400 },
      );
    }

    fileName = safeFileName(file.name);
    fileSize = file.size;
    mimeType = file.type;

    storagePath = [
      "lecturers",
      lecturer.id,
      requirement.category.code,
      requirement.code,
      occurrenceKey,
      `v${nextVersionNumber}`,
      `${Date.now()}-${fileName}`,
    ].join("/");

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(storageBucket)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { message: uploadError.message },
        { status: 500 },
      );
    }
  }

  const parsedLetterDate = letterDateRaw ? new Date(letterDateRaw) : null;

  const versionMetadata = {
    categoryCode: requirement.category.code,
    categoryName: requirement.category.name,
    requirementCode: requirement.code,
    requirementName: requirement.name,
    inputType: requirement.inputType,
    academicYear,
    hasFile: Boolean(storagePath),
    hasUrl: Boolean(externalUrl),
    versionNumber: nextVersionNumber,
  };

  const submission = await prisma.$transaction(async (tx) => {
    if (existingSubmission) {
      const updated = await tx.documentSubmission.update({
        where: {
          id: existingSubmission.id,
        },
        data: {
          status: "PENDING",
          adminNote: null,
          fileName,
          fileSize,
          mimeType,
          storagePath,
          versionNumber: nextVersionNumber,
          academicYear,
          occurrenceKey,
          externalUrl,
          letterNumber,
          letterDate: parsedLetterDate,
          skpPredicate,
          metadata: versionMetadata,
        },
      });

      await tx.documentVersion.create({
        data: {
          submissionId: updated.id,
          versionNumber: nextVersionNumber,
          fileName,
          fileSize,
          mimeType,
          storagePath,
          academicYear,
          externalUrl,
          letterNumber,
          letterDate: parsedLetterDate,
          skpPredicate,
          metadata: versionMetadata,
          uploaderId: user.id,
          uploaderEmail: user.email,
        },
      });

      return updated;
    }

    return tx.documentSubmission.create({
      data: {
        lecturerId: lecturer.id,
        requirementId,
        status: "PENDING",
        fileName,
        fileSize,
        mimeType,
        storagePath,
        versionNumber: nextVersionNumber,
        academicYear,
        occurrenceKey,
        externalUrl,
        letterNumber,
        letterDate: parsedLetterDate,
        skpPredicate,
        metadata: versionMetadata,
        versions: {
          create: {
            versionNumber: nextVersionNumber,
            fileName,
            fileSize,
            mimeType,
            storagePath,
            academicYear,
            externalUrl,
            letterNumber,
            letterDate: parsedLetterDate,
            skpPredicate,
            metadata: versionMetadata,
            uploaderId: user.id,
            uploaderEmail: user.email,
          },
        },
      },
    });
  });

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      action: "DOCUMENT_SAVE",
      entity: "DocumentSubmission",
      entityId: submission.id,
      metadata: {
        requirementCode: requirement.code,
        requirementName: requirement.name,
        categoryCode: requirement.category.code,
        categoryName: requirement.category.name,
        academicYear,
        hasFile: Boolean(storagePath),
        hasUrl: Boolean(externalUrl),
        versionNumber: nextVersionNumber,
      },
    },
  });

  await notifyAdmins({
    title:
      nextVersionNumber > 1 ? "Dokumen Revisi Dikirim" : "Dokumen Baru Masuk",
    message: `${lecturer.fullName} mengirim ${requirement.name} versi ${nextVersionNumber}.`,
    type: "DOCUMENT_UPLOADED",
    href: `/admin/dosen/${lecturer.id}`,
    metadata: {
      lecturerId: lecturer.id,
      lecturerName: lecturer.fullName,
      requirementCode: requirement.code,
      requirementName: requirement.name,
      categoryCode: requirement.category.code,
      categoryName: requirement.category.name,
      academicYear,
      hasFile: Boolean(storagePath),
      hasUrl: Boolean(externalUrl),
      versionNumber: nextVersionNumber,
    },
  });

  return NextResponse.json({
    message:
      nextVersionNumber > 1
        ? `Dokumen berhasil diperbarui sebagai versi ${nextVersionNumber}.`
        : "Dokumen berhasil disimpan.",
    submission,
  });
}
