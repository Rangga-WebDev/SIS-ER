/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification, notifyRole } from "@/lib/notifications";
import { logAudit, recordStatusHistory } from "@/lib/audit";
import type { DupakStatus } from "@/lib/app-types";

export const runtime = "nodejs";

// Isi berita acara yang boleh diedit admin (data inti penilaian tetap dari sistem).
const contentSchema = z.object({
  nomor: z.string().trim().max(200).optional(),
  examinationDate: z.string().trim().optional(),
  tempat: z.string().trim().max(200).optional(),
  jabatanSaatIni: z.string().trim().max(200).optional(),
  tmt: z.string().trim().max(100).optional(),
  usulanJabatan: z.string().trim().max(200).optional(),
  kumSebelumnya: z.string().trim().max(50).optional(),
  kebutuhanKum: z.string().trim().max(50).optional(),
  kumDicapai: z.string().trim().max(50).optional(),
  unsurPendidikan: z.string().trim().max(50).optional(),
  unsurPenelitian: z.string().trim().max(50).optional(),
  unsurPengabdian: z.string().trim().max(50).optional(),
  unsurPenunjang: z.string().trim().max(50).optional(),
  jumlahKeseluruhan: z.string().trim().max(50).optional(),
  catatanPemeriksaan: z.string().trim().max(5000).optional(),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SAVE_DRAFT"),
    content: contentSchema,
  }),
  z.object({
    action: z.literal("FINALIZE"),
  }),
  z.object({
    action: z.literal("REOPEN"),
    reason: z.string().trim().min(5, "Alasan pembukaan kembali wajib diisi."),
  }),
  z.object({
    action: z.literal("FORWARD_INTEGRITY"),
  }),
]);

function toDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { user, error } = await requireUser("ADMIN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Hanya Admin Tim PAK yang dapat mengelola berita acara." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = requestSchema.parse(body);

    const submission = await prisma.dupakSubmission.findUnique({
      where: {
        id,
      },
      include: {
        lecturer: {
          select: {
            id: true,
            fullName: true,
            userId: true,
          },
        },
        examinationMinute: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { message: "Pengajuan DUPAK tidak ditemukan." },
        { status: 404 },
      );
    }

    const fromStatus = submission.status as DupakStatus;
    const minute = submission.examinationMinute;

    if (data.action === "SAVE_DRAFT") {
      const allowedStatuses: DupakStatus[] = [
        "PENILAIAN_DISAHKAN",
        "BERITA_ACARA_DRAFT",
      ];

      if (!allowedStatuses.includes(fromStatus)) {
        return NextResponse.json(
          {
            message:
              "Berita acara hanya dapat dibuat setelah penilaian disahkan.",
          },
          { status: 409 },
        );
      }

      if (minute?.status === "FINAL") {
        return NextResponse.json(
          { message: "Berita acara sudah disahkan dan terkunci." },
          { status: 409 },
        );
      }

      const { examinationDate, nomor, ...restContent } = data.content;

      const saved = await prisma.$transaction(async (tx) => {
        const upserted = await tx.examinationMinute.upsert({
          where: {
            submissionId: submission.id,
          },
          update: {
            nomor: nomor || null,
            examinationDate: toDate(examinationDate),
            content: restContent as Prisma.InputJsonValue,
          },
          create: {
            submissionId: submission.id,
            nomor: nomor || null,
            examinationDate: toDate(examinationDate),
            content: restContent as Prisma.InputJsonValue,
            createdById: user.id,
            createdByEmail: user.email,
          },
        });

        if (fromStatus === "PENILAIAN_DISAHKAN") {
          await recordStatusHistory({
            tx,
            submissionId: submission.id,
            fromStatus,
            toStatus: "BERITA_ACARA_DRAFT",
            reason: "Admin membuat draft berita acara.",
            changedById: user.id,
            changedByEmail: user.email,
            changedByRole: user.role,
          });

          await tx.dupakSubmission.update({
            where: {
              id: submission.id,
            },
            data: {
              status: "BERITA_ACARA_DRAFT",
            },
          });
        }

        return upserted;
      });

      await logAudit({
        request,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "MINUTE_SAVE_DRAFT",
        entity: "ExaminationMinute",
        entityId: saved.id,
        newValue: { nomor: nomor || null },
        metadata: {
          submissionId: submission.id,
          lecturerName: submission.lecturer.fullName,
        },
      });

      return NextResponse.json({
        message: "Draft berita acara tersimpan.",
        minute: saved,
      });
    }

    if (data.action === "FINALIZE") {
      if (!minute) {
        return NextResponse.json(
          { message: "Draft berita acara belum dibuat." },
          { status: 409 },
        );
      }

      if (minute.status === "FINAL") {
        return NextResponse.json(
          { message: "Berita acara sudah disahkan." },
          { status: 409 },
        );
      }

      if (fromStatus !== "BERITA_ACARA_DRAFT") {
        return NextResponse.json(
          { message: "Berita acara hanya dapat disahkan dari status draft." },
          { status: 409 },
        );
      }

      const now = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.examinationMinute.update({
          where: {
            id: minute.id,
          },
          data: {
            status: "FINAL",
            ratifiedAt: now,
            lockedAt: now,
          },
        });

        await recordStatusHistory({
          tx,
          submissionId: submission.id,
          fromStatus,
          toStatus: "BERITA_ACARA_DISAHKAN",
          reason: "Berita acara pemeriksaan disahkan.",
          changedById: user.id,
          changedByEmail: user.email,
          changedByRole: user.role,
        });

        await tx.dupakSubmission.update({
          where: {
            id: submission.id,
          },
          data: {
            status: "BERITA_ACARA_DISAHKAN",
          },
        });
      });

      await logAudit({
        request,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "MINUTE_FINALIZE",
        entity: "ExaminationMinute",
        entityId: minute.id,
        newValue: { status: "FINAL" },
        metadata: {
          submissionId: submission.id,
          lecturerName: submission.lecturer.fullName,
        },
      });

      await createNotification({
        userId: submission.lecturer.userId,
        title: "Berita Acara Disahkan",
        message:
          "Berita acara pemeriksaan DUPAK Anda telah disahkan oleh Admin Tim PAK.",
        type: "SYSTEM",
        href: "/dosen/dupak",
        metadata: {
          submissionId: submission.id,
        },
      });

      return NextResponse.json({
        message: "Berita acara berhasil disahkan dan dikunci.",
      });
    }

    if (data.action === "REOPEN") {
      if (!minute || minute.status !== "FINAL") {
        return NextResponse.json(
          {
            message:
              "Hanya berita acara yang sudah sah yang dapat dibuka kembali.",
          },
          { status: 409 },
        );
      }

      if (fromStatus !== "BERITA_ACARA_DISAHKAN") {
        return NextResponse.json(
          {
            message: "Berita acara tidak dapat dibuka kembali pada tahap ini.",
          },
          { status: 409 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.examinationMinute.update({
          where: {
            id: minute.id,
          },
          data: {
            status: "DRAFT",
            lockedAt: null,
            reopenedAt: new Date(),
            reopenReason: data.reason,
          },
        });

        await recordStatusHistory({
          tx,
          submissionId: submission.id,
          fromStatus,
          toStatus: "BERITA_ACARA_DRAFT",
          reason: `Berita acara dibuka kembali: ${data.reason}`,
          changedById: user.id,
          changedByEmail: user.email,
          changedByRole: user.role,
        });

        await tx.dupakSubmission.update({
          where: {
            id: submission.id,
          },
          data: {
            status: "BERITA_ACARA_DRAFT",
          },
        });
      });

      await logAudit({
        request,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "MINUTE_REOPEN",
        entity: "ExaminationMinute",
        entityId: minute.id,
        oldValue: { status: "FINAL" },
        newValue: { status: "DRAFT" },
        reason: data.reason,
        metadata: {
          submissionId: submission.id,
        },
      });

      return NextResponse.json({
        message: "Berita acara dibuka kembali sebagai draft.",
      });
    }

    // FORWARD_INTEGRITY
    if (fromStatus !== "BERITA_ACARA_DISAHKAN") {
      return NextResponse.json(
        {
          message:
            "Pengajuan hanya dapat diteruskan ke Komite Integritas setelah berita acara disahkan.",
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await recordStatusHistory({
        tx,
        submissionId: submission.id,
        fromStatus,
        toStatus: "PEMERIKSAAN_INTEGRITAS",
        reason: "Pengajuan diteruskan ke Komite Integritas Akademik.",
        changedById: user.id,
        changedByEmail: user.email,
        changedByRole: user.role,
      });

      await tx.dupakSubmission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: "PEMERIKSAAN_INTEGRITAS",
        },
      });
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "DUPAK_FORWARD_INTEGRITY",
      entity: "DupakSubmission",
      entityId: submission.id,
      newValue: { status: "PEMERIKSAAN_INTEGRITAS" },
    });

    await notifyRole({
      role: "KOMITE_INTEGRITAS_AKADEMIK",
      title: "Pengajuan Masuk Pemeriksaan Integritas",
      message: `Pengajuan DUPAK ${submission.lecturer.fullName} masuk tahap pemeriksaan integritas akademik.`,
      type: "SYSTEM",
      href: "/komite/dashboard",
      metadata: {
        submissionId: submission.id,
      },
    });

    return NextResponse.json({
      message: "Pengajuan diteruskan ke Komite Integritas Akademik.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message || "Data berita acara tidak valid.",
        },
        { status: 400 },
      );
    }

    console.error("MINUTE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal memproses berita acara." },
      { status: 500 },
    );
  }
}
