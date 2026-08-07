/** @format */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  jwtVerify: vi.fn(),
  findUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mocks.cookieGet,
  })),
}));

vi.mock("jose", () => ({
  jwtVerify: mocks.jwtVerify,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUser,
    },
  },
}));

import { getCurrentUser, getSessionPayload, requireUser } from "@/lib/auth";

const activeUser = {
  id: "user-1",
  email: "dosen@unismuh.ac.id",
  role: "DOSEN",
  status: "ACTIVE",
  tokenVersion: 3,
  lecturerProfile: {
    id: "lecturer-1",
  },
};

describe("JWT session revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "unit-test-secret-with-sufficient-length";
    mocks.cookieGet.mockReturnValue({ value: "signed-token" });
    mocks.jwtVerify.mockResolvedValue({
      payload: {
        userId: "user-1",
        email: activeUser.email,
        role: "DOSEN",
        status: "ACTIVE",
        tokenVersion: 3,
      },
    });
    mocks.findUser.mockResolvedValue(activeUser);
  });

  it("returns null when the session cookie is absent", async () => {
    mocks.cookieGet.mockReturnValue(undefined);

    expect(await getSessionPayload()).toBeNull();
    expect(mocks.jwtVerify).not.toHaveBeenCalled();
  });

  it("rejects a token whose version was revoked", async () => {
    mocks.jwtVerify.mockResolvedValue({
      payload: {
        userId: "user-1",
        role: "DOSEN",
        tokenVersion: 2,
      },
    });

    expect(await getCurrentUser()).toBeNull();
  });

  it("rejects suspended users even with a valid token", async () => {
    mocks.findUser.mockResolvedValue({
      ...activeUser,
      status: "SUSPENDED",
    });

    expect(await getCurrentUser()).toBeNull();
  });

  it("returns the current user when status and tokenVersion match", async () => {
    const user = await getCurrentUser();

    expect(user).toEqual({
      id: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
      status: activeUser.status,
      lecturerProfile: activeUser.lecturerProfile,
    });
  });

  it("enforces role requirements server-side", async () => {
    expect(await requireUser("DOSEN")).toMatchObject({
      error: null,
      user: {
        id: "user-1",
      },
    });

    expect(await requireUser("ADMIN")).toEqual({
      user: null,
      error: "FORBIDDEN",
    });
  });
});
