/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const updateSchema = z.object({
  action: z.enum(["SET_TIM_PAK", "SET_ADMIN", "ACTIVATE", "SUSPEND"]),
});

export async function PATCH(
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
      { message: "Hanya Admin Tim PAK yang dapat mengelola akun." },
      { status: 403 },
    );
  }

  try {
    const { userId } = await context.params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    if (userId === user.id) {
      return NextResponse.json(
        { message: "Anda tidak dapat mengubah akun sendiri." },
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
        lecturerProfile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!target) {
      return NextResponse.json(
        { message: "Akun tidak ditemukan." },
        { status: 404 },
      );
    }

    if (target.role === "DOSEN" || target.lecturerProfile) {
      return NextResponse.json(
        { message: "Akun dosen tidak dapat diubah menjadi Tim PAK dari sini." },
        { status: 400 },
      );
    }

    const updateData =
      data.action === "SET_TIM_PAK"
        ? { role: "TIM_PAK" as const }
        : data.action === "SET_ADMIN"
          ? { role: "ADMIN" as const }
          : data.action === "ACTIVATE"
            ? { status: "ACTIVE" as const }
            : { status: "SUSPENDED" as const };

    if (data.action === "SUSPEND" && target.role === "TIM_PAK") {
      const activeCount = await prisma.pakAssignment.count({
        where: {
          pakUserId: target.id,
          status: "ACTIVE",
        },
      });

      if (activeCount > 0) {
        return NextResponse.json(
          {
            message: `Akun masih memiliki ${activeCount} penugasan aktif. Alihkan atau batalkan penugasan terlebih dahulu.`,
          },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: {
        id: target.id,
      },
      data: {
        ...updateData,
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
      action: "PAK_MEMBER_UPDATE",
      entity: "User",
      entityId: target.id,
      oldValue: { role: target.role, status: target.status },
      newValue: { role: updated.role, status: updated.status },
      metadata: {
        targetEmail: target.email,
        actionType: data.action,
      },
    });

    return NextResponse.json({
      message: "Akun berhasil diperbarui.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data tidak valid." },
        { status: 400 },
      );
    }

    console.error("PAK_MEMBER_UPDATE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal memperbarui akun." },
      { status: 500 },
    );
  }
}
