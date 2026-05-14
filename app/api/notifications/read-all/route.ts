/** @format */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Silakan login terlebih dahulu.",
      },
      { status: 401 },
    );
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return NextResponse.json({
    message: "Semua notifikasi ditandai sudah dibaca.",
  });
}
