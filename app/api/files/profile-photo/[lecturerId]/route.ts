/** @format */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivePakAssignmentForLecturer } from "@/lib/pak-access";
import { storageBucket, supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function getLecturerIdFromPath(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Silakan login terlebih dahulu." },
      { status: 401 },
    );
  }

  const lecturerId = getLecturerIdFromPath(request);

  if (!lecturerId || lecturerId === "profile-photo") {
    return NextResponse.json(
      { message: "ID dosen tidak valid." },
      { status: 400 },
    );
  }

  const lecturer = await prisma.lecturerProfile.findUnique({
    where: {
      id: lecturerId,
    },
    select: {
      id: true,
      userId: true,
      fullName: true,
      photoFileName: true,
      photoStoragePath: true,
    },
  });

  if (!lecturer) {
    return NextResponse.json(
      { message: "Profil dosen tidak ditemukan." },
      { status: 404 },
    );
  }

  const isAdmin = user.role === "ADMIN";
  const isOwner = user.role === "DOSEN" && lecturer.userId === user.id;

  // Penilai hanya boleh melihat foto dosen yang sedang ditugaskan kepadanya.
  const isAssignedPak =
    user.role === "TIM_PAK" &&
    Boolean(await getActivePakAssignmentForLecturer(user.id, lecturer.id));

  if (!isAdmin && !isOwner && !isAssignedPak) {
    return NextResponse.json(
      { message: "Anda tidak memiliki akses ke foto ini." },
      { status: 403 },
    );
  }

  if (!lecturer.photoStoragePath) {
    return NextResponse.json(
      { message: "Foto dosen belum tersedia." },
      { status: 404 },
    );
  }

  const { data, error } = await supabaseAdmin.storage
    .from(storageBucket)
    .createSignedUrl(lecturer.photoStoragePath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { message: error?.message || "Gagal membuka foto dosen." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
