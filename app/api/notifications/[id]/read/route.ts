/** @format */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Silakan login terlebih dahulu.",
      },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  const notification = await prisma.notification.findUnique({
    where: {
      id,
    },
  });

  if (!notification) {
    return NextResponse.json(
      {
        message: "Notifikasi tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  if (notification.userId !== user.id) {
    return NextResponse.json(
      {
        message: "Tidak memiliki akses ke notifikasi ini.",
      },
      { status: 403 },
    );
  }

  await prisma.notification.update({
    where: {
      id,
    },
    data: {
      isRead: true,
    },
  });

  return NextResponse.json({
    message: "Notifikasi ditandai sudah dibaca.",
  });
}
