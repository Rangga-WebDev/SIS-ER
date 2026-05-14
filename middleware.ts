/** @format */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "sister_pak_session";

type SessionRole = "DOSEN" | "ADMIN" | "OPERATOR";

type RouteGuard = {
  prefix: string;
  roles: SessionRole[];
};

const guardedRoutes: RouteGuard[] = [
  {
    prefix: "/dosen",
    roles: ["DOSEN"],
  },
  {
    prefix: "/admin",
    roles: ["ADMIN"],
  },
  {
    prefix: "/api/dosen",
    roles: ["DOSEN"],
  },
  {
    prefix: "/api/admin",
    roles: ["ADMIN"],
  },
  {
    prefix: "/api/files",
    roles: ["DOSEN", "ADMIN"],
  },
  {
    prefix: "/api/notifications",
    roles: ["DOSEN", "ADMIN"],
  },
];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET belum diatur.");
  }

  return new TextEncoder().encode(secret);
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  return response;
}

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

function unauthorized(request: NextRequest, message = "Unauthorized") {
  if (isApiRoute(request.nextUrl.pathname)) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          message,
        },
        { status: 401 },
      ),
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return applySecurityHeaders(NextResponse.redirect(loginUrl));
}

function forbidden(request: NextRequest, message = "Forbidden") {
  if (isApiRoute(request.nextUrl.pathname)) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          message,
        },
        { status: 403 },
      ),
    );
  }

  return applySecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
}

function getGuard(pathname: string) {
  return guardedRoutes.find((route) => pathname.startsWith(route.prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const guard = getGuard(pathname);

  if (!guard) {
    return applySecurityHeaders(NextResponse.next());
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return unauthorized(request, "Silakan login terlebih dahulu.");
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    const role = payload.role;

    if (!role || typeof role !== "string") {
      return unauthorized(request, "Session tidak valid.");
    }

    if (!guard.roles.includes(role as SessionRole)) {
      return forbidden(request, "Role tidak memiliki akses.");
    }

    return applySecurityHeaders(NextResponse.next());
  } catch {
    return unauthorized(request, "Session expired atau tidak valid.");
  }
}

export const config = {
  matcher: [
    "/dosen/:path*",
    "/admin/:path*",
    "/api/dosen/:path*",
    "/api/admin/:path*",
    "/api/files/:path*",
    "/api/notifications/:path*",
  ],
};
