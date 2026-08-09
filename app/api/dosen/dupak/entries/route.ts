/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { isLecturerEditable } from "@/lib/dupak-workflow";
import type { DupakStatus } from "@/lib/app-types";
import {
  MAX_ENTRIES_PER_ROW,
  entryInputSchema,
  findItemRow,
  normalizeEntryInput,
  recomputeRowProposer,
} from "@/lib/dupak-entries";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  try {
    const body = await request.json();
    const data = entryInputSchema.parse(body);

    const row = findItemRow(data.rowCode);

    if (!row) {
      return NextResponse.json(
        { message: "Rincian hanya dapat ditambahkan pada baris kegiatan." },
        { status: 400 },
      );
    }

    const existing = await prisma.dupakSubmission.findUnique({
      where: { lecturerId: lecturer.id },
      select: { id: true, status: true },
    });

    if (existing && !isLecturerEditable(existing.status as DupakStatus)) {
      return NextResponse.json(
        {
          message:
            "Pengajuan sedang diproses dan terkunci. Rincian hanya dapat diubah saat pengajuan dikembalikan untuk revisi.",
        },
        { status: 409 },
      );
    }

    const submission =
      existing ||
      (await prisma.dupakSubmission.create({
        data: {
          lecturerId: lecturer.id,
          instansi: lecturer.institution,
          personalData: {
            nama: lecturer.fullName,
            nidnOrNuptk: lecturer.nidnOrNuptk,
            jabatanAkademikTmt: lecturer.academicPosition,
            unitKerja: lecturer.studyProgram,
          },
          creditData: {},
          status: "DRAFT",
          currentStep: 3,
          completionPercent: 0,
        },
        select: { id: true, status: true },
      }));

    const rowEntryCount = await prisma.dupakItemEntry.count({
      where: { submissionId: submission.id, rowCode: data.rowCode },
    });

    if (rowEntryCount >= MAX_ENTRIES_PER_ROW) {
      return NextResponse.json(
        {
          message: `Maksimal ${MAX_ENTRIES_PER_ROW} rincian per baris kegiatan.`,
        },
        { status: 400 },
      );
    }

    const normalized = normalizeEntryInput(data);

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.dupakItemEntry.create({
        data: {
          submissionId: submission.id,
          rowCode: data.rowCode,
          ...normalized,
          orderIndex: rowEntryCount,
        },
      });

      await recomputeRowProposer(tx, submission.id, data.rowCode);

      return created;
    });

    await logAudit({
      request,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "DUPAK_ENTRY_CREATE",
      entity: "DupakItemEntry",
      entityId: entry.id,
      newValue: { rowCode: data.rowCode, title: normalized.title },
      metadata: {
        submissionId: submission.id,
        lecturerName: lecturer.fullName,
      },
    });

    return NextResponse.json({
      message: "Rincian kegiatan berhasil ditambahkan.",
      entry,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data rincian tidak valid." },
        { status: 400 },
      );
    }

    console.error("DUPAK_ENTRY_CREATE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menambahkan rincian kegiatan." },
      { status: 500 },
    );
  }
}
