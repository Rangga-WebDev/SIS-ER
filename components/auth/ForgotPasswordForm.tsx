/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function ForgotPasswordForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [nidnOrNuptk, setNidnOrNuptk] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          nidnOrNuptk,
          newPassword,
          confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Gagal mereset password.");
        return;
      }

      setSuccess(result.message || "Password berhasil direset.");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.3rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200 md:p-12">
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="mb-8 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-500 transition hover:-translate-y-1 hover:bg-slate-50 hover:text-slate-900"
      >
        <ArrowLeft size={18} />
        Kembali ke Login
      </button>

      <div className="flex items-center gap-4">
        <Image
          src="/logo-unismuh.svg"
          alt="Logo Kampus"
          width={56}
          height={56}
          className="rounded-full"
        />

        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
            Lupa Password
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            Reset Password Akun
          </h1>
        </div>
      </div>

      <p className="mt-5 leading-7 text-slate-600">
        Verifikasi identitas Anda menggunakan email dan NIDN/NUPTK yang
        terdaftar, lalu buat password baru. Khusus akun admin, silakan hubungi
        pengelola sistem.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block font-black text-slate-800">Email</label>
          <div className="relative">
            <Mail
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@kampus.ac.id"
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block font-black text-slate-800">
            NIDN/NUPTK
          </label>
          <div className="relative">
            <IdCard
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={nidnOrNuptk}
              onChange={(event) => setNidnOrNuptk(event.target.value)}
              placeholder="NIDN atau NUPTK terdaftar"
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block font-black text-slate-800">
            Password Baru
          </label>
          <div className="relative">
            <LockKeyhole
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Minimal 8 karakter, ada huruf besar, kecil, dan angka"
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-14 font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-sky-700"
            >
              {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block font-black text-slate-800">
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <ShieldCheck
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Ulangi password baru"
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              required
            />
          </div>
        </div>

        {error && (
          <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={22} />
            <p className="text-sm font-semibold leading-6">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2 size={22} />
            <p className="text-sm font-semibold leading-6">
              {success} Mengalihkan ke halaman login...
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-700 to-blue-950 px-6 py-5 text-xl font-black text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              Reset Password
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
