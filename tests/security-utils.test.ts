/** @format */

import { describe, expect, it } from "vitest";
import { evaluateDupakAccess } from "@/lib/access-policy";
import { sniffMimeType, validateFileContent } from "@/lib/file-validation";
import {
  getPageCount,
  getPagination,
  parsePositiveInt,
} from "@/lib/pagination";

describe("file signature validation", () => {
  it.each([
    ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0, 0, 0, 0, 0]],
    ["image/jpeg", [0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]],
    [
      "image/webp",
      [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
    ],
  ])("detects %s by magic bytes", (mime, bytes) => {
    expect(sniffMimeType(Uint8Array.from(bytes))).toBe(mime);
  });

  it("rejects spoofed or disallowed content", () => {
    const executable = Uint8Array.from([
      0x4d, 0x5a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(validateFileContent(executable, ["application/pdf"]).valid).toBe(
      false,
    );

    const pdf = Uint8Array.from([
      0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(validateFileContent(pdf, ["image/png"]).valid).toBe(false);
  });
});

describe("pagination input validation", () => {
  it("sanitizes invalid input and caps page size", () => {
    expect(parsePositiveInt("-1", 7)).toBe(7);
    expect(getPagination({ page: "-2", pageSize: "9999" })).toEqual({
      page: 1,
      pageSize: 100,
      skip: 0,
    });
    expect(getPagination({ page: "3", pageSize: "20" })).toEqual({
      page: 3,
      pageSize: 20,
      skip: 40,
    });
    expect(getPageCount(113, 20)).toBe(6);
  });
});

describe("DUPAK role policy", () => {
  const base = {
    userId: "user-a",
    lecturerUserId: "owner",
    status: "SUBMITTED",
  };

  it("gives Admin full access", () => {
    expect(evaluateDupakAccess({ ...base, role: "ADMIN" })).toBe(true);
  });

  it("only gives a lecturer access to their own submission", () => {
    expect(
      evaluateDupakAccess({
        ...base,
        role: "DOSEN",
        userId: "owner",
      }),
    ).toBe(true);
    expect(evaluateDupakAccess({ ...base, role: "DOSEN" })).toBe(false);
  });

  it("requires an active assignment for Tim PAK", () => {
    expect(
      evaluateDupakAccess({
        ...base,
        role: "TIM_PAK",
        hasActivePakAssignment: true,
      }),
    ).toBe(true);
    expect(evaluateDupakAccess({ ...base, role: "TIM_PAK" })).toBe(false);
  });

  it("only exposes submissions in the committee and senate windows", () => {
    expect(
      evaluateDupakAccess({
        ...base,
        role: "KOMITE_INTEGRITAS_AKADEMIK",
        status: "PEMERIKSAAN_INTEGRITAS",
      }),
    ).toBe(true);
    expect(
      evaluateDupakAccess({
        ...base,
        role: "KOMITE_INTEGRITAS_AKADEMIK",
        status: "SUBMITTED",
      }),
    ).toBe(false);
    expect(
      evaluateDupakAccess({
        ...base,
        role: "TIM_SENAT",
        status: "PEMERIKSAAN_SENAT",
      }),
    ).toBe(true);
    expect(
      evaluateDupakAccess({
        ...base,
        role: "TIM_SENAT",
        status: "PEMERIKSAAN_INTEGRITAS",
      }),
    ).toBe(false);
  });

  it("denies unknown and legacy operator roles", () => {
    expect(evaluateDupakAccess({ ...base, role: "OPERATOR" })).toBe(false);
    expect(evaluateDupakAccess({ ...base, role: "UNKNOWN" })).toBe(false);
  });
});
