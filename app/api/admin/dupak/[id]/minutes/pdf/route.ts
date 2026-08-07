/** @format */

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeAssessmentCompleteness, toCreditData } from "@/lib/pak-access";
import { computeDupakSubtotals } from "@/lib/dupak-template";

export const runtime = "nodejs";

type MinuteContent = {
  tempat?: string;
  jabatanSaatIni?: string;
  tmt?: string;
  usulanJabatan?: string;
  kumSebelumnya?: string;
  kebutuhanKum?: string;
  kumDicapai?: string;
  unsurPendidikan?: string;
  unsurPenelitian?: string;
  unsurPengabdian?: string;
  unsurPenunjang?: string;
  jumlahKeseluruhan?: string;
  catatanPemeriksaan?: string;
};

function toObject<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return value as T;
}

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function collectPdfBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.end();
  });
}

export async function GET(
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
      { message: "Tidak memiliki akses." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  const submission = await prisma.dupakSubmission.findUnique({
    where: {
      id,
    },
    include: {
      lecturer: true,
      examinationMinute: true,
      pakAssignments: {
        where: {
          status: {
            in: ["ACTIVE", "COMPLETED"],
          },
        },
        include: {
          pakUser: {
            select: {
              email: true,
            },
          },
          assessment: {
            select: {
              isRatified: true,
              totalScore: true,
            },
          },
        },
      },
    },
  });

  if (!submission || !submission.examinationMinute) {
    return NextResponse.json(
      { message: "Berita acara belum dibuat." },
      { status: 404 },
    );
  }

  const minute = submission.examinationMinute;
  const content = toObject<MinuteContent>(minute.content, {});
  const completeness = computeAssessmentCompleteness(
    toCreditData(submission.creditData),
  );

  // Fallback nilai unsur dari subtotal penilai bila admin belum mengisi.
  const subtotals = computeDupakSubtotals(toCreditData(submission.creditData));

  const asText = (value?: number) => (value ? String(value) : "-");

  const unsurPendidikanTotal =
    (subtotals["JUMLAH_UNSUR_PENDIDIKAN"]?.assessorTotal || 0) +
    (subtotals["JUMLAH_UNSUR_PENGAJARAN"]?.assessorTotal || 0);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("BERITA ACARA PEMERIKSAAN", { align: "center" });

  doc.fontSize(11).text("PENETAPAN ANGKA KREDIT JABATAN AKADEMIK DOSEN", {
    align: "center",
  });

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Nomor: ${minute.nomor || "-"}`, { align: "center" });

  doc.moveDown(1.2);

  doc
    .fontSize(10)
    .text(
      `Pada hari ${formatDate(minute.examinationDate)}, Tim Penilai Angka Kredit telah melakukan pemeriksaan terhadap usulan penetapan angka kredit dosen berikut:`,
      { align: "justify" },
    );

  doc.moveDown(0.8);

  const rows: [string, string][] = [
    ["Nama Pengusul", submission.lecturer.fullName],
    ["NIDN/NIDK/NUPTK", submission.lecturer.nidnOrNuptk],
    [
      "Jabatan Akademik Saat Ini",
      content.jabatanSaatIni || submission.lecturer.academicPosition,
    ],
    ["TMT", content.tmt || "-"],
    ["Usulan Jabatan", content.usulanJabatan || "-"],
    ["KUM Sebelumnya", content.kumSebelumnya || "-"],
    ["Kebutuhan KUM", content.kebutuhanKum || "-"],
    [
      "KUM yang Dicapai",
      content.kumDicapai || String(completeness.totalScore || "-"),
    ],
    [
      "Unsur Pendidikan",
      content.unsurPendidikan ||
        asText(Math.round(unsurPendidikanTotal * 100) / 100),
    ],
    [
      "Unsur Penelitian",
      content.unsurPenelitian ||
        asText(subtotals["JUMLAH_UNSUR_PENELITIAN"]?.assessorTotal),
    ],
    [
      "Unsur Pengabdian",
      content.unsurPengabdian ||
        asText(subtotals["JUMLAH_UNSUR_PENGABDIAN"]?.assessorTotal),
    ],
    [
      "Unsur Penunjang",
      content.unsurPenunjang ||
        asText(subtotals["JUMLAH_UNSUR_PENUNJANG"]?.assessorTotal),
    ],
    [
      "Jumlah Keseluruhan",
      content.jumlahKeseluruhan || String(completeness.totalScore || "-"),
    ],
  ];

  for (const [label, value] of rows) {
    const y = doc.y;
    doc.font("Helvetica-Bold").text(label, 56, y, { width: 200 });
    doc.font("Helvetica").text(`: ${value}`, 260, y, { width: 280 });
    doc.moveDown(0.35);
  }

  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").text("Catatan Pemeriksaan:");
  doc
    .font("Helvetica")
    .text(content.catatanPemeriksaan || "-", { align: "justify" });

  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").text("Tim Penilai:");

  submission.pakAssignments.forEach((assignment, index) => {
    doc
      .font("Helvetica")
      .text(
        `${index + 1}. ${assignment.pakUser.email}${
          assignment.assessment?.isRatified
            ? ` (disahkan, total ${assignment.assessment.totalScore ?? "-"})`
            : ""
        }`,
      );
  });

  doc.moveDown(1.5);

  const tempatTanggal = `${content.tempat || "Makassar"}, ${formatDate(
    minute.ratifiedAt || minute.examinationDate || new Date(),
  )}`;

  doc.text(tempatTanggal, { align: "right" });
  doc.moveDown(0.4);
  doc.text("Admin Tim PAK,", { align: "right" });
  doc.moveDown(3);
  doc.text("(____________________)", { align: "right" });

  doc.moveDown(1);

  doc
    .fontSize(8)
    .fillColor("#64748b")
    .text(
      `Status dokumen: ${minute.status === "FINAL" ? "DISAHKAN" : "DRAFT"} • Dicetak dari JAFUNG SMART oleh ${user.email}`,
      { align: "center" },
    );

  const buffer = await collectPdfBuffer(doc);

  const fileName = `berita-acara-${submission.lecturer.nidnOrNuptk}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
