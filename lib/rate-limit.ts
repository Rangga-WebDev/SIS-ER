/** @format */

import { NextResponse } from "next/server";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, RateLimitRecord>();

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return realIp || "unknown";
}

export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const current = memoryStore.get(key);

  if (!current || current.resetAt < now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  memoryStore.set(key, current);

  return {
    allowed: true,
    remaining: limit - current.count,
    resetAt: current.resetAt,
  };
}

export function rateLimitResponse(message = "Terlalu banyak percobaan.") {
  return NextResponse.json(
    {
      message,
    },
    {
      status: 429,
    },
  );
}
