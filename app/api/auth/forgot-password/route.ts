/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { notifyAdmins } from "@/lib/notifications";

export const runtime = "nodejs";

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  nidnOrNuptk: z.string().trim().min(6, "NIDN/NUPTK minimal 6 karakter."),
});

const GENERIC_RESPONSE =
  "Jika data cocok, permintaan reset telah dikirim kepada Admin Tim PAK. Admin akan menghubungi Anda melalui kontak resmi setelah verifikasi identitas.";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const limit = await rateLimit({
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

    if (user && lecturer && isMatch) {
      try {
        const recentRequest = await prisma.activityLog.findFirst({
          where: {
            action: "PASSWORD_RESET_REQUEST",
            entity: "User",
            entityId: user.id,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
          },
        });

        if (!recentRequest) {
          await prisma.activityLog.create({
            data: {
              action: "PASSWORD_RESET_REQUEST",
              entity: "User",
              entityId: user.id,
              metadata: {
                lecturerId: lecturer.id,
                method: "ADMIN_ASSISTED",
              },
            },
          });

          await notifyAdmins({
            title: "Permintaan Reset Password",
            message: `${lecturer.fullName} mengajukan reset password. Verifikasi identitas sebelum menetapkan password sementara.`,
            type: "SYSTEM",
            href: `/admin/dosen/${lecturer.id}`,
            metadata: {
              userId: user.id,
              lecturerId: lecturer.id,
            },
          });
        }
      } catch (requestError) {
        console.error("PASSWORD_RESET_REQUEST_ERROR:", requestError);
      }
    }

    return NextResponse.json({ message: GENERIC_RESPONSE });
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
