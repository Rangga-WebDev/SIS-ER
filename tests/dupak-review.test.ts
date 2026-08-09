/** @format */

// Test logika murni penilaian per item/rincian DUPAK (lib/dupak-review.ts)
// dan profil kontekstual rincian (lib/dupak-template.ts).

import { describe, expect, it } from "vitest";
import {
  aggregateAssessedCredits,
  buildReviewUnits,
  computeReviewProgress,
  computeReviewValidation,
  getReviewStatusMeta,
  isGoogleDriveUrl,
  reviewUnitKey,
  type DupakItemReviewData,
} from "@/lib/dupak-review";
import {
  getRowDetailProfile,
  getRowSubCategorySuggestions,
  sumEntryCredits,
} from "@/lib/dupak-template";

const entry = (
  id: string,
  rowCode: string,
  credit: string | null = "10",
  orderIndex = 0,
) => ({
  id,
  rowCode,
  title: `Entri ${id}`,
  credit,
  orderIndex,
});

describe("buildReviewUnits", () => {
  it("membuat satu unit wajib per rincian pada baris yang punya entri", () => {
    const units = buildReviewUnits({
      creditData: {},
      entries: [
        entry("e1", "JURNAL_INTERNASIONAL", "20", 1),
        entry("e2", "JURNAL_INTERNASIONAL", "15", 0),
      ],
    });

    const rowUnits = units.filter(
      (unit) => unit.rowCode === "JURNAL_INTERNASIONAL",
    );

    expect(rowUnits).toHaveLength(2);
    // Terurut sesuai orderIndex.
    expect(rowUnits[0].entryKey).toBe("e2");
    expect(rowUnits[1].entryKey).toBe("e1");
    expect(rowUnits.every((unit) => unit.required)).toBe(true);
  });

  it("menandai unit level baris sebagai wajib jika ada AK pengusul", () => {
    const units = buildReviewUnits({
      creditData: {
        BUKU_AJAR: { oldProposer: "", newProposer: "5" },
      },
      entries: [],
    });

    const bukuAjar = units.find((unit) => unit.rowCode === "BUKU_AJAR");

    expect(bukuAjar).toEqual({
      rowCode: "BUKU_AJAR",
      entryKey: "",
      required: true,
    });
  });

  it("menandai unit level baris sebagai wajib jika ada bukti dokumen", () => {
    const units = buildReviewUnits({
      creditData: {},
      entries: [],
      evidences: [
        { rowCode: "ORASI_ILMIAH", evidenceUrl: "https://drive.google.com/x" },
        { rowCode: "BUKU_AJAR", evidenceUrl: null },
      ],
    });

    expect(
      units.find((unit) => unit.rowCode === "ORASI_ILMIAH")?.required,
    ).toBe(true);
    expect(units.find((unit) => unit.rowCode === "BUKU_AJAR")?.required).toBe(
      false,
    );
  });

  it("tetap menampilkan seluruh baris ITEM sebagai unit opsional saat kosong", () => {
    const units = buildReviewUnits({ creditData: {}, entries: [] });

    expect(units.length).toBeGreaterThan(50);
    expect(units.every((unit) => unit.entryKey === "")).toBe(true);
    expect(units.every((unit) => unit.required === false)).toBe(true);
  });
});

describe("computeReviewProgress", () => {
  it("menghitung status per unit dan mengabaikan DIREVISI_DOSEN sebagai dinilai", () => {
    const units = buildReviewUnits({
      creditData: {},
      entries: [
        entry("e1", "JURNAL_INTERNASIONAL"),
        entry("e2", "JURNAL_INTERNASIONAL"),
        entry("e3", "BUKU_AJAR"),
      ],
    });

    const reviews: DupakItemReviewData[] = [
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e1",
        status: "SESUAI",
        assessedCredit: "20",
      },
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e2",
        status: "PERLU_REVISI",
        comment: "Link tidak dapat dibuka.",
      },
      {
        rowCode: "BUKU_AJAR",
        entryKey: "e3",
        status: "DIREVISI_DOSEN",
      },
    ];

    const progress = computeReviewProgress(units, reviews);

    expect(progress.total).toBe(3);
    expect(progress.reviewed).toBe(3);
    expect(progress.sesuai).toBe(1);
    expect(progress.perluRevisi).toBe(1);
    expect(progress.direvisiDosen).toBe(1);
  });
});

describe("computeReviewValidation", () => {
  const units = buildReviewUnits({
    creditData: {},
    entries: [
      entry("e1", "JURNAL_INTERNASIONAL"),
      entry("e2", "JURNAL_INTERNASIONAL"),
    ],
  });

  it("menolak DITERIMA saat masih ada unit belum dinilai", () => {
    const validation = computeReviewValidation(units, [
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e1",
        status: "SESUAI",
        assessedCredit: "20",
      },
    ]);

    expect(validation.okForAccept).toBe(false);
    expect(validation.issues).toHaveLength(1);
    expect(validation.issues[0].message).toBe("Belum dinilai.");
  });

  it("menolak SESUAI tanpa angka kredit dinilai", () => {
    const validation = computeReviewValidation(units, [
      { rowCode: "JURNAL_INTERNASIONAL", entryKey: "e1", status: "SESUAI" },
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e2",
        status: "SESUAI",
        assessedCredit: "10",
      },
    ]);

    expect(validation.okForAccept).toBe(false);
    expect(validation.issues[0].message).toContain("angka kredit");
  });

  it("menolak PERLU_REVISI tanpa komentar dan memblokir DITERIMA", () => {
    const validation = computeReviewValidation(units, [
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e1",
        status: "PERLU_REVISI",
      },
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e2",
        status: "SESUAI",
        assessedCredit: "10",
      },
    ]);

    expect(validation.okForAccept).toBe(false);
    expect(validation.okForRevision).toBe(false);
    expect(
      validation.issues.some((issue) =>
        issue.message.includes("Komentar untuk dosen wajib diisi."),
      ),
    ).toBe(true);
  });

  it("mengizinkan PERLU_REVISI saat item bermasalah sudah berkomentar", () => {
    const validation = computeReviewValidation(units, [
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e1",
        status: "PERLU_REVISI",
        comment: "Bukti tidak sesuai judul.",
      },
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e2",
        status: "SESUAI",
        assessedCredit: "10",
      },
    ]);

    expect(validation.okForRevision).toBe(true);
    expect(validation.okForAccept).toBe(false);
  });

  it("memblokir DITERIMA saat masih ada DIREVISI_DOSEN", () => {
    const validation = computeReviewValidation(units, [
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e1",
        status: "DIREVISI_DOSEN",
      },
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e2",
        status: "SESUAI",
        assessedCredit: "10",
      },
    ]);

    expect(validation.okForAccept).toBe(false);
    expect(validation.outstanding[0].message).toContain("direvisi dosen");
  });

  it("meloloskan DITERIMA saat semua unit SESUAI lengkap dengan AK", () => {
    const validation = computeReviewValidation(units, [
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e1",
        status: "SESUAI",
        assessedCredit: "20",
      },
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e2",
        status: "SESUAI",
        assessedCredit: "0",
      },
    ]);

    expect(validation.okForAccept).toBe(true);
    expect(validation.issues).toHaveLength(0);
    expect(validation.outstanding).toHaveLength(0);
  });

  it("unit opsional kosong tidak menghalangi, tapi flagged opsional memblokir", () => {
    const baseReviews: DupakItemReviewData[] = [
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e1",
        status: "SESUAI",
        assessedCredit: "20",
      },
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e2",
        status: "SESUAI",
        assessedCredit: "10",
      },
    ];

    // Baris kosong (opsional) dibiarkan tanpa status → tetap lolos.
    expect(computeReviewValidation(units, baseReviews).okForAccept).toBe(true);

    // Baris kosong diberi status Tidak Sesuai → memblokir DITERIMA.
    const withOptionalFlag = computeReviewValidation(units, [
      ...baseReviews,
      {
        rowCode: "BUKU_AJAR",
        entryKey: "",
        status: "TIDAK_SESUAI",
        comment: "Seharusnya tidak kosong.",
      },
    ]);

    expect(withOptionalFlag.okForAccept).toBe(false);
    expect(withOptionalFlag.okForRevision).toBe(true);
  });
});

describe("aggregateAssessedCredits", () => {
  it("menjumlahkan AK dinilai per baris (dukungan koma desimal)", () => {
    const units = buildReviewUnits({
      creditData: { BUKU_AJAR: { newProposer: "5" } },
      entries: [
        entry("e1", "JURNAL_INTERNASIONAL"),
        entry("e2", "JURNAL_INTERNASIONAL"),
      ],
    });

    const totals = aggregateAssessedCredits(units, [
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e1",
        assessedCredit: "12,5",
      },
      {
        rowCode: "JURNAL_INTERNASIONAL",
        entryKey: "e2",
        assessedCredit: "7.25",
      },
      { rowCode: "BUKU_AJAR", entryKey: "", assessedCredit: "3" },
    ]);

    expect(totals.JURNAL_INTERNASIONAL).toBe("19.75");
    expect(totals.BUKU_AJAR).toBe("3");
  });

  it("mengabaikan review tanpa angka kredit", () => {
    const units = buildReviewUnits({
      creditData: { BUKU_AJAR: { newProposer: "5" } },
      entries: [],
    });

    const totals = aggregateAssessedCredits(units, [
      { rowCode: "BUKU_AJAR", entryKey: "", status: "PERLU_REVISI" },
    ]);

    expect(totals.BUKU_AJAR).toBeUndefined();
  });
});

describe("helper status dan URL", () => {
  it("reviewUnitKey menggabungkan rowCode dan entryKey", () => {
    expect(reviewUnitKey("BUKU_AJAR", "")).toBe("BUKU_AJAR::");
    expect(reviewUnitKey("BUKU_AJAR", "e1")).toBe("BUKU_AJAR::e1");
  });

  it("getReviewStatusMeta memberi label Belum Dinilai untuk status kosong", () => {
    expect(getReviewStatusMeta(null).label).toBe("Belum Dinilai");
    expect(getReviewStatusMeta("SESUAI").icon).toBe("✓");
    expect(getReviewStatusMeta("TIDAK_SESUAI").icon).toBe("×");
  });

  it("isGoogleDriveUrl hanya menerima domain Google Drive/Docs", () => {
    expect(isGoogleDriveUrl("https://drive.google.com/file/d/abc")).toBe(true);
    expect(isGoogleDriveUrl("https://docs.google.com/document/d/abc")).toBe(
      true,
    );
    expect(isGoogleDriveUrl("https://example.com/file.pdf")).toBe(false);
    expect(isGoogleDriveUrl("bukan-url")).toBe(false);
  });
});

describe("profil kontekstual rincian", () => {
  it("memetakan baris bimbingan ke profil BIMBINGAN", () => {
    expect(getRowDetailProfile("PEMBIMBING_UTAMA_SKRIPSI").key).toBe(
      "BIMBINGAN",
    );
    expect(getRowDetailProfile("KETUA_PENGUJI").key).toBe("BIMBINGAN");
  });

  it("memetakan baris penelitian ke profil PENELITIAN", () => {
    expect(getRowDetailProfile("JURNAL_INTERNASIONAL").key).toBe("PENELITIAN");
    expect(getRowDetailProfile("MONOGRAF").key).toBe("PENELITIAN");
  });

  it("memetakan perkuliahan ke profil PENGAJARAN dan fallback UMUM", () => {
    expect(getRowDetailProfile("PERKULIAHAN_TUTORIAL").key).toBe("PENGAJARAN");
    expect(getRowDetailProfile("KODE_TIDAK_ADA").key).toBe("UMUM");
  });

  it("memberi saran kategori SINTA untuk jurnal nasional terakreditasi", () => {
    const suggestions = getRowSubCategorySuggestions(
      "JURNAL_NASIONAL_TERAKREDITASI",
    );

    expect(suggestions).toContain("SINTA 1");
    expect(suggestions).toContain("SINTA 6");
    expect(getRowSubCategorySuggestions("BARIS_TANPA_SARAN")).toEqual([]);
  });

  it("sumEntryCredits menjumlahkan kredit dengan pembulatan 2 desimal", () => {
    expect(
      sumEntryCredits([{ credit: "0.1" }, { credit: "0.2" }, { credit: null }]),
    ).toBe(0.3);
  });
});
