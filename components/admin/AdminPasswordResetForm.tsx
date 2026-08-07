/** @format */

"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  X,
} from "lucide-react";

type Props = {
  userId: string;
  email: string;
  compact?: boolean;
};

export default function AdminPasswordResetForm({
  userId,
  email,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reason, setReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const reset = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            temporaryPassword,
            confirmPassword,
            reason,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: result.message || "Gagal mereset password.",
        });
        return;
      }

      setMessage({ type: "success", text: result.message });
      setTemporaryPassword("");
      setConfirmPassword("");
      setReason("");
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 font-black text-amber-800 transition hover:bg-amber-100 ${
          compact ? "px-3 py-2 text-xs" : "px-5 py-3 text-sm"
        }`}
      >
        <KeyRound size={compact ? 14 : 18} />
        Reset Password
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-amber-950">
            Tetapkan password sementara
          </p>
          <p className="mt-0.5 break-all text-xs font-bold text-amber-700">
            {email}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMessage(null);
          }}
          aria-label="Tutup form reset password"
          className="rounded-lg p-1.5 text-amber-700 transition hover:bg-amber-100"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        <label>
          <span className="mb-1 block text-xs font-black text-amber-900">
            Password sementara
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={temporaryPassword}
              onChange={(event) => setTemporaryPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 pr-10 text-sm font-bold text-slate-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              placeholder="8+ karakter, huruf besar/kecil, angka"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label>
          <span className="mb-1 block text-xs font-black text-amber-900">
            Konfirmasi password
          </span>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-black text-amber-900">
            Alasan reset
          </span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            placeholder="Contoh: Identitas dosen telah diverifikasi"
          />
        </label>
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-amber-800">
        Sampaikan password sementara melalui kontak resmi setelah identitas
        pemilik akun diverifikasi. Seluruh sesi lama akan dicabut.
      </p>

      {message && (
        <div
          className={`mt-3 flex gap-2 rounded-xl border p-3 text-xs font-bold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={reset}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-amber-800 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <KeyRound size={15} />
        )}
        Konfirmasi Reset
      </button>
    </div>
  );
}
