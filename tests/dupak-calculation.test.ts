/** @format */

import { describe, expect, it } from "vitest";
import {
  computeDupakSubtotals,
  getAssessorTotal,
  getNumberValue,
  getProposerTotal,
  type DupakCreditData,
} from "@/lib/dupak-template";
import { computeAssessmentCompleteness, toCreditData } from "@/lib/pak-access";

describe("DUPAK calculations", () => {
  it("normalizes comma decimal values and invalid input", () => {
    expect(getNumberValue("5,5")).toBe(5.5);
    expect(getNumberValue("invalid")).toBe(0);
    expect(getProposerTotal({ oldProposer: "5,5", newProposer: "4" })).toBe(
      9.5,
    );
    expect(getAssessorTotal({ oldAssessor: "2", newAssessor: "3,25" })).toBe(
      5.25,
    );
  });

  it("computes section subtotals and the grand total", () => {
    const data: DupakCreditData = {
      DOKTOR_S3: {
        oldProposer: "10",
        newProposer: "5",
        oldAssessor: "8",
        newAssessor: "4",
      },
      MAGISTER_S2: {
        oldProposer: "20",
        newProposer: "2,5",
        oldAssessor: "18",
        newAssessor: "2",
      },
      PERKULIAHAN_TUTORIAL: {
        newProposer: "7",
        newAssessor: "6",
      },
    };

    const totals = computeDupakSubtotals(data);

    expect(totals.JUMLAH_UNSUR_PENDIDIKAN).toMatchObject({
      proposerTotal: 37.5,
      assessorTotal: 32,
    });
    expect(totals.JUMLAH_UNSUR_PENGAJARAN).toMatchObject({
      proposerTotal: 7,
      assessorTotal: 6,
    });
    expect(totals.JUMLAH_UTAMA_DAN_PENUNJANG).toMatchObject({
      proposerTotal: 44.5,
      assessorTotal: 38,
    });
  });

  it("requires every proposed row to have an assessor score", () => {
    const incomplete: DupakCreditData = {
      DOKTOR_S3: { newProposer: "10" },
      MAGISTER_S2: { newProposer: "5", newAssessor: "5" },
    };

    const result = computeAssessmentCompleteness(incomplete);

    expect(result.proposedCount).toBe(2);
    expect(result.isComplete).toBe(false);
    expect(result.missingRows).toContain("Doktor (S3)");
    expect(result.totalScore).toBe(5);
  });

  it("does not trust arrays or primitives as credit data", () => {
    expect(toCreditData(null)).toEqual({});
    expect(toCreditData([])).toEqual({});
    expect(toCreditData("invalid")).toEqual({});
  });
});
