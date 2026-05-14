/** @format */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { z } from "zod";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const limit = rateLimit({
    key: `register:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(
      "Terlalu banyak percobaan pendaftaran. Coba lagi beberapa saat.",
    );
  }

  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail)
      return NextResponse.json(
        { message: "Email sudah terdaftar." },
        { status: 409 },
      );

    const existingNidn = await prisma.lecturerProfile.findUnique({
      where: { nidnOrNuptk: data.nidnOrNuptk },
    });
    if (existingNidn)
      return NextResponse.json(
        { message: "NIDN/NUPTK sudah terdaftar." },
        { status: 409 },
      );

    const passwordHash = await bcrypt.hash(data.password, 12);
    const fullName = `${data.firstName} ${data.lastName}`;

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: "DOSEN",
        status: "ACTIVE",
        lecturerProfile: {
          create: {
            nidnOrNuptk: data.nidnOrNuptk,
            firstName: data.firstName,
            lastName: data.lastName,
            fullName,
            phone: data.phone || null,
            institution: data.institution,
            faculty: data.faculty || null,
            studyProgram: data.studyProgram,
            academicPosition: data.academicPosition,
            lecturerStatus: data.lecturerStatus,
          },
        },
        activityLogs: { create: { action: "AUTH_REGISTER", entity: "User" } },
      },
      include: { lecturerProfile: true },
    });

    return NextResponse.json(
      {
        message: "Akun dosen berhasil dibuat.",
        user: { id: user.id, email: user.email, role: user.role },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data tidak valid." },
        { status: 400 },
      );
    console.error("REGISTER_ERROR", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
