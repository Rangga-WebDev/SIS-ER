/** @format */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getLecturerIdFromPath(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await requireUser("ADMIN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Tidak memiliki akses." },
      { status: 401 },
    );
  }

  const lecturerId = getLecturerIdFromPath(request);

  if (!lecturerId || lecturerId === "dosen") {
    return NextResponse.json(
      { message: "ID dosen tidak valid." },
      { status: 400 },
    );
  }

  const lecturer = await prisma.lecturerProfile.findUnique({
    where: {
      id: lecturerId,
    },
    include: {
      user: true,
    },
  });

  if (!lecturer) {
    return NextResponse.json(
      { message: "Dosen tidak ditemukan." },
      { status: 404 },
    );
  }

  if (lecturer.user.role === "ADMIN") {
    return NextResponse.json(
      { message: "Akun admin tidak dapat dikeluarkan dari daftar dosen." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: {
      id: lecturer.userId,
    },
    data: {
      status: "SUSPENDED",
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: user.id,
      action: "LECTURER_SUSPEND",
      entity: "LecturerProfile",
      entityId: lecturer.id,
      metadata: {
        lecturerId: lecturer.id,
        lecturerName: lecturer.fullName,
        lecturerEmail: lecturer.user.email,
      },
    },
  });

  return NextResponse.json({
    message: "Dosen berhasil dikeluarkan dari daftar aktif.",
  });
}
