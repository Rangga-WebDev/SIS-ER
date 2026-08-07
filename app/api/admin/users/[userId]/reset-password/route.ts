/** @format */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const resetSchema = z
  .object({
    temporaryPassword: z
      .string()
      .min(8, "Password sementara minimal 8 karakter.")
      .regex(/[A-Z]/, "Password harus memiliki huruf besar.")
      .regex(/[a-z]/, "Password harus memiliki huruf kecil.")
      .regex(/[0-9]/, "Password harus memiliki angka."),
    confirmPassword: z.string(),
    reason: z
      .string()
      .trim()
      .min(5, "Alasan reset minimal 5 karakter.")
      .max(500),
  })
  .refine((data) => data.temporaryPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak sesuai.",
    path: ["confirmPassword"],
  });

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      userId: string;
    }>;
  },
) {
  const { user, error } = await requireUser("ADMIN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Admin Tim PAK yang dapat mereset password." },
      { status: 403 },
    );
  }

  const limit = await rateLimit({
    key: `admin-password-reset:${user.id}`,
    limit: 20,
    windowMs: 60 * 60_000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(
      "Terlalu banyak aksi reset password. Coba lagi beberapa saat.",
    );
  }

  try {
    const { userId } = await context.params;
    const body = await request.json();
    const data = resetSchema.parse(body);

    if (userId === user.id) {
      return NextResponse.json(
        {
          message:
            "Admin tidak dapat mereset password akun sendiri dari fitur ini.",
        },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { message: "Akun tidak ditemukan." },
        { status: 404 },
      );
    }

    if (target.role === "ADMIN") {
      return NextResponse.json(
        {
          message:
            "Reset password sesama Admin dinonaktifkan untuk mencegah pengambilalihan akun.",
        },
        { status: 403 },
      );
    }

    const passwordHash = await bcrypt.hash(data.temporaryPassword, 12);

    await prisma.user.update({
      where: {
        id: target.id,
      },
      data: {
        passwordHash,
        tokenVersion: {
          increment: 1,
        },
      },
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "PASSWORD_RESET_BY_ADMIN",
      entity: "User",
      entityId: target.id,
      oldValue: { tokenVersionRevoked: false },
      newValue: { tokenVersionRevoked: true },
      reason: data.reason,
      metadata: {
        targetEmail: target.email,
        targetRole: target.role,
      },
    });

    await createNotification({
      userId: target.id,
      title: "Password Direset oleh Admin",
      message:
        "Password akun Anda telah direset oleh Admin. Seluruh sesi lama dicabut. Segera login menggunakan password sementara dan hubungi Admin jika Anda tidak meminta reset ini.",
      type: "SYSTEM",
      href: "/login",
      metadata: {
        resetBy: user.email,
      },
    });

    return NextResponse.json({
      message:
        "Password sementara berhasil ditetapkan dan seluruh sesi lama telah dicabut.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data reset tidak valid." },
        { status: 400 },
      );
    }

    console.error("ADMIN_PASSWORD_RESET_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mereset password akun." },
      { status: 500 },
    );
  }
}
