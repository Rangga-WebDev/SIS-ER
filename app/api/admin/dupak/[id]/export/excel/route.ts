/** @format */

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeDupakSubtotals,
  DUPAK_TEMPLATE_ROWS,
  type DupakCreditData,
} from "@/lib/dupak-template";

export const runtime = "nodejs";

function getDupakIdFromPath(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const dupakIndex = segments.findIndex((segment) => segment === "dupak");

  if (dupakIndex < 0) return "";

  return segments[dupakIndex + 1] || "";
}

function safeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160);
}

function getObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getRowCreditData(creditData: unknown, rowCode: string) {
  const data = getObject(creditData);

  const direct = getObject(data[rowCode]);
  const rows = getObject(data.rows);
  const fromRows = getObject(rows[rowCode]);

  return Object.keys(direct).length > 0 ? direct : fromRows;
}

function getNumberFromRow(
  rowData: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = rowData[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return "";
  return value;
}

function findEvidence(
  evidences: {
    id: string;
    rowCode: string;
    rowLabel: string;
    evidenceUrl: string | null;
    note: string | null;
    uploadedAt: Date;
  }[],
  rowCode: string,
) {
  return evidences.find((item) => item.rowCode === rowCode) || null;
}

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser("ADMIN");

  if (error || !user) {
    return NextResponse.json(
      {
        message: "Tidak memiliki akses.",
      },
      { status: 401 },
    );
  }

  const dupakId = getDupakIdFromPath(request);

  if (!dupakId || dupakId === "dupak") {
    return NextResponse.json(
      {
        message: "ID DUPAK tidak valid.",
      },
      { status: 400 },
    );
  }

  const submission = await prisma.dupakSubmission.findUnique({
    where: {
      id: dupakId,
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

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "JAFUNG SMART";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("DUPAK", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  worksheet.columns = [
    { key: "kegiatan", width: 62 },
    { key: "pengusulLama", width: 15 },
    { key: "pengusulBaru", width: 15 },
    { key: "pengusulJumlah", width: 15 },
    { key: "penilaiLama", width: 15 },
    { key: "penilaiBaru", width: 15 },
    { key: "penilaiJumlah", width: 15 },
    { key: "bukti", width: 40 },
  ];

  worksheet.mergeCells("A1:H1");
  worksheet.getCell("A1").value = "TABEL ANGKA KREDIT DUPAK DOSEN";
  worksheet.getCell("A1").font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 14,
  };
  worksheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF111827" },
  };

  worksheet.mergeCells("A2:A3");
  worksheet.getCell("A2").value = "Unsur, Sub Unsur dan Butir Kegiatan";

  worksheet.mergeCells("B2:D2");
  worksheet.getCell("B2").value = "Instansi Pengusul";

  worksheet.mergeCells("E2:G2");
  worksheet.getCell("E2").value = "Tim Penilai";

  worksheet.mergeCells("H2:H3");
  worksheet.getCell("H2").value = "Bukti Dokumen";

  worksheet.getCell("B3").value = "Lama";
  worksheet.getCell("C3").value = "Baru";
  worksheet.getCell("D3").value = "Jumlah";
  worksheet.getCell("E3").value = "Lama";
  worksheet.getCell("F3").value = "Baru";
  worksheet.getCell("G3").value = "Jumlah";

  for (let rowNumber = 2; rowNumber <= 3; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    row.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF111827" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  }

  worksheet.addRow([]);

  const creditData = getObject(submission.creditData);
  const subtotals = computeDupakSubtotals(creditData as DupakCreditData);

  DUPAK_TEMPLATE_ROWS.forEach((templateRow) => {
    const rowData = getRowCreditData(creditData, templateRow.code);

    const subtotal =
      templateRow.type === "TOTAL" ? subtotals[templateRow.code] : null;

    const pengusulLama = subtotal
      ? subtotal.oldProposer || null
      : getNumberFromRow(rowData, [
          "oldProposer",
          "pengusulLama",
          "instansiPengusulLama",
          "lamaPengusul",
          "oldProposed",
        ]);

    const pengusulBaru = subtotal
      ? subtotal.newProposer || null
      : getNumberFromRow(rowData, [
          "newProposer",
          "pengusulBaru",
          "instansiPengusulBaru",
          "baruPengusul",
          "newProposed",
        ]);

    const pengusulJumlah = subtotal
      ? subtotal.proposerTotal || null
      : (getNumberFromRow(rowData, [
          "pengusulJumlah",
          "instansiPengusulJumlah",
          "jumlahPengusul",
          "totalProposed",
        ]) ??
        (pengusulLama !== null || pengusulBaru !== null
          ? Number(pengusulLama || 0) + Number(pengusulBaru || 0)
          : null));

    const penilaiLama = subtotal
      ? subtotal.oldAssessor || null
      : getNumberFromRow(rowData, [
          "oldAssessor",
          "penilaiLama",
          "timPenilaiLama",
          "lamaPenilai",
          "oldAssessed",
        ]);

    const penilaiBaru = subtotal
      ? subtotal.newAssessor || null
      : getNumberFromRow(rowData, [
          "newAssessor",
          "penilaiBaru",
          "timPenilaiBaru",
          "baruPenilai",
          "newAssessed",
        ]);

    const penilaiJumlah = subtotal
      ? subtotal.assessorTotal || null
      : (getNumberFromRow(rowData, [
          "penilaiJumlah",
          "timPenilaiJumlah",
          "jumlahPenilai",
          "totalAssessed",
        ]) ??
        (penilaiLama !== null || penilaiBaru !== null
          ? Number(penilaiLama || 0) + Number(penilaiBaru || 0)
          : null));

    const excelRow = worksheet.addRow([
      templateRow.label,
      formatNumber(pengusulLama),
      formatNumber(pengusulBaru),
      formatNumber(pengusulJumlah),
      formatNumber(penilaiLama),
      formatNumber(penilaiBaru),
      formatNumber(penilaiJumlah),
      "",
    ]);

    const currentRowNumber = excelRow.number;
    const evidenceCell = worksheet.getCell(`H${currentRowNumber}`);

    if (templateRow.type === "TOTAL") {
      evidenceCell.value = "Tidak perlu bukti";
      evidenceCell.font = {
        bold: true,
        color: { argb: "FF111827" },
      };
    } else {
      const evidence = findEvidence(submission.evidences, templateRow.code);

      if (evidence?.evidenceUrl) {
        evidenceCell.value = {
          text: "Buka Link Bukti",
          hyperlink: evidence.evidenceUrl,
        };
        evidenceCell.font = {
          color: { argb: "FF0563C1" },
          underline: true,
          bold: true,
        };
      } else {
        evidenceCell.value = "Belum ada bukti";
        evidenceCell.font = {
          italic: true,
          color: { argb: "FF94A3B8" },
        };
      }
    }

    excelRow.eachCell((cell) => {
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });

    if (templateRow.type === "SECTION") {
      excelRow.font = {
        bold: true,
        color: { argb: "FF075985" },
      };
      excelRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0F2FE" },
      };
    }

    if (templateRow.type === "TOTAL") {
      excelRow.font = {
        bold: true,
        color: { argb: "FF111827" },
      };
      excelRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
    }
  });

  worksheet.eachRow((row) => {
    row.height = 24;
  });

  worksheet.getRow(1).height = 32;
  worksheet.getRow(2).height = 28;
  worksheet.getRow(3).height = 24;

  const buffer = await workbook.xlsx.writeBuffer();

  const fileName = safeFileName(
    `DUPAK-${submission.lecturer.fullName}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
