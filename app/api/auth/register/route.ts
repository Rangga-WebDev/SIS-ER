/** @format */

import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { storageBucket, supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function safeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 140);
}

function validatePassword(password: string) {
  return password.length >= 8;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const email = normalizeEmail(getText(formData, "email"));
    const password = getText(formData, "password");
    const confirmPassword = getText(formData, "confirmPassword");

    const firstName = getText(formData, "firstName");
    const lastName = getText(formData, "lastName");
    const fullName = `${firstName} ${lastName}`.trim();

    const nidnOrNuptk = getText(formData, "nidnOrNuptk");
    const phone = getText(formData, "phone");

    const institution =
      getText(formData, "institution") || "Universitas Muhammadiyah Makassar";

    const faculty = getText(formData, "faculty");
    const studyProgram = getText(formData, "studyProgram");
    const academicPosition = getText(formData, "academicPosition");
    const lecturerStatus = getText(formData, "lecturerStatus");

    const photo = formData.get("photo");

    if (!email) {
      return NextResponse.json(
        { message: "Email wajib diisi." },
        { status: 400 },
      );
    }

    if (!password) {
      return NextResponse.json(
        { message: "Password wajib diisi." },
        { status: 400 },
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { message: "Password minimal 8 karakter." },
        { status: 400 },
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { message: "Konfirmasi password tidak sesuai." },
        { status: 400 },
      );
    }

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

    if (!(photo instanceof File)) {
      return NextResponse.json(
        { message: "Foto dosen wajib diunggah." },
        { status: 400 },
      );
    }

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

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email sudah digunakan." },
        { status: 409 },
      );
    }

    const existingLecturer = await prisma.lecturerProfile.findUnique({
      where: {
        nidnOrNuptk,
      },
      select: {
        id: true,
      },
    });

    if (existingLecturer) {
      return NextResponse.json(
        { message: "NIDN/NUPTK sudah terdaftar." },
        { status: 409 },
      );
    }

    const photoFileName = safeFileName(photo.name);
    const photoMimeType = photo.type;
    const photoFileSize = photo.size;

    const photoStoragePath = [
      "profile-photos",
      nidnOrNuptk,
      `${Date.now()}-${photoFileName}`,
    ].join("/");

    const photoBuffer = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(storageBucket)
      .upload(photoStoragePath, photoBuffer, {
        contentType: photoMimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("REGISTER_PHOTO_UPLOAD_ERROR:", uploadError);

      return NextResponse.json(
        { message: "Gagal mengunggah foto dosen." },
        { status: 500 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createdUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "DOSEN",
        status: "ACTIVE",
        lecturerProfile: {
          create: {
            nidnOrNuptk,
            firstName,
            lastName,
            fullName,
            phone: phone || null,
            institution,
            faculty: faculty || null,
            studyProgram,
            academicPosition,
            lecturerStatus,
            profileStatus: "LENGKAP",
            documentStatus: "BELUM_UPLOAD",
            verificationStatus: "MENUNGGU_DATA",
            photoFileName,
            photoFileSize,
            photoMimeType,
            photoStoragePath,
          },
        },
      },
      include: {
        lecturerProfile: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: createdUser.id,
        action: "LECTURER_REGISTER",
        entity: "User",
        entityId: createdUser.id,
        metadata: {
          userId: createdUser.id,
          lecturerId: createdUser.lecturerProfile?.id,
          email,
          fullName,
          nidnOrNuptk,
          photoFileName,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Registrasi dosen berhasil. Silakan login.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("REGISTER_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal melakukan registrasi." },
      { status: 500 },
    );
  }
}
