/** @format */
import { ArrowRight, Menu, X } from "lucide-react";
import { navItems } from "@/lib/landing-data";
import Image from "next/image";

export default function Navbar({
  activeSection,
  mobileOpen,
  setMobileOpen,
  onNavClick,
}: {
  activeSection: string;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  onNavClick: (href: string) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <button
          type="button"
          onClick={() => onNavClick("#beranda")}
          className="flex items-center gap-4 text-left"
        >
          <Image
            src="/logo-unismuh.svg"
            alt="Logo Kampus"
            width={48}
            height={48}
            className="rounded-full"
          />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              JAFUNG SMART
            </h1>
            <p className="hidden text-[10px] font-bold tracking-[0.22em] text-slate-500 sm:block">
              UNIVERSITAS MUHAMMADIYAH MAKASSAR
            </p>
          </div>
        </button>
        <nav className="hidden items-center gap-1 rounded-2xl border border-slate-100 bg-white/80 p-1 shadow-sm lg:flex">
          {navItems.map((item) => {
            const id = item.href.replace("#", "");
            const isActive = activeSection === id;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => onNavClick(item.href)}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${isActive ? "bg-sky-100 text-sky-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="/login"
            className="rounded-xl px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            Masuk
          </a>
          <a
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-900/20 transition hover:-translate-y-0.5 hover:bg-sky-800"
          >
            Daftar Dosen <ArrowRight size={18} />
          </a>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm lg:hidden"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-6 py-5 lg:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => onNavClick(item.href)}
                className="rounded-xl px-4 py-3 text-left font-bold text-slate-600 hover:bg-slate-100"
              >
                {item.label}
              </button>
            ))}
            <a
              href="/register"
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-4 font-black text-white"
            >
              Daftar Dosen <ArrowRight size={18} />
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-4 font-black text-slate-700"
            >
              Masuk
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
