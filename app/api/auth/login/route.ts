/** @format */

import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getJwtSecret, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

function getRedirectPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "DOSEN") return "/dosen/dashboard";
  if (role === "TIM_PAK") return "/pak/dashboard";
  if (role === "KOMITE_INTEGRITAS_AKADEMIK") return "/komite/dashboard";
  if (role === "TIM_SENAT") return "/senat/dashboard";
  return "/";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const limit = await rateLimit({
    key: `login:${ip}`,
    limit: 8,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(
      "Terlalu banyak percobaan login. Coba lagi beberapa saat.",
    );
  }

  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    // Batasi percobaan per akun untuk menahan brute force terdistribusi.
    const accountLimit = await rateLimit({
      key: `login:email:${data.email.toLowerCase()}`,
      limit: 10,
      windowMs: 15 * 60_000,
    });

    if (!accountLimit.allowed) {
      return rateLimitResponse(
        "Terlalu banyak percobaan untuk akun ini. Coba lagi beberapa saat.",
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: data.email.toLowerCase(),
      },
      include: {
        lecturerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "Email atau password salah.",
        },
        { status: 401 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          message: "Akun tidak aktif. Hubungi admin.",
        },
        { status: 403 },
      );
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          message: "Email atau password salah.",
        },
        { status: 401 },
      );
    }

    if (user.role === "DOSEN" && !user.lecturerProfile) {
      return NextResponse.json(
        {
          message: "Profil dosen belum tersedia.",
        },
        { status: 403 },
      );
    }

    const maxAge = 60 * 60 * 8;

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      additionalRoles: user.additionalRoles,
      status: user.status,
      tokenVersion: user.tokenVersion,
    })
      .setProtectedHeader({
        alg: "HS256",
      })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(getJwtSecret());

    const response = NextResponse.json({
      message: "Login berhasil.",
      redirectTo: getRedirectPath(user.role),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message || "Data login tidak valid.",
        },
        { status: 400 },
      );
    }

    console.error("LOGIN_ERROR:", error);

    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat login.",
      },
      { status: 500 },
    );
  }
}
