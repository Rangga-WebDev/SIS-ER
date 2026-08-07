/** @format */

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return realIp || "unknown";
}

export async function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const bucketKey = createHash("sha256").update(key).digest("hex");

  try {
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
      VALUES (${bucketKey}, 1, ${nextReset}, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${nextReset}
          ELSE "RateLimitBucket"."resetAt"
        END,
        "updatedAt" = ${now}
      RETURNING "count", "resetAt"
    `;

    const record = rows[0];

    if (!record) {
      throw new Error("Rate limit bucket tidak dapat dibuat.");
    }

    if (Math.random() < 0.01) {
      await prisma.rateLimitBucket.deleteMany({
        where: {
          resetAt: {
            lt: now,
          },
        },
      });
    }

    return {
      allowed: record.count <= limit,
      remaining: Math.max(0, limit - record.count),
      resetAt: record.resetAt.getTime(),
    };
  } catch (error) {
    console.error("RATE_LIMIT_ERROR:", error);

    return {
      allowed: false,
      remaining: 0,
      resetAt: nextReset.getTime(),
    };
  }
}

export function rateLimitResponse(
  message = "Terlalu banyak percobaan.",
  resetAt?: number,
) {
  const retryAfter = resetAt
    ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
    : 60;

  return NextResponse.json(
    {
      message,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    },
  );
}
