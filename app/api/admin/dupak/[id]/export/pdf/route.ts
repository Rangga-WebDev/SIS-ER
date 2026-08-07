/** @format */

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeDupakSubtotals,
  DUPAK_PERSONAL_FIELDS,
  DUPAK_TEMPLATE_ROWS,
  getAssessorTotal,
  getProposerTotal,
  type DupakCreditData,
  type DupakPersonalData,
} from "@/lib/dupak-template";

export const runtime = "nodejs";

type EvidenceItem = {
  id: string;
  rowCode: string;
  rowLabel: string;
  evidenceUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  note: string | null;
  uploadedAt: Date;
};

function toObject<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return value as T;
}

function formatDate(date?: Date | string | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date?: Date | string | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function safeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

function collectPdfBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", reject);
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, requiredHeight: number) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  if (doc.y + requiredHeight > bottomLimit) {
    doc.addPage();
  }
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 36);

  doc
    .moveDown(0.8)
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#0f172a")
    .text(title, {
      underline: false,
    });

  doc
    .moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
    .strokeColor("#cbd5e1")
    .stroke();

  doc.moveDown(0.6);
}

function drawKeyValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  labelWidth = 160,
) {
  ensureSpace(doc, 22);

  const x = doc.page.margins.left;
  const y = doc.y;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#334155")
    .text(label, x, y, {
      width: labelWidth,
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#0f172a")
    .text(value || "-", x + labelWidth + 10, y, {
      width:
        doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right -
        labelWidth -
        10,
    });

  doc.moveDown(0.45);
}

function drawTableHeader(doc: PDFKit.PDFDocument) {
  ensureSpace(doc, 44);

  const left = doc.page.margins.left;
  const top = doc.y;
  const widths = [190, 45, 45, 50, 45, 45, 50, 105];
  const headers = [
    "Unsur / Butir Kegiatan",
    "Inst.\nLama",
    "Inst.\nBaru",
    "Inst.\nJml",
    "Tim\nLama",
    "Tim\nBaru",
    "Tim\nJml",
    "Bukti",
  ];

  let x = left;

  doc
    .rect(
      left,
      top,
      widths.reduce((a, b) => a + b, 0),
      34,
    )
    .fill("#0f172a");

  headers.forEach((header, index) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor("#ffffff")
      .text(header, x + 4, top + 6, {
        width: widths[index] - 8,
        align: index === 0 ? "left" : "center",
      });

    x += widths[index];
  });

  doc.y = top + 38;
}

function drawCreditRow({
  doc,
  label,
  level,
  oldProposer,
  newProposer,
  proposerTotal,
  oldAssessor,
  newAssessor,
  assessorTotal,
  evidenceText,
  evidenceLink,
  isSection,
  isTotal,
}: {
  doc: PDFKit.PDFDocument;
  label: string;
  level: number;
  oldProposer?: string;
  newProposer?: string;
  proposerTotal?: string;
  oldAssessor?: string;
  newAssessor?: string;
  assessorTotal?: string;
  evidenceText?: string;
  evidenceLink?: string;
  isSection?: boolean;
  isTotal?: boolean;
}) {
  const widths = [190, 45, 45, 50, 45, 45, 50, 105];
  const tableWidth = widths.reduce((a, b) => a + b, 0);
  const left = doc.page.margins.left;

  const labelText = `${"  ".repeat(level)}${label}`;
  const rowHeight = Math.max(
    24,
    doc.heightOfString(labelText, {
      width: widths[0] - 8,
    }) + 10,
    doc.heightOfString(evidenceText || "-", {
      width: widths[7] - 8,
    }) + 10,
  );

  ensureSpace(doc, rowHeight + 6);

  const y = doc.y;

  if (isSection) {
    doc.rect(left, y, tableWidth, rowHeight).fill("#e0f2fe");

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#0c4a6e")
      .text(label, left + 5, y + 7, {
        width: tableWidth - 10,
      });

    doc.y = y + rowHeight;
    return;
  }

  doc
    .rect(left, y, tableWidth, rowHeight)
    .fill(isTotal ? "#f1f5f9" : "#ffffff");

  let x = left;

  const values = [
    labelText,
    oldProposer || "-",
    newProposer || "-",
    proposerTotal || "-",
    oldAssessor || "-",
    newAssessor || "-",
    assessorTotal || "-",
    evidenceText || "-",
  ];

  values.forEach((value, index) => {
    doc
      .rect(x, y, widths[index], rowHeight)
      .strokeColor("#cbd5e1")
      .lineWidth(0.4)
      .stroke();

    const isEvidenceLinkCell = index === 7 && Boolean(evidenceLink);

    doc
      .font(isTotal || index === 0 ? "Helvetica-Bold" : "Helvetica")
      .fontSize(index === 0 ? 7.2 : 7)
      .fillColor(isEvidenceLinkCell ? "#0563c1" : "#0f172a")
      .text(value, x + 4, y + 6, {
        width: widths[index] - 8,
        align: index === 0 || index === 7 ? "left" : "center",
        link: isEvidenceLinkCell ? evidenceLink : undefined,
        underline: isEvidenceLinkCell,
      });

    x += widths[index];
  });

  doc.y = y + rowHeight;
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
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

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      {
        message: "Hanya admin yang dapat mengunduh DUPAK.",
      },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  const submission = await prisma.dupakSubmission.findUnique({
    where: {
      id,
    },
    include: {
      lecturer: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      evidences: {
        orderBy: {
          uploadedAt: "desc",
        },
        select: {
          id: true,
          rowCode: true,
          rowLabel: true,
          evidenceUrl: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          note: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json(
      {
        message: "Data DUPAK tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  const personalData = toObject<DupakPersonalData>(submission.personalData, {});
  const creditData = toObject<DupakCreditData>(submission.creditData, {});
  const subtotals = computeDupakSubtotals(creditData);

  const evidenceMap = new Map<string, EvidenceItem>();

  for (const evidence of submission.evidences) {
    if (!evidenceMap.has(evidence.rowCode)) {
      evidenceMap.set(evidence.rowCode, {
        id: evidence.id,
        rowCode: evidence.rowCode,
        rowLabel: evidence.rowLabel,
        evidenceUrl: evidence.evidenceUrl ?? null,
        fileName: evidence.fileName ?? null,
        fileSize: evidence.fileSize ?? null,
        mimeType: evidence.mimeType ?? null,
        note: evidence.note ?? null,
        uploadedAt: evidence.uploadedAt,
      });
    }
  }

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 32,
    info: {
      Title: `DUPAK ${submission.lecturer.fullName}`,
      Author: "JAFUNG SMART",
      Subject: "Export DUPAK Dosen",
    },
  });

  const pdfPromise = collectPdfBuffer(doc);

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor("#0f172a")
    .text("DAFTAR USUL PENETAPAN ANGKA KREDIT", {
      align: "center",
    });

  doc.font("Helvetica-Bold").fontSize(11).text("JABATAN AKADEMIK DOSEN", {
    align: "center",
  });

  doc.moveDown(0.5);

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#475569")
    .text(`Diekspor pada: ${formatDateTime(new Date())}`, {
      align: "right",
    });

  drawSectionTitle(doc, "Informasi DUPAK");

  drawKeyValue(doc, "Nomor", submission.nomor || "-");
  drawKeyValue(doc, "Instansi", submission.instansi || "-");
  drawKeyValue(
    doc,
    "Masa Penilaian",
    `${formatDate(submission.masaPenilaianStart)} s.d. ${formatDate(
      submission.masaPenilaianEnd,
    )}`,
  );
  drawKeyValue(doc, "Status", submission.status);
  drawKeyValue(doc, "Progress", `${submission.completionPercent}%`);
  drawKeyValue(
    doc,
    "Jumlah Bukti Dokumen",
    `${submission.evidences.length} file`,
  );

  drawSectionTitle(doc, "Keterangan Perorangan");

  drawKeyValue(doc, "Nama", submission.lecturer.fullName);
  drawKeyValue(doc, "Email", submission.lecturer.user.email);
  drawKeyValue(doc, "NIDN/NUPTK", submission.lecturer.nidnOrNuptk);
  drawKeyValue(doc, "Program Studi", submission.lecturer.studyProgram);
  drawKeyValue(doc, "Jabatan Akademik", submission.lecturer.academicPosition);

  for (const field of DUPAK_PERSONAL_FIELDS) {
    const value = personalData[field.key];

    if (value) {
      drawKeyValue(doc, field.label, String(value));
    }
  }

  drawSectionTitle(doc, "Unsur yang Dinilai");

  drawTableHeader(doc);

  for (const row of DUPAK_TEMPLATE_ROWS) {
    const value = creditData[row.code];
    const evidence = evidenceMap.get(row.code);

    if (row.type === "SECTION") {
      drawCreditRow({
        doc,
        label: row.label,
        level: row.level,
        isSection: true,
      });
      continue;
    }

    if (row.type === "TOTAL") {
      const subtotal = subtotals[row.code];

      drawCreditRow({
        doc,
        label: row.label,
        level: row.level,
        oldProposer: String(subtotal?.oldProposer || ""),
        newProposer: String(subtotal?.newProposer || ""),
        proposerTotal: String(subtotal?.proposerTotal || ""),
        oldAssessor: String(subtotal?.oldAssessor || ""),
        newAssessor: String(subtotal?.newAssessor || ""),
        assessorTotal: String(subtotal?.assessorTotal || ""),
        evidenceText: "Tidak perlu bukti",
        isTotal: true,
      });

      if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
        doc.addPage();
        drawTableHeader(doc);
      }

      continue;
    }

    drawCreditRow({
      doc,
      label: row.label,
      level: row.level,
      oldProposer: value?.oldProposer,
      newProposer: value?.newProposer,
      proposerTotal: String(getProposerTotal(value) || ""),
      oldAssessor: value?.oldAssessor,
      newAssessor: value?.newAssessor,
      assessorTotal: String(getAssessorTotal(value) || ""),
      evidenceText: evidence
        ? evidence.evidenceUrl
          ? `Buka Link Bukti (Google Drive)\n${formatDateTime(evidence.uploadedAt)}`
          : evidence.fileName
            ? `${evidence.fileName}\n${formatFileSize(
                evidence.fileSize,
              )} - ${formatDateTime(evidence.uploadedAt)}`
            : `Bukti tersimpan - ${formatDateTime(evidence.uploadedAt)}`
        : "Belum ada bukti",
      evidenceLink: evidence?.evidenceUrl || undefined,
      isTotal: false,
    });

    if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
      doc.addPage();
      drawTableHeader(doc);
    }
  }

  drawSectionTitle(doc, "Lampiran Pendukung DUPAK");

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#0f172a")
    .text(submission.supportNotes || "-", {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: "left",
    });

  if (submission.evidences.length > 0) {
    drawSectionTitle(doc, "Daftar Bukti Dokumen");

    submission.evidences.forEach((evidence, index) => {
      ensureSpace(doc, 40);

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#0f172a")
        .text(`${index + 1}. ${evidence.rowLabel}`);

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#475569")
        .text(
          `Kode: ${evidence.rowCode} | File: ${
            evidence.fileName
          } | Ukuran: ${formatFileSize(evidence.fileSize)} | Upload: ${formatDateTime(
            evidence.uploadedAt,
          )}`,
        );

      doc.moveDown(0.4);
    });
  }

  doc.end();

  const pdfBuffer = await pdfPromise;

  const fileName = safeFileName(
    `DUPAK-${submission.lecturer.fullName}-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`,
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
