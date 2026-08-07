/** @format */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageBucket, supabaseAdmin } from "@/lib/supabase-admin";
import {
  canKomiteSee,
  canSenateSee,
  getActivePakAssignment,
} from "@/lib/pak-access";

export const runtime = "nodejs";

function getEvidenceIdFromPath(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Silakan login terlebih dahulu.",
      },
      { status: 401 },
    );
  }

  const evidenceId = getEvidenceIdFromPath(request);

  if (!evidenceId || evidenceId === "dupak-evidence") {
    return NextResponse.json(
      {
        message: "ID bukti DUPAK tidak valid.",
      },
      { status: 400 },
    );
  }

  const evidence = await prisma.dupakEvidence.findUnique({
    where: {
      id: evidenceId,
    },
    include: {
      dupakSubmission: {
        include: {
          lecturer: {
            select: {
              id: true,
              userId: true,
              fullName: true,
            },
          },
        },
      },
    },
  });

  if (!evidence) {
    return NextResponse.json(
      {
        message: "Bukti dokumen DUPAK tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  const isAdmin = user.role === "ADMIN";
  const isOwner =
    user.role === "DOSEN" &&
    evidence.dupakSubmission.lecturer.userId === user.id;

  const isAssignedPak =
    user.role === "TIM_PAK" &&
    Boolean(await getActivePakAssignment(user.id, evidence.dupakSubmissionId));

  const isKomite =
    user.role === "KOMITE_INTEGRITAS_AKADEMIK" &&
    canKomiteSee(evidence.dupakSubmission.status);

  const isSenat =
    user.role === "TIM_SENAT" && canSenateSee(evidence.dupakSubmission.status);

  if (!isAdmin && !isOwner && !isAssignedPak && !isKomite && !isSenat) {
    return NextResponse.json(
      {
        message: "Anda tidak memiliki akses ke bukti dokumen ini.",
      },
      { status: 403 },
    );
  }

  if (!evidence.storagePath) {
    return NextResponse.json(
      {
        message: "File bukti dokumen tidak tersedia.",
      },
      { status: 404 },
    );
  }

  const shouldDownload = request.nextUrl.searchParams.get("download") === "1";

  const { data, error } = await supabaseAdmin.storage
    .from(storageBucket)
    .createSignedUrl(evidence.storagePath, 60, {
      download: shouldDownload ? evidence.fileName || "bukti-dupak" : false,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      {
        message: error?.message || "Gagal membuat akses file bukti DUPAK.",
      },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
