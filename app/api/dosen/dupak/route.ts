/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";
import { recordStatusHistory } from "@/lib/audit";
import { isLecturerEditable } from "@/lib/dupak-workflow";
import type { DupakStatus } from "@/lib/app-types";
import {
  DUPAK_PERSONAL_FIELDS,
  DUPAK_TEMPLATE_ROWS,
  getNumberValue,
  sumEntryCredits,
  type DupakCreditData,
  type DupakPersonalData,
} from "@/lib/dupak-template";

export const runtime = "nodejs";

const dupakSchema = z.object({
  nomor: z.string().trim().optional(),
  instansi: z.string().trim().optional(),
  masaPenilaianStart: z.string().trim().optional(),
  masaPenilaianEnd: z.string().trim().optional(),
  personalData: z.record(z.string(), z.unknown()).default({}),
  creditData: z.record(z.string(), z.unknown()).default({}),
  supportNotes: z.string().trim().optional(),
  currentStep: z.number().int().min(1).max(4).default(1),
  action: z.enum(["SAVE", "SUBMIT"]).default("SAVE"),
});

function toDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanJson(value: unknown) {
  return JSON.parse(JSON.stringify(value || {})) as Prisma.InputJsonValue;
}

function toCreditData(value: unknown): DupakCreditData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as DupakCreditData;
}

function mergeCreditDataKeepingAssessor(
  incoming: DupakCreditData,
  existing: DupakCreditData,
) {
  const merged: DupakCreditData = {};

  const rowCodes = new Set([
    ...Object.keys(incoming || {}),
    ...Object.keys(existing || {}),
  ]);

  for (const rowCode of rowCodes) {
    merged[rowCode] = {
      oldProposer: incoming[rowCode]?.oldProposer,
      newProposer: incoming[rowCode]?.newProposer,
      oldAssessor: existing[rowCode]?.oldAssessor,
      newAssessor: existing[rowCode]?.newAssessor,
    };
  }

  return merged;
}

function calculateCompletion({
  nomor,
  instansi,
  masaPenilaianStart,
  masaPenilaianEnd,
  personalData,
  creditData,
}: {
  nomor?: string;
  instansi?: string;
  masaPenilaianStart?: string;
  masaPenilaianEnd?: string;
  personalData: DupakPersonalData;
  creditData: DupakCreditData;
}) {
  const requiredHeader = [
    nomor,
    instansi,
    masaPenilaianStart,
    masaPenilaianEnd,
  ];
  const headerFilled = requiredHeader.filter((item) =>
    String(item || "").trim(),
  ).length;

  const personalFilled = DUPAK_PERSONAL_FIELDS.filter((field) =>
    String(personalData[field.key] || "").trim(),
  ).length;

  const inputRows = DUPAK_TEMPLATE_ROWS.filter((row) => row.type === "ITEM");
  const filledCreditRows = inputRows.filter((row) => {
    const value = creditData[row.code];

    if (!value) return false;

    return (
      getNumberValue(value.oldProposer) > 0 ||
      getNumberValue(value.newProposer) > 0 ||
      getNumberValue(value.oldAssessor) > 0 ||
      getNumberValue(value.newAssessor) > 0
    );
  }).length;

  const headerScore = headerFilled / requiredHeader.length;
  const personalScore = personalFilled / DUPAK_PERSONAL_FIELDS.length;
  const creditScore =
    inputRows.length > 0 ? filledCreditRows / inputRows.length : 0;

  return Math.round(headerScore * 25 + personalScore * 45 + creditScore * 30);
}

export async function PATCH(request: Request) {
  const { user, error } = await requireUser("DOSEN");

  if (error || !user) {
    return NextResponse.json(
      { message: "Tidak memiliki akses." },
      { status: 401 },
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
    const data = dupakSchema.parse(body);

    const personalData = data.personalData as DupakPersonalData;

    const existingSubmission = await prisma.dupakSubmission.findUnique({
      where: {
        lecturerId: lecturer.id,
      },
      select: {
        id: true,
        status: true,
        creditData: true,
      },
    });

    const currentStatus = (existingSubmission?.status ||
      "DRAFT") as DupakStatus;

    if (existingSubmission && !isLecturerEditable(currentStatus)) {
      return NextResponse.json(
        {
          message:
            "Pengajuan sedang diproses dan terkunci. Perubahan hanya dapat dilakukan jika pengajuan dikembalikan untuk revisi.",
        },
        { status: 409 },
      );
    }

    const creditData = mergeCreditDataKeepingAssessor(
      toCreditData(data.creditData),
      toCreditData(existingSubmission?.creditData),
    );

    // Baris yang memiliki rincian kegiatan: AK pengusul baru dihitung server
    // dari jumlah rincian, bukan dari input bebas klien.
    if (existingSubmission) {
      const entries = await prisma.dupakItemEntry.findMany({
        where: { submissionId: existingSubmission.id },
        select: { rowCode: true, credit: true },
      });

      const entriesByRow = new Map<string, { credit: string | null }[]>();

      for (const entry of entries) {
        const list = entriesByRow.get(entry.rowCode) || [];
        list.push(entry);
        entriesByRow.set(entry.rowCode, list);
      }

      for (const [rowCode, rowEntries] of entriesByRow) {
        creditData[rowCode] = {
          ...(creditData[rowCode] || {}),
          newProposer: String(sumEntryCredits(rowEntries)),
        };
      }
    }

    const completionPercent = calculateCompletion({
      nomor: data.nomor,
      instansi: data.instansi,
      masaPenilaianStart: data.masaPenilaianStart,
      masaPenilaianEnd: data.masaPenilaianEnd,
      personalData,
      creditData,
    });

    // Kirim ulang setelah revisi Tim PAK mengikuti status khusus agar
    // penilai tahu ini pengajuan revisi, bukan pengajuan baru.
    const isPakRevision =
      currentStatus === "PERLU_REVISI_TIM_PAK" || currentStatus === "REVISION";

    const submitStatus: DupakStatus = isPakRevision
      ? "DIKIRIM_ULANG_SETELAH_REVISI"
      : "SUBMITTED";

    const status: DupakStatus =
      data.action === "SUBMIT"
        ? submitStatus
        : currentStatus === "DRAFT"
          ? "DRAFT"
          : currentStatus;

    const submission = await prisma.dupakSubmission.upsert({
      where: {
        lecturerId: lecturer.id,
      },
      update: {
        nomor: data.nomor || null,
        instansi: data.instansi || null,
        masaPenilaianStart: toDate(data.masaPenilaianStart),
        masaPenilaianEnd: toDate(data.masaPenilaianEnd),
        personalData: cleanJson(personalData),
        creditData: cleanJson(creditData),
        supportNotes: data.supportNotes || null,
        currentStep: data.currentStep,
        completionPercent,
        status,
        submittedAt: data.action === "SUBMIT" ? new Date() : undefined,
      },
      create: {
        lecturerId: lecturer.id,
        nomor: data.nomor || null,
        instansi: data.instansi || null,
        masaPenilaianStart: toDate(data.masaPenilaianStart),
        masaPenilaianEnd: toDate(data.masaPenilaianEnd),
        personalData: cleanJson(personalData),
        creditData: cleanJson(creditData),
        supportNotes: data.supportNotes || null,
        currentStep: data.currentStep,
        completionPercent,
        status,
        submittedAt: data.action === "SUBMIT" ? new Date() : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: data.action === "SUBMIT" ? "DUPAK_SUBMIT" : "DUPAK_SAVE",
        entity: "DupakSubmission",
        entityId: submission.id,
        metadata: {
          lecturerId: lecturer.id,
          lecturerName: lecturer.fullName,
          completionPercent,
          status,
        },
      },
    });

    if (data.action === "SUBMIT") {
      await recordStatusHistory({
        submissionId: submission.id,
        fromStatus: existingSubmission ? currentStatus : null,
        toStatus: status,
        reason: isPakRevision
          ? "Dosen mengirim ulang pengajuan setelah revisi."
          : "Dosen mengirim pengajuan.",
        changedById: user.id,
        changedByEmail: user.email,
        changedByRole: user.role,
      });

      if (isPakRevision) {
        // Beri tahu Tim PAK yang masih aktif menilai pengajuan ini.
        const activeAssignments = await prisma.pakAssignment.findMany({
          where: {
            submissionId: submission.id,
            status: "ACTIVE",
          },
          select: {
            pakUserId: true,
          },
        });

        if (activeAssignments.length > 0) {
          await prisma.notification.createMany({
            data: activeAssignments.map((assignment) => ({
              userId: assignment.pakUserId,
              title: "Revisi DUPAK Dikirim Ulang",
              message: `${lecturer.fullName} mengirim ulang DUPAK setelah revisi.`,
              type: "SYSTEM" as const,
              href: "/pak/tugas",
            })),
          });
        }
      } else {
        await notifyAdmins({
          title: "DUPAK Dosen Dikirim",
          message: `${lecturer.fullName} mengirim pengisian DUPAK dengan progres ${completionPercent}%.`,
          type: "SYSTEM",
          href: `/admin/dupak/${submission.id}`,
          metadata: {
            lecturerId: lecturer.id,
            lecturerName: lecturer.fullName,
            completionPercent,
            status,
          },
        });
      }
    }

    return NextResponse.json({
      message:
        data.action === "SUBMIT"
          ? isPakRevision
            ? "Revisi DUPAK berhasil dikirim ulang ke Tim PAK."
            : "DUPAK berhasil dikirim ke admin."
          : "DUPAK berhasil disimpan sebagai draft.",
      submission,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Data DUPAK tidak valid." },
        { status: 400 },
      );
    }

    console.error("DUPAK_SAVE_ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan DUPAK." },
      { status: 500 },
    );
  }
}
