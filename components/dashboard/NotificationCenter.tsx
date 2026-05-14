/** @format */

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type:
    | "DOCUMENT_UPLOADED"
    | "DOCUMENT_VERIFIED"
    | "DOCUMENT_REVISION"
    | "DOCUMENT_REJECTED"
    | "SYSTEM";
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getIcon(type: NotificationItem["type"]) {
  if (type === "DOCUMENT_UPLOADED") return <UploadCloud size={18} />;
  if (type === "DOCUMENT_VERIFIED") return <CheckCircle2 size={18} />;
  if (type === "DOCUMENT_REVISION") return <RotateCcw size={18} />;
  if (type === "DOCUMENT_REJECTED") return <XCircle size={18} />;
  return <FileText size={18} />;
}

function getTone(type: NotificationItem["type"]) {
  if (type === "DOCUMENT_UPLOADED") return "bg-sky-100 text-sky-700";
  if (type === "DOCUMENT_VERIFIED") return "bg-emerald-100 text-emerald-700";
  if (type === "DOCUMENT_REVISION") return "bg-amber-100 text-amber-700";
  if (type === "DOCUMENT_REJECTED") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

export default function NotificationCenter() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const json = await response.json();

      setNotifications(json.notifications || []);
      setUnreadCount(json.unreadCount || 0);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
    });

    setNotifications((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    );

    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", {
      method: "POST",
    });

    setNotifications((items) =>
      items.map((item) => ({
        ...item,
        isRead: true,
      })),
    );

    setUnreadCount(0);
  };

  useEffect(() => {
    fetchNotifications();

    const interval = window.setInterval(fetchNotifications, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          fetchNotifications();
        }}
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-[360px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-700">
                  Notifications
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Pusat Notifikasi
                </h3>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <ShieldCheck size={18} />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">
                {unreadCount} belum dibaca
              </p>

              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-black text-sky-700 hover:text-sky-900"
              >
                Tandai semua dibaca
              </button>
            </div>
          </div>

          <div className="max-h-[430px] overflow-y-auto p-2">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm font-bold text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Memuat notifikasi...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto mb-3 text-slate-300" size={34} />
                <p className="font-black text-slate-700">
                  Belum ada notifikasi
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Notifikasi akan muncul saat ada upload atau verifikasi
                  dokumen.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {notifications.map((item) => {
                  const content = (
                    <div
                      onClick={() => {
                        if (!item.isRead) markRead(item.id);
                        setOpen(false);
                      }}
                      className={`block rounded-2xl border p-3 transition hover:bg-slate-50 ${
                        item.isRead
                          ? "border-slate-100 bg-white"
                          : "border-sky-200 bg-sky-50/70"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${getTone(
                            item.type,
                          )}`}
                        >
                          {getIcon(item.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-black leading-5 text-slate-950">
                              {item.title}
                            </p>

                            {!item.isRead && (
                              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-600" />
                            )}
                          </div>

                          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
                            {item.message}
                          </p>

                          <p className="mt-2 flex items-center gap-1 text-xs font-black text-slate-400">
                            <Clock3 size={13} />
                            {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );

                  if (item.href) {
                    return (
                      <Link key={item.id} href={item.href}>
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="text-left"
                      onClick={() => {
                        if (!item.isRead) markRead(item.id);
                      }}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
