/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const verifySchema = z.object({
  status: z.enum(["VALID", "REVISION", "REJECTED"]),
  adminNote: z.string().trim().optional(),
});

async function refreshLecturerDocumentState(lecturerId: string) {
  const requiredRequirements = await prisma.documentRequirement.findMany({
    where: {
      isRequired: true,
      audience: {
        in: ["DOSEN", "BOTH"],
      },
    },
    select: {
      id: true,
    },
  });

  const requiredIds = requiredRequirements.map((item) => item.id);

  if (requiredIds.length === 0) {
    await prisma.lecturerProfile.update({
      where: {
        id: lecturerId,
      },
      data: {
        documentStatus: "BELUM_UPLOAD",
        verificationStatus: "MENUNGGU_DATA",
      },
    });

    return;
  }

  const submissions = await prisma.documentSubmission.findMany({
    where: {
      lecturerId,
      requirementId: {
        in: requiredIds,
      },
    },
    select: {
      requirementId: true,
      status: true,
    },
  });

  const uploadedRequirementIds = new Set(
    submissions.map((item) => item.requirementId),
  );

  const validRequirementIds = new Set(
    submissions
      .filter((item) => item.status === "VALID")
      .map((item) => item.requirementId),
  );

  const hasRevision = submissions.some((item) => item.status === "REVISION");
  const hasRejected = submissions.some((item) => item.status === "REJECTED");
  const hasPending = submissions.some((item) => item.status === "PENDING");

  const documentStatus =
    uploadedRequirementIds.size === 0
      ? "BELUM_UPLOAD"
      : uploadedRequirementIds.size >= requiredIds.length
        ? "LENGKAP"
        : "SEBAGIAN";

  let verificationStatus = "MENUNGGU_VALIDASI";

  if (hasRejected) {
    verificationStatus = "DITOLAK";
  } else if (hasRevision) {
    verificationStatus = "PERLU_REVISI";
  } else if (validRequirementIds.size >= requiredIds.length) {
    verificationStatus = "TERVERIFIKASI";
  } else if (hasPending || uploadedRequirementIds.size > 0) {
    verificationStatus = "MENUNGGU_VALIDASI";
  } else {
    verificationStatus = "MENUNGGU_DATA";
  }

  await prisma.lecturerProfile.update({
    where: {
      id: lecturerId,
    },
    data: {
      documentStatus,
      verificationStatus,
    },
  });
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      submissionId: string;
    }>;
  },
) {
  const { user, error } = await requireUser("ADMIN");

  if (error || !user) {
    return NextResponse.json(
      {
        message: "Hanya admin yang dapat memverifikasi dokumen.",
      },
      { status: 403 },
    );
  }

  const limit = await rateLimit({
    key: `verify:${user.id}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(
      "Terlalu banyak aksi verifikasi. Coba lagi sebentar.",
    );
  }

  try {
    const { submissionId } = await context.params;
    const body = await request.json();
    const data = verifySchema.parse(body);

    if (
      (data.status === "REVISION" || data.status === "REJECTED") &&
      !data.adminNote
    ) {
      return NextResponse.json(
        {
          message:
            "Catatan admin wajib diisi jika dokumen diberi status revisi atau ditolak.",
        },
        { status: 400 },
      );
    }

    const existingSubmission = await prisma.documentSubmission.findUnique({
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

    if (!existingSubmission) {
      return NextResponse.json(
        {
          message: "Dokumen tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    const updatedSubmission = await prisma.documentSubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: data.status,
        adminNote: data.adminNote || null,
        verificationLogs: {
          create: {
            status: data.status,
            note: data.adminNote || null,
            reviewerId: user.id,
            reviewerEmail: user.email,
          },
        },
      },
      include: {
        requirement: {
          include: {
            category: true,
          },
        },
      },
    });

    await refreshLecturerDocumentState(existingSubmission.lecturerId);

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: "DOCUMENT_VERIFY",
        entity: "DocumentSubmission",
        entityId: updatedSubmission.id,
        metadata: {
          status: data.status,
          adminNote: data.adminNote || null,
          lecturerId: existingSubmission.lecturerId,
          lecturerName: existingSubmission.lecturer.fullName,
          lecturerEmail: existingSubmission.lecturer.user.email,
          requirementCode: updatedSubmission.requirement.code,
          requirementName: updatedSubmission.requirement.name,
          categoryCode: updatedSubmission.requirement.category.code,
          categoryName: updatedSubmission.requirement.category.name,
        },
      },
    });

    const notificationType =
      data.status === "VALID"
        ? "DOCUMENT_VERIFIED"
        : data.status === "REVISION"
          ? "DOCUMENT_REVISION"
          : "DOCUMENT_REJECTED";

    const notificationTitle =
      data.status === "VALID"
        ? "Dokumen Dinyatakan Valid"
        : data.status === "REVISION"
          ? "Dokumen Perlu Revisi"
          : "Dokumen Ditolak";

    await createNotification({
      userId: existingSubmission.lecturer.userId,
      title: notificationTitle,
      message: `${updatedSubmission.requirement.name} pada kategori ${updatedSubmission.requirement.category.name} diberi status ${data.status}.`,
      type: notificationType,
      href: "/dosen/dokumen",
      metadata: {
        status: data.status,
        adminNote: data.adminNote || null,
        submissionId: updatedSubmission.id,
        requirementCode: updatedSubmission.requirement.code,
        requirementName: updatedSubmission.requirement.name,
        categoryCode: updatedSubmission.requirement.category.code,
        categoryName: updatedSubmission.requirement.category.name,
      },
    });

    return NextResponse.json({
      message: "Status dokumen berhasil diperbarui.",
      submission: updatedSubmission,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message || "Data verifikasi tidak valid.",
        },
        { status: 400 },
      );
    }

    console.error("VERIFY_SUBMISSION_ERROR:", error);

    return NextResponse.json(
      {
        message: "Gagal memverifikasi dokumen.",
      },
      { status: 500 },
    );
  }
}
