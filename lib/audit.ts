/** @format */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { DupakStatus } from "@/lib/app-types";

type AuditInput = {
  request?: Request;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

function getRequestContext(request?: Request) {
  if (!request) return {};

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  return {
    ip,
    userAgent: request.headers.get("user-agent") || null,
  };
}

export async function logAudit({
  request,
  actorId = null,
  actorEmail = null,
  actorRole = null,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
  reason = null,
  metadata = {},
}: AuditInput) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId,
        action,
        entity: entity || null,
        entityId: entityId || null,
        metadata: JSON.parse(
          JSON.stringify({
            actorEmail,
            actorRole,
            oldValue: oldValue ?? null,
            newValue: newValue ?? null,
            reason,
            ...getRequestContext(request),
            ...metadata,
          }),
        ) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    // Audit tidak boleh menggagalkan operasi utama.
    console.error("AUDIT_LOG_ERROR:", error);
  }
}

type StatusChangeInput = {
  tx?: Prisma.TransactionClient;
  submissionId: string;
  fromStatus: DupakStatus | null;
  toStatus: DupakStatus;
  reason?: string | null;
  changedById?: string | null;
  changedByEmail?: string | null;
  changedByRole?: string | null;
};

export async function recordStatusHistory({
  tx,
  submissionId,
  fromStatus,
  toStatus,
  reason = null,
  changedById = null,
  changedByEmail = null,
  changedByRole = null,
}: StatusChangeInput) {
  const client = tx || prisma;

  await client.statusHistory.create({
    data: {
      submissionId,
      fromStatus,
      toStatus,
      reason,
      changedById,
      changedByEmail,
      changedByRole,
    },
  });
}
