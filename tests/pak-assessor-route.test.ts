/** @format */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getActivePakAssignment: vi.fn(),
  findSubmission: vi.fn(),
  transaction: vi.fn(),
  updateSubmission: vi.fn(),
  upsertAssessment: vi.fn(),
  logAudit: vi.fn(),
  recordStatusHistory: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dupakSubmission: {
      findUnique: mocks.findSubmission,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/pak-access", () => ({
  getActivePakAssignment: mocks.getActivePakAssignment,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
  recordStatusHistory: mocks.recordStatusHistory,
}));

import { PATCH } from "@/app/api/pak/dupak/[id]/assessor/route";

const pakUser = {
  id: "pak-user-1",
  email: "pak@unismuh.ac.id",
  role: "TIM_PAK",
  status: "ACTIVE",
  lecturerProfile: null,
};

function request(body: unknown) {
  return new Request("http://localhost/api/pak/dupak/submission-1/assessor", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const context = {
  params: Promise.resolve({ id: "submission-1" }),
};

describe("PATCH Tim PAK assessor route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireUser.mockResolvedValue({ user: pakUser, error: null });
    mocks.getActivePakAssignment.mockResolvedValue({
      id: "assignment-1",
      assessment: null,
    });
    mocks.findSubmission.mockResolvedValue({
      id: "submission-1",
      status: "DITUGASKAN_KE_TIM_PAK",
      creditData: {
        DOKTOR_S3: {
          oldProposer: "10",
        },
      },
      lecturer: {
        id: "lecturer-1",
        fullName: "Dosen Uji",
      },
    });

    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          dupakSubmission: {
            update: mocks.updateSubmission,
          },
          pakAssessment: {
            upsert: mocks.upsertAssessment,
          },
        }),
    );
  });

  it("returns 403 when there is no authenticated Tim PAK", async () => {
    mocks.requireUser.mockResolvedValue({ user: null, error: "UNAUTHORIZED" });

    const response = await PATCH(request({}), context);

    expect(response.status).toBe(403);
    expect(mocks.getActivePakAssignment).not.toHaveBeenCalled();
  });

  it("returns 403 when the Tim PAK has no active assignment", async () => {
    mocks.getActivePakAssignment.mockResolvedValue(null);

    const response = await PATCH(request({}), context);
    const result = await response.json();

    expect(response.status).toBe(403);
    expect(result.message).toContain("tidak memiliki penugasan aktif");
    expect(mocks.findSubmission).not.toHaveBeenCalled();
  });

  it("returns 409 when the assigned assessment is already ratified", async () => {
    mocks.getActivePakAssignment.mockResolvedValue({
      id: "assignment-1",
      assessment: {
        isRatified: true,
      },
    });

    const response = await PATCH(request({}), context);

    expect(response.status).toBe(409);
    expect(mocks.findSubmission).not.toHaveBeenCalled();
  });

  it("rejects payloads without a valid DUPAK item row", async () => {
    const response = await PATCH(
      request({
        assessorData: {
          INVALID_ROW: {
            oldAssessor: "10",
          },
        },
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("saves a valid assessor draft atomically", async () => {
    const response = await PATCH(
      request({
        assessorData: {
          DOKTOR_S3: {
            oldAssessor: "8,5",
            newAssessor: "1,5",
          },
        },
      }),
      context,
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.message).toContain("tersimpan sebagai draft");
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.updateSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "submission-1" },
        data: expect.objectContaining({
          status: "SEDANG_DINILAI",
          creditData: expect.objectContaining({
            DOKTOR_S3: expect.objectContaining({
              oldProposer: "10",
              oldAssessor: "8,5",
              newAssessor: "1,5",
            }),
          }),
        }),
      }),
    );
    expect(mocks.upsertAssessment).toHaveBeenCalled();
    expect(mocks.recordStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStatus: "DITUGASKAN_KE_TIM_PAK",
        toStatus: "SEDANG_DINILAI",
      }),
    );
    expect(mocks.logAudit).toHaveBeenCalled();
  });
});
