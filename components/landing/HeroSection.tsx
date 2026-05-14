/** @format */
import {
  ArrowRight,
  Bell,
  ChevronDown,
  LockKeyhole,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import CreativeButton from "@/components/ui/CreativeButton";
export default function HeroSection({
  onNavClick,
}: {
  onNavClick: (href: string) => void;
}) {
  return (
    <section
      id="beranda"
      className="relative z-10 mx-auto grid max-w-7xl scroll-mt-28 grid-cols-1 items-center gap-16 px-6 pb-20 pt-14 lg:grid-cols-2 lg:px-8 lg:pt-20"
    >
      <div>
        <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-sky-100 bg-white px-5 py-3 shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
          <span className="text-sm font-bold text-sky-800">
            Academic Document Operating System
          </span>
        </div>
        <h2 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-7xl">
          Portal Mandiri
          <span className="mt-2 block text-sky-700">Dokumen Dosen</span>
        </h2>
        <h3 className="mt-8 text-2xl font-black text-slate-900 md:text-3xl">
          Dosen Upload Mandiri, Admin Verifikasi Terpusat
        </h3>
        <p className="mt-8 max-w-2xl text-lg leading-9 text-slate-600 md:text-xl">
          Platform profesional untuk pengelolaan dokumen kenaikan jabatan dosen:
          aman, terstruktur, berbasis role, dan siap dikembangkan untuk
          penggunaan institusi.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <FeatureBadge icon={<Zap size={20} />} title="Cepat" />
          <FeatureBadge icon={<ShieldCheck size={20} />} title="Aman" />
          <FeatureBadge icon={<Users size={20} />} title="Terpantau" />
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <CreativeButton href="/register">Buat Akun Dosen</CreativeButton>
          <button
            type="button"
            onClick={() => onNavClick("#alur")}
            className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-7 py-5 text-lg font-black text-slate-800 shadow-sm transition hover:-translate-y-1 hover:bg-slate-50 hover:shadow-xl"
          >
            Lihat Alur <ChevronDown size={24} />
          </button>
        </div>
      </div>
      <div className="relative">
        <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-sky-200 blur-3xl" />
        <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-blue-200 blur-3xl" />
        <div className="relative rounded-[2rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200 md:p-10">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <LockKeyhole size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-950">
                Akses Sistem
              </h2>
              <p className="mt-1 text-slate-500">
                Login dosen dan admin berbasis role
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
                <Bell size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  Workflow Terstruktur
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Upload file dokumen, verifikasi admin, dan notifikasi
                  real-time untuk setiap langkah proses.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a
              href="/login"
              className="flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-5 text-lg font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-slate-800"
            >
              Login
            </a>
            <a
              href="/register"
              className="flex items-center justify-center rounded-2xl bg-sky-700 px-6 py-5 text-lg font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-sky-800"
            >
              Register <ArrowRight className="ml-2" size={20} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
function FeatureBadge({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <span className="text-sky-600">{icon}</span>
      <span className="font-bold text-slate-700">{title}</span>
    </div>
  );
}
