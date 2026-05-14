/** @format */

import { Loader2, ShieldCheck } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white">
          <ShieldCheck size={30} />
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-950">
          Memuat Halaman
        </h1>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Sistem sedang menyiapkan data dashboard dan dokumen.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-5 py-3 text-sm font-black text-slate-600">
          <Loader2 size={18} className="animate-spin" />
          Loading...
        </div>
      </div>
    </main>
  );
}
