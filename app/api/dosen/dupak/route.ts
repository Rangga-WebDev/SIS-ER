/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";
import {
  DUPAK_PERSONAL_FIELDS,
  DUPAK_TEMPLATE_ROWS,
  getNumberValue,
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
    const creditData = data.creditData as DupakCreditData;

    const completionPercent = calculateCompletion({
      nomor: data.nomor,
      instansi: data.instansi,
      masaPenilaianStart: data.masaPenilaianStart,
      masaPenilaianEnd: data.masaPenilaianEnd,
      personalData,
      creditData,
    });

    const status = data.action === "SUBMIT" ? "SUBMITTED" : "DRAFT";

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

    return NextResponse.json({
      message:
        data.action === "SUBMIT"
          ? "DUPAK berhasil dikirim ke admin."
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
