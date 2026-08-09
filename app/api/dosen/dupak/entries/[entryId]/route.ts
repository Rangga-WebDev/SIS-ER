/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { isLecturerEditable } from "@/lib/dupak-workflow";
import type { DupakStatus } from "@/lib/app-types";
import {
  entryUpdateSchema,
  flagLecturerRevision,
  normalizeEntryInput,
  recomputeRowProposer,
} from "@/lib/dupak-entries";

export const runtime = "nodejs";

async function loadOwnedEntry(entryId: string, lecturerId: string) {
  return prisma.dupakItemEntry.findFirst({
    where: {
      id: entryId,
      submission: { lecturerId },
    },
    include: {
      submission: { select: { id: true, status: true } },
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const { user, error } = await requireUser("DOSEN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Tidak memiliki akses." },
      {
        status: 401,
      },
    );
  }

  const lecturer = user.lecturerProfile;

  if (!lecturer) {
    return NextResponse.json(
      { message: "Profil dosen tidak ditemukan." },
      { status: 404 },
    );
  }

  const { entryId } = await params;

  try {
    const entry = await loadOwnedEntry(entryId, lecturer.id);

    if (!entry) {
      return NextResponse.json(
        { message: "Rincian tidak ditemukan." },
        { status: 404 },
      );
    }

    if (!isLecturerEditable(entry.submission.status as DupakStatus)) {
      return NextResponse.json(
        {
          message:
            "Pengajuan sedang diproses dan terkunci. Rincian hanya dapat diubah saat pengajuan dikembalikan untuk revisi.",
        },
        { status: 409 },
      );
    }

    const body = await request.json();
    const data = entryUpdateSchema.parse(body);
    const normalized = normalizeEntryInput(data);

    const updated = await prisma.$transaction(async (tx) => {
      // Arsipkan rincian lama sebelum berubah (histori append-only).
      await tx.dupakReviewHistory.create({
        data: {
          submissionId: entry.submission.id,
          rowCode: entry.rowCode,
          entryKey: entry.id,
          kind: "ENTRY",
          snapshot: {
            title: entry.title,
            subCategory: entry.subCategory,
            description: entry.description,
            activityYear: entry.activityYear,
            credit: entry.credit,
            evidenceUrl: entry.evidenceUrl,
            updatedAt: entry.updatedAt.toISOString(),
          },
          reason: "Rincian diperbarui dosen.",
          actorEmail: user.email,
          actorRole: "DOSEN",
        },
      });

      const result = await tx.dupakItemEntry.update({
        where: { id: entry.id },
        data: normalized,
      });

      await recomputeRowProposer(tx, entry.submission.id, entry.rowCode);

      await flagLecturerRevision(tx, {
        submissionId: entry.submission.id,
        rowCode: entry.rowCode,
        entryKey: entry.id,
        actorEmail: user.email,
        reason: "Rincian diperbarui dosen setelah diminta revisi.",
      });

      return result;
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "DUPAK_ENTRY_UPDATE",
      entity: "DupakItemEntry",
      entityId: entry.id,
      oldValue: { title: entry.title, credit: entry.credit },
      newValue: { title: normalized.title, credit: normalized.credit },
      metadata: {
        submissionId: entry.submission.id,
        rowCode: entry.rowCode,
      },
    });

    return NextResponse.json({
      message: "Rincian kegiatan berhasil diperbarui.",
      entry: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data rincian tidak valid." },
        { status: 400 },
      );
    }

    console.error("DUPAK_ENTRY_UPDATE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal memperbarui rincian kegiatan." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const { user, error } = await requireUser("DOSEN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Tidak memiliki akses." },
      {
        status: 401,
      },
    );
  }

  const lecturer = user.lecturerProfile;

  if (!lecturer) {
    return NextResponse.json(
      { message: "Profil dosen tidak ditemukan." },
      { status: 404 },
    );
  }

  const { entryId } = await params;

  try {
    const entry = await loadOwnedEntry(entryId, lecturer.id);

    if (!entry) {
      return NextResponse.json(
        { message: "Rincian tidak ditemukan." },
        { status: 404 },
      );
    }

    if (!isLecturerEditable(entry.submission.status as DupakStatus)) {
      return NextResponse.json(
        {
          message:
            "Pengajuan sedang diproses dan terkunci. Rincian hanya dapat diubah saat pengajuan dikembalikan untuk revisi.",
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      // Arsipkan rincian dan penilaiannya sebelum dihapus.
      await tx.dupakReviewHistory.create({
        data: {
          submissionId: entry.submission.id,
          rowCode: entry.rowCode,
          entryKey: entry.id,
          kind: "ENTRY",
          snapshot: {
            title: entry.title,
            subCategory: entry.subCategory,
            description: entry.description,
            activityYear: entry.activityYear,
            credit: entry.credit,
            evidenceUrl: entry.evidenceUrl,
            updatedAt: entry.updatedAt.toISOString(),
          },
          reason: "Rincian dihapus dosen.",
          actorEmail: user.email,
          actorRole: "DOSEN",
        },
      });

      await flagLecturerRevision(tx, {
        submissionId: entry.submission.id,
        rowCode: entry.rowCode,
        entryKey: entry.id,
        actorEmail: user.email,
        reason: "Rincian dihapus dosen.",
        deleteReviews: true,
      });

      await tx.dupakItemEntry.delete({
        where: { id: entry.id },
      });

      await recomputeRowProposer(tx, entry.submission.id, entry.rowCode);
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "DUPAK_ENTRY_DELETE",
      entity: "DupakItemEntry",
      entityId: entry.id,
      oldValue: { rowCode: entry.rowCode, title: entry.title },
      metadata: {
        submissionId: entry.submission.id,
        rowCode: entry.rowCode,
      },
    });

    return NextResponse.json({
      message: "Rincian kegiatan berhasil dihapus.",
    });
  } catch (error) {
    console.error("DUPAK_ENTRY_DELETE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menghapus rincian kegiatan." },
      { status: 500 },
    );
  }
}
