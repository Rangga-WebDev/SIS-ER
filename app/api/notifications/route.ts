/** @format */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Silakan login terlebih dahulu.",
      },
      { status: 401 },
    );
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    }),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}
