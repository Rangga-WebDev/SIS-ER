/** @format */

import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
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
  fileName: string;
  fileSize: number;
  mimeType: string;
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

function styleTitleRow(row: ExcelJS.Row) {
  row.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };

  row.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };

  row.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
}

function styleBodyRow(row: ExcelJS.Row) {
  row.alignment = {
    vertical: "middle",
    wrapText: true,
  };

  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });
}

function styleSectionRow(row: ExcelJS.Row) {
  row.font = {
    bold: true,
    color: { argb: "FF0C4A6E" },
  };

  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2FE" },
  };

  row.alignment = {
    vertical: "middle",
    wrapText: true,
  };

  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFBAE6FD" } },
      left: { style: "thin", color: { argb: "FFBAE6FD" } },
      bottom: { style: "thin", color: { argb: "FFBAE6FD" } },
      right: { style: "thin", color: { argb: "FFBAE6FD" } },
    };
  });
}

function styleTotalRow(row: ExcelJS.Row) {
  row.font = {
    bold: true,
    color: { argb: "FF0F172A" },
  };

  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  row.alignment = {
    vertical: "middle",
    wrapText: true,
  };

  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
}

function getBaseUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (envUrl) return envUrl.replace(/\/$/, "");

  const url = new URL(request.url);
  return url.origin;
}

export async function GET(
  request: Request,
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
          fileName: true,
          fileSize: true,
          mimeType: true,
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
  const baseUrl = getBaseUrl(request);

  const evidenceMap = new Map<string, EvidenceItem>();

  for (const evidence of submission.evidences) {
    if (!evidenceMap.has(evidence.rowCode)) {
      evidenceMap.set(evidence.rowCode, evidence);
    }
  }

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "JAFUNG SMART";
  workbook.created = new Date();
  workbook.modified = new Date();

  const identitySheet = workbook.addWorksheet("Identitas DUPAK", {
    views: [{ showGridLines: false }],
  });

  identitySheet.columns = [
    { key: "label", width: 38 },
    { key: "value", width: 78 },
  ];

  identitySheet.mergeCells("A1:B1");
  identitySheet.getCell("A1").value =
    "DAFTAR USUL PENETAPAN ANGKA KREDIT JABATAN AKADEMIK DOSEN";
  identitySheet.getCell("A1").font = {
    bold: true,
    size: 14,
    color: { argb: "FFFFFFFF" },
  };
  identitySheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  identitySheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };
  identitySheet.getRow(1).height = 28;

  const identityRows: [string, string][] = [
    ["Nomor", submission.nomor || "-"],
    ["Instansi", submission.instansi || "-"],
    [
      "Masa Penilaian",
      `${formatDate(submission.masaPenilaianStart)} s.d. ${formatDate(
        submission.masaPenilaianEnd,
      )}`,
    ],
    ["Status", submission.status],
    ["Progress", `${submission.completionPercent}%`],
    ["Jumlah Bukti Dokumen", `${submission.evidences.length} file`],
    ["Nama Dosen", submission.lecturer.fullName],
    ["Email", submission.lecturer.user.email],
    ["NIDN/NUPTK", submission.lecturer.nidnOrNuptk],
    ["Program Studi", submission.lecturer.studyProgram],
    ["Jabatan Akademik", submission.lecturer.academicPosition],
    ["Tanggal Export", formatDateTime(new Date())],
  ];

  for (const [label, value] of identityRows) {
    const row = identitySheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    styleBodyRow(row);
  }

  identitySheet.addRow([]);
  const personalTitle = identitySheet.addRow(["Keterangan Perorangan", ""]);
  personalTitle.getCell(1).font = { bold: true };
  personalTitle.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2FE" },
  };

  for (const field of DUPAK_PERSONAL_FIELDS) {
    const row = identitySheet.addRow([
      field.label,
      String(personalData[field.key] || "-"),
    ]);

    row.getCell(1).font = { bold: true };
    styleBodyRow(row);
  }

  const dupakSheet = workbook.addWorksheet("Tabel DUPAK", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  dupakSheet.columns = [
    { key: "unsur", width: 60 },
    { key: "instansiLama", width: 14 },
    { key: "instansiBaru", width: 14 },
    { key: "instansiJumlah", width: 16 },
    { key: "timLama", width: 14 },
    { key: "timBaru", width: 14 },
    { key: "timJumlah", width: 16 },
    { key: "bukti", width: 42 },
  ];

  dupakSheet.mergeCells("A1:H1");
  dupakSheet.getCell("A1").value = "TABEL ANGKA KREDIT DUPAK DOSEN";
  dupakSheet.getCell("A1").font = {
    bold: true,
    size: 14,
    color: { argb: "FFFFFFFF" },
  };
  dupakSheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  dupakSheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };
  dupakSheet.getRow(1).height = 28;

  const header1 = dupakSheet.addRow([
    "Unsur, Sub Unsur dan Butir Kegiatan",
    "Instansi Pengusul",
    "",
    "",
    "Tim Penilai",
    "",
    "",
    "Bukti Dokumen",
  ]);
  styleTitleRow(header1);

  const header2 = dupakSheet.addRow([
    "",
    "Lama",
    "Baru",
    "Jumlah",
    "Lama",
    "Baru",
    "Jumlah",
    "",
  ]);
  styleHeaderRow(header2);

  dupakSheet.mergeCells("A2:A3");
  dupakSheet.mergeCells("B2:D2");
  dupakSheet.mergeCells("E2:G2");
  dupakSheet.mergeCells("H2:H3");

  for (const rowTemplate of DUPAK_TEMPLATE_ROWS) {
    const value = creditData[rowTemplate.code];
    const evidence = evidenceMap.get(rowTemplate.code);

    if (rowTemplate.type === "SECTION") {
      const row = dupakSheet.addRow([
        rowTemplate.label,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      dupakSheet.mergeCells(`A${row.number}:H${row.number}`);
      styleSectionRow(row);
      continue;
    }

    const row = dupakSheet.addRow([
      `${"   ".repeat(rowTemplate.level)}${rowTemplate.label}`,
      value?.oldProposer || "",
      value?.newProposer || "",
      getProposerTotal(value) || "",
      value?.oldAssessor || "",
      value?.newAssessor || "",
      getAssessorTotal(value) || "",
      "",
    ]);

    if (rowTemplate.type === "TOTAL") {
      row.getCell(8).value = "Tidak perlu bukti";
      styleTotalRow(row);
      continue;
    }

    if (evidence) {
      row.getCell(8).value = {
        text: evidence.fileName,
        hyperlink: `${baseUrl}/api/files/dupak-evidence/${evidence.id}`,
      };
      row.getCell(8).font = {
        color: { argb: "FF0369A1" },
        underline: true,
        bold: true,
      };
      row.getCell(8).note =
        `File: ${evidence.fileName}\nUkuran: ${formatFileSize(
          evidence.fileSize,
        )}\nUpload: ${formatDateTime(evidence.uploadedAt)}`;
    } else {
      row.getCell(8).value = "Belum ada bukti";
      row.getCell(8).font = {
        color: { argb: "FF94A3B8" },
        italic: true,
      };
    }

    styleBodyRow(row);
  }

  dupakSheet.addRow([]);
  const supportTitle = dupakSheet.addRow(["Lampiran Pendukung DUPAK"]);
  supportTitle.getCell(1).font = { bold: true };
  supportTitle.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2FE" },
  };

  const supportRow = dupakSheet.addRow([submission.supportNotes || "-"]);
  dupakSheet.mergeCells(`A${supportRow.number}:H${supportRow.number}`);
  supportRow.alignment = {
    wrapText: true,
    vertical: "top",
  };

  const evidenceSheet = workbook.addWorksheet("Bukti Dokumen", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  evidenceSheet.columns = [
    { key: "no", width: 8 },
    { key: "rowCode", width: 32 },
    { key: "rowLabel", width: 55 },
    { key: "fileName", width: 42 },
    { key: "fileSize", width: 16 },
    { key: "mimeType", width: 24 },
    { key: "uploadedAt", width: 24 },
    { key: "preview", width: 45 },
  ];

  const evidenceHeader = evidenceSheet.addRow([
    "No",
    "Kode Baris",
    "Butir Kegiatan",
    "Nama File",
    "Ukuran",
    "Tipe File",
    "Waktu Upload",
    "Link Preview",
  ]);

  styleHeaderRow(evidenceHeader);

  if (submission.evidences.length === 0) {
    const emptyRow = evidenceSheet.addRow([
      1,
      "-",
      "Belum ada bukti dokumen",
      "-",
      "-",
      "-",
      "-",
      "-",
    ]);
    styleBodyRow(emptyRow);
  } else {
    submission.evidences.forEach((evidence, index) => {
      const row = evidenceSheet.addRow([
        index + 1,
        evidence.rowCode,
        evidence.rowLabel,
        evidence.fileName,
        formatFileSize(evidence.fileSize),
        evidence.mimeType,
        formatDateTime(evidence.uploadedAt),
        "",
      ]);

      row.getCell(8).value = {
        text: "Buka / Preview Bukti",
        hyperlink: `${baseUrl}/api/files/dupak-evidence/${evidence.id}`,
      };

      row.getCell(8).font = {
        color: { argb: "FF0369A1" },
        underline: true,
        bold: true,
      };

      styleBodyRow(row);
    });
  }

  [identitySheet, dupakSheet, evidenceSheet].forEach((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = {
          ...cell.alignment,
          vertical: "middle",
          wrapText: true,
        };
      });
    });
  });

  const rawBuffer = await workbook.xlsx.writeBuffer();
  const excelBuffer = Buffer.isBuffer(rawBuffer)
    ? rawBuffer
    : Buffer.from(rawBuffer as ArrayBuffer);

  const fileName = safeFileName(
    `DUPAK-${submission.lecturer.fullName}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`,
  );

  return new NextResponse(new Uint8Array(excelBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
