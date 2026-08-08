/** @format */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivePakAssignmentForLecturer } from "@/lib/pak-access";
import { storageBucket, supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      versionId: string;
    }>;
  },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Silakan login terlebih dahulu." },
      { status: 401 },
    );
  }

  const { versionId } = await context.params;

  const version = await prisma.documentVersion.findUnique({
    where: {
      id: versionId,
    },
    include: {
      submission: {
        include: {
          lecturer: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!version) {
    return NextResponse.json(
      { message: "Versi dokumen tidak ditemukan." },
      { status: 404 },
    );
  }

  const isAdmin = user.role === "ADMIN";
  const isOwner =
    user.role === "DOSEN" && version.submission.lecturer.userId === user.id;

  // Penilai hanya boleh membuka versi dokumen dosen yang sedang ditugaskan kepadanya.
  const isAssignedPak =
    user.role === "TIM_PAK" &&
    Boolean(
      await getActivePakAssignmentForLecturer(
        user.id,
        version.submission.lecturer.id,
      ),
    );

  if (!isAdmin && !isOwner && !isAssignedPak) {
    return NextResponse.json(
      { message: "Anda tidak memiliki akses ke versi dokumen ini." },
      { status: 403 },
    );
  }

  if (!version.storagePath) {
    return NextResponse.json(
      { message: "Versi ini tidak memiliki file tersimpan." },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  const { data, error } = await supabaseAdmin.storage
    .from(storageBucket)
    .createSignedUrl(version.storagePath, 60, {
      download: download ? version.fileName || "dokumen" : false,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { message: error?.message || "Gagal membuat signed URL versi dokumen." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
