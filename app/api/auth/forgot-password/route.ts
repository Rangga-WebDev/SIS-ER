/** @format */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Format email tidak valid."),
    nidnOrNuptk: z.string().trim().min(6, "NIDN/NUPTK minimal 6 karakter."),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter.")
      .regex(/[A-Z]/, "Password baru harus memiliki huruf besar.")
      .regex(/[a-z]/, "Password baru harus memiliki huruf kecil.")
      .regex(/[0-9]/, "Password baru harus memiliki angka."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak sesuai.",
    path: ["confirmPassword"],
  });

const GENERIC_ERROR_MESSAGE =
  "Data verifikasi tidak cocok. Periksa kembali email dan NIDN/NUPTK Anda.";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const limit = rateLimit({
    key: `forgot-password:${ip}`,
    limit: 5,
    windowMs: 10 * 60_000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(
      "Terlalu banyak percobaan reset password. Coba lagi beberapa saat.",
    );
  }

  try {
    const body = await request.json();
    const data = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
      include: {
        lecturerProfile: {
          select: {
            id: true,
            nidnOrNuptk: true,
            fullName: true,
          },
        },
      },
    });

    const lecturer = user?.lecturerProfile;

    const isMatch =
      Boolean(user) &&
      user?.status === "ACTIVE" &&
      Boolean(lecturer) &&
      lecturer?.nidnOrNuptk.trim().toLowerCase() ===
        data.nidnOrNuptk.trim().toLowerCase();

    if (!user || !isMatch) {
      return NextResponse.json(
        { message: GENERIC_ERROR_MESSAGE },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: "PASSWORD_RESET",
        entity: "User",
        entityId: user.id,
        metadata: {
          email: user.email,
          method: "FORGOT_PASSWORD_NIDN_VERIFICATION",
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Password Berhasil Direset",
        message:
          "Password akun Anda baru saja direset melalui fitur lupa password. Jika ini bukan Anda, segera hubungi admin.",
        type: "SYSTEM",
      },
    });

    return NextResponse.json({
      message: "Password berhasil direset. Silakan login dengan password baru.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data tidak valid." },
        { status: 400 },
      );
    }

    console.error("FORGOT_PASSWORD_ERROR:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat mereset password." },
      { status: 500 },
    );
  }
}
