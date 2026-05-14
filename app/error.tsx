/** @format */

"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-6">
      <div className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-xl shadow-red-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
          <AlertTriangle size={32} />
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-950">
          Terjadi Kesalahan
        </h1>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Sistem gagal memuat halaman. Ini biasanya terjadi karena koneksi
          database, session, atau data yang belum sinkron.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Error
          </p>
          <p className="mt-2 break-words text-sm font-bold text-slate-700">
            {error.message || "Unknown error"}
          </p>
        </div>

        <button
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
        >
          <RefreshCcw size={18} />
          Coba Lagi
        </button>
      </div>
    </main>
  );
}
