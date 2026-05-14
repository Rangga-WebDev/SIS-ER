/** @format */

import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@/lib/prisma";
import type { AccountStatus, Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "sister_pak_session";

export type SessionPayload = JWTPayload & {
  userId?: string;
  email?: string;
  role?: Role;
  status?: AccountStatus;
};

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET belum diatur di environment variable.");
  }

  return new TextEncoder().encode(secret);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, getJwtSecret());

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const payload = await getSessionPayload();

  if (!payload?.userId || typeof payload.userId !== "string") {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    include: {
      lecturerProfile: true,
    },
  });

  if (!user) return null;

  if (user.status !== "ACTIVE") return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    lecturerProfile: user.lecturerProfile,
  };
}

export async function requireUser(roles?: Role | Role[]) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      error: "UNAUTHORIZED",
    };
  }

  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(user.role)) {
      return {
        user: null,
        error: "FORBIDDEN",
      };
    }
  }

  return {
    user,
    error: null,
  };
}
