/** @format */

import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageBucket, supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function safeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 140);
}

export async function PATCH(request: Request) {
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

  try {
    const formData = await request.formData();

    const firstName = getText(formData, "firstName");
    const lastName = getText(formData, "lastName");
    const nidnOrNuptk = getText(formData, "nidnOrNuptk");
    const phone = getText(formData, "phone");
    const institution = getText(formData, "institution");
    const faculty = getText(formData, "faculty");
    const studyProgram = getText(formData, "studyProgram");
    const academicPosition = getText(formData, "academicPosition");
    const lecturerStatus = getText(formData, "lecturerStatus");
    const photo = formData.get("photo");

    if (!firstName || !lastName) {
      return NextResponse.json(
        { message: "Nama depan dan nama belakang wajib diisi." },
        { status: 400 },
      );
    }

    if (!nidnOrNuptk) {
      return NextResponse.json(
        { message: "NIDN/NUPTK wajib diisi." },
        { status: 400 },
      );
    }

    if (!studyProgram) {
      return NextResponse.json(
        { message: "Program studi wajib diisi." },
        { status: 400 },
      );
    }

    if (!academicPosition) {
      return NextResponse.json(
        { message: "Jabatan akademik wajib diisi." },
        { status: 400 },
      );
    }

    if (!lecturerStatus) {
      return NextResponse.json(
        { message: "Status dosen wajib diisi." },
        { status: 400 },
      );
    }

    if (nidnOrNuptk !== lecturer.nidnOrNuptk) {
      const existingLecturer = await prisma.lecturerProfile.findUnique({
        where: {
          nidnOrNuptk,
        },
        select: {
          id: true,
        },
      });

      if (existingLecturer && existingLecturer.id !== lecturer.id) {
        return NextResponse.json(
          { message: "NIDN/NUPTK sudah digunakan oleh dosen lain." },
          { status: 409 },
        );
      }
    }

    const updateData: {
      firstName: string;
      lastName: string;
      fullName: string;
      nidnOrNuptk: string;
      phone: string | null;
      institution: string;
      faculty: string | null;
      studyProgram: string;
      academicPosition: string;
      lecturerStatus: string;
      photoFileName?: string;
      photoFileSize?: number;
      photoMimeType?: string;
      photoStoragePath?: string;
    } = {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      nidnOrNuptk,
      phone: phone || null,
      institution: institution || lecturer.institution,
      faculty: faculty || null,
      studyProgram,
      academicPosition,
      lecturerStatus,
    };

    if (photo instanceof File && photo.size > 0) {
      if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
        return NextResponse.json(
          { message: "Foto harus berformat JPG, PNG, atau WEBP." },
          { status: 400 },
        );
      }

      if (photo.size > MAX_PHOTO_SIZE_BYTES) {
        return NextResponse.json(
          { message: "Ukuran foto maksimal 2 MB." },
          { status: 400 },
        );
      }

      const photoFileName = safeFileName(photo.name);
      const photoStoragePath = [
        "profile-photos",
        lecturer.id,
        `${Date.now()}-${photoFileName}`,
      ].join("/");

      const buffer = Buffer.from(await photo.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from(storageBucket)
        .upload(photoStoragePath, buffer, {
          contentType: photo.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("DOSEN_PROFILE_PHOTO_UPLOAD_ERROR:", uploadError);

        return NextResponse.json(
          { message: "Gagal mengunggah foto profil baru." },
          { status: 500 },
        );
      }

      updateData.photoFileName = photoFileName;
      updateData.photoFileSize = photo.size;
      updateData.photoMimeType = photo.type;
      updateData.photoStoragePath = photoStoragePath;
    }

    const updatedLecturer = await prisma.lecturerProfile.update({
      where: {
        id: lecturer.id,
      },
      data: updateData,
    });

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: "LECTURER_PROFILE_UPDATE",
        entity: "LecturerProfile",
        entityId: lecturer.id,
        metadata: {
          lecturerId: lecturer.id,
          lecturerName: updatedLecturer.fullName,
          photoUpdated: photo instanceof File && photo.size > 0,
        },
      },
    });

    return NextResponse.json({
      message: "Profil berhasil diperbarui.",
      lecturer: updatedLecturer,
    });
  } catch (error) {
    console.error("DOSEN_SETTINGS_UPDATE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal memperbarui profil." },
      { status: 500 },
    );
  }
}
