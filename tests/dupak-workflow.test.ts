/** @format */

import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  getPipelineIndex,
  isLecturerEditable,
  normalizeStatus,
} from "@/lib/dupak-workflow";

describe("DUPAK workflow", () => {
  it("allows the happy-path transitions", () => {
    expect(canTransition("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransition("SUBMITTED", "LOLOS_VERIFIKASI_ADMIN")).toBe(true);
    expect(
      canTransition("LOLOS_VERIFIKASI_ADMIN", "DITUGASKAN_KE_TIM_PAK"),
    ).toBe(true);
    expect(canTransition("DITERIMA_TIM_PAK", "PENILAIAN_DISAHKAN")).toBe(true);
    expect(canTransition("PEMERIKSAAN_SENAT", "SELESAI")).toBe(true);
  });

  it("prevents skipped or reversed workflow stages", () => {
    expect(canTransition("DRAFT", "DITUGASKAN_KE_TIM_PAK")).toBe(false);
    expect(canTransition("SUBMITTED", "PENILAIAN_DISAHKAN")).toBe(false);
    expect(canTransition("SELESAI", "DRAFT")).toBe(false);
    expect(assertTransition("DRAFT", "SELESAI")).toMatchObject({ ok: false });
  });

  it("keeps legacy statuses compatible", () => {
    expect(normalizeStatus("REVISION")).toBe("PERLU_REVISI_TIM_PAK");
    expect(normalizeStatus("APPROVED")).toBe("DITERIMA_TIM_PAK");
    expect(normalizeStatus("REJECTED")).toBe("DITOLAK_ADMIN");
  });

  it("only lets lecturers edit returned or draft submissions", () => {
    expect(isLecturerEditable("DRAFT")).toBe(true);
    expect(isLecturerEditable("PERLU_PERBAIKAN_ADMIN")).toBe(true);
    expect(isLecturerEditable("PERLU_REVISI_TIM_PAK")).toBe(true);
    expect(isLecturerEditable("SEDANG_DINILAI")).toBe(false);
    expect(isLecturerEditable("PENILAIAN_DISAHKAN")).toBe(false);
  });

  it("maps intermediate statuses to their parent timeline stage", () => {
    expect(getPipelineIndex("PERLU_PERBAIKAN_ADMIN")).toBe(1);
    expect(getPipelineIndex("PERLU_REVISI_TIM_PAK")).toBe(4);
    expect(getPipelineIndex("BERITA_ACARA_DRAFT")).toBe(6);
  });
});
