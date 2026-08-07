/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCcw,
  Search,
  Send,
  UserRoundX,
} from "lucide-react";

export type PakMemberOption = {
  id: string;
  email: string;
  activeCount: number;
};

export type AssignmentItem = {
  id: string;
  pakUserId: string;
  pakEmail: string;
  status: string;
  deadline: string | null;
  assignmentNote: string | null;
  isRatified: boolean;
};

type Props = {
  dupakId: string;
  canAssign: boolean;
  pakMembers: PakMemberOption[];
  assignments: AssignmentItem[];
};

export default function PakAssignmentForm({
  dupakId,
  canAssign,
  pakMembers,
  assignments,
}: Props) {
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionTarget, setActionTarget] = useState<AssignmentItem | null>(null);
  const [actionMode, setActionMode] = useState<"CANCEL" | "REASSIGN" | null>(
    null,
  );
  const [actionReason, setActionReason] = useState("");
  const [reassignTo, setReassignTo] = useState("");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pakMembers;
    return pakMembers.filter((member) =>
      member.email.toLowerCase().includes(query),
    );
  }, [pakMembers, search]);

  const activeAssignments = assignments.filter(
    (item) => item.status === "ACTIVE",
  );

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const submitAssignment = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/dupak/${dupakId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pakUserIds: selected,
          deadline: deadline || undefined,
          assignmentNote: note || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: result.message || "Gagal mengirim penugasan.",
        });
        return;
      }

      setMessage({ type: "success", text: result.message });
      setSelected([]);
      setConfirming(false);
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  };

  const submitAction = async () => {
    if (!actionTarget || !actionMode) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/assignments/${actionTarget.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            actionMode === "CANCEL"
              ? { action: "CANCEL", reason: actionReason }
              : {
                  action: "REASSIGN",
                  newPakUserId: reassignTo,
                  reason: actionReason,
                },
          ),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: result.message || "Gagal mengubah penugasan.",
        });
        return;
      }

      setMessage({ type: "success", text: result.message });
      setActionTarget(null);
      setActionMode(null);
      setActionReason("");
      setReassignTo("");
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <ClipboardCheck size={21} />
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-950">
            Penugasan Tim PAK
          </h3>
          <p className="text-sm font-semibold text-slate-500">
            Pilih satu atau beberapa Tim PAK, tentukan batas waktu, lalu kirim
            penugasan.
          </p>
        </div>
      </div>

      {assignments.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
            Riwayat & Penugasan Aktif
          </p>

          <div className="mt-3 grid gap-2">
            {assignments.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-black text-slate-900">{item.pakEmail}</p>
                  <p className="text-xs font-bold text-slate-500">
                    Status: {item.status}
                    {item.deadline
                      ? ` • Batas waktu: ${new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "long",
                        }).format(new Date(item.deadline))}`
                      : ""}
                    {item.isRatified ? " • Penilaian disahkan" : ""}
                  </p>
                </div>

                {item.status === "ACTIVE" && !item.isRatified && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActionTarget(item);
                        setActionMode("REASSIGN");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      <RefreshCcw size={14} />
                      Alihkan
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActionTarget(item);
                        setActionMode("CANCEL");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                    >
                      <UserRoundX size={14} />
                      Batalkan
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {actionTarget && actionMode && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-black text-amber-900">
            {actionMode === "CANCEL"
              ? `Batalkan penugasan ${actionTarget.pakEmail}?`
              : `Alihkan penugasan dari ${actionTarget.pakEmail} ke:`}
          </p>

          {actionMode === "REASSIGN" && (
            <select
              value={reassignTo}
              onChange={(event) => setReassignTo(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none"
            >
              <option value="">Pilih Tim PAK pengganti...</option>
              {pakMembers
                .filter((member) => member.id !== actionTarget.pakUserId)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.email} ({member.activeCount} tugas aktif)
                  </option>
                ))}
            </select>
          )}

          <textarea
            value={actionReason}
            onChange={(event) => setActionReason(event.target.value)}
            className="mt-3 min-h-20 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
            placeholder="Alasan perubahan penugasan (wajib)..."
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={submitAction}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Konfirmasi
            </button>

            <button
              type="button"
              onClick={() => {
                setActionTarget(null);
                setActionMode(null);
                setActionReason("");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {canAssign ? (
        <>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari Tim PAK berdasarkan email..."
              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {filteredMembers.map((member) => {
              const isSelected = selected.includes(member.id);
              const alreadyActive = activeAssignments.some(
                (item) => item.pakUserId === member.id,
              );

              return (
                <button
                  key={member.id}
                  type="button"
                  disabled={alreadyActive}
                  onClick={() => toggle(member.id)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-black">{member.email}</p>
                    <p className="text-xs font-bold opacity-70">
                      {member.activeCount} tugas aktif
                      {alreadyActive ? " • Sudah ditugaskan" : ""}
                    </p>
                  </div>

                  {isSelected && <CheckCircle2 size={19} />}
                </button>
              );
            })}

            {filteredMembers.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-400">
                Tidak ada Tim PAK yang cocok dengan pencarian.
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                Batas Waktu Penilaian
              </span>
              <input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                Catatan Penugasan
              </span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                placeholder="Catatan untuk Tim PAK..."
              />
            </label>
          </div>

          {confirming ? (
            <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <p className="font-black text-indigo-900">
                Kirim penugasan ke {selected.length} Tim PAK?
              </p>
              <p className="mt-1 text-sm font-semibold text-indigo-700">
                Pengajuan hanya akan terlihat oleh Tim PAK yang dipilih.
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={submitAssignment}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-indigo-800 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Ya, Kirim Penugasan
                </button>

                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => setConfirming(true)}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-6 py-3 text-sm font-black text-white transition hover:bg-indigo-800 disabled:opacity-50"
            >
              <Send size={18} />
              Kirim Penugasan ({selected.length} dipilih)
            </button>
          )}
        </>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">
          Penugasan baru hanya dapat dikirim setelah pengajuan lolos verifikasi
          Admin dan belum melewati tahap penilaian.
        </p>
      )}

      {message && (
        <div
          className={`mt-4 flex gap-3 rounded-2xl border p-4 text-sm font-semibold leading-6 ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {message.text}
        </div>
      )}
    </section>
  );
}
