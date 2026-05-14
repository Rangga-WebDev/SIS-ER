/** @format */

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-6">
      <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white">
          <SearchX size={32} />
        </div>

        <p className="mt-5 text-sm font-black uppercase tracking-[0.25em] text-sky-700">
          404 Not Found
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Halaman Tidak Ditemukan
        </h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
          Halaman yang kamu buka tidak tersedia atau sudah dipindahkan.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
        >
          <ArrowLeft size={18} />
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
