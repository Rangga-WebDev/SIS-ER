/** @format */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageBucket, supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      submissionId: string;
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

  const { submissionId } = await context.params;

  const submission = await prisma.documentSubmission.findUnique({
    where: {
      id: submissionId,
    },
    include: {
      lecturer: {
        include: {
          user: true,
        },
      },
      requirement: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json(
      {
        message: "Dokumen tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  const isAdmin = user.role === "ADMIN";
  const isOwner =
    user.role === "DOSEN" && submission.lecturer.userId === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      {
        message: "Anda tidak memiliki akses ke dokumen ini.",
      },
      { status: 403 },
    );
  }

  if (!submission.storagePath) {
    return NextResponse.json(
      {
        message: "Dokumen ini tidak memiliki file tersimpan.",
      },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  const { data, error } = await supabaseAdmin.storage
    .from(storageBucket)
    .createSignedUrl(submission.storagePath, 60, {
      download: download ? submission.fileName || "dokumen" : false,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      {
        message: error?.message || "Gagal membuat signed URL dokumen.",
      },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
