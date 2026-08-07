/** @format */

import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/lib/app-types";
import type { Prisma } from "@prisma/client";

type NotificationMetadata = Prisma.InputJsonValue;

type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  href?: string | null;
  metadata?: NotificationMetadata;
};

type NotifyAdminsInput = {
  title: string;
  message: string;
  type?: NotificationType;
  href?: string | null;
  metadata?: NotificationMetadata;
};

export async function createNotification({
  userId,
  title,
  message,
  type = "SYSTEM",
  href = null,
  metadata = {},
}: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      href,
      metadata,
    },
  });
}

export async function notifyAdmins({
  title,
  message,
  type = "SYSTEM",
  href = null,
  metadata = {},
}: NotifyAdminsInput) {
  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title,
      message,
      type,
      href,
      metadata,
    })),
  });
}

type NotifyRoleInput = NotifyAdminsInput & {
  role: "TIM_PAK" | "KOMITE_INTEGRITAS_AKADEMIK" | "TIM_SENAT";
};

export async function notifyRole({
  role,
  title,
  message,
  type = "SYSTEM",
  href = null,
  metadata = {},
}: NotifyRoleInput) {
  const users = await prisma.user.findMany({
    where: {
      role,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      title,
      message,
      type,
      href,
      metadata,
    })),
  });
}
