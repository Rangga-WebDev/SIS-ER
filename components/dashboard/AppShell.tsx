/** @format */

"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import NotificationCenter from "@/components/dashboard/NotificationCenter";
import Image from "next/image";

import {
  BarChart3,
  Bell,
  BookOpenCheck,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  GaugeCircle,
  Home,
  LayoutDashboard,
  Scale,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UsersRound,
} from "lucide-react";

type Role =
  | "DOSEN"
  | "ADMIN"
  | "TIM_PAK"
  | "KOMITE_INTEGRITAS_AKADEMIK"
  | "TIM_SENAT";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  role: Role;
};

type NavItem = {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
};

const dosenNav: NavItem[] = [
  {
    href: "/dosen/dashboard",
    label: "Dashboard",
    desc: "Ringkasan progres",
    icon: <LayoutDashboard size={19} />,
  },
  {
    href: "/dosen/dokumen",
    label: "Upload Dokumen",
    desc: "Kelola berkas",
    icon: <UploadCloud size={19} />,
  },
  {
    href: "/dosen/dupak",
    label: "DUPAK",
    desc: "Isi formulir DUPAK",
    icon: <ClipboardList size={19} />,
  },
];

const adminNav: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    desc: "Monitoring sistem",
    icon: <LayoutDashboard size={19} />,
  },
  {
    href: "/admin/dosen",
    label: "Data Dosen",
    desc: "Verifikasi berkas",
    icon: <UsersRound size={19} />,
  },
  {
    href: "/admin/dupak",
    label: "Pengajuan DUPAK",
    desc: "Verifikasi & monitoring",
    icon: <ClipboardList size={19} />,
  },
  {
    href: "/admin/penugasan",
    label: "Penugasan Tim PAK",
    desc: "Tugaskan penilai",
    icon: <ClipboardCheck size={19} />,
  },
  {
    href: "/admin/tim-pak",
    label: "Kelola Tim PAK",
    desc: "Akun & beban kerja",
    icon: <ShieldCheck size={19} />,
  },
  {
    href: "/admin/berita-acara",
    label: "Berita Acara",
    desc: "Pemeriksaan & pengesahan",
    icon: <ScrollText size={19} />,
  },
];

const pakNav: NavItem[] = [
  {
    href: "/pak/dashboard",
    label: "Dashboard",
    desc: "Ringkasan tugas",
    icon: <LayoutDashboard size={19} />,
  },
  {
    href: "/pak/tugas",
    label: "Tugas Penilaian",
    desc: "Monitoring & penilaian DUPAK",
    icon: <ClipboardCheck size={19} />,
  },
  {
    href: "/pak/riwayat",
    label: "Riwayat Penilaian",
    desc: "Tugas yang selesai",
    icon: <FileCheck2 size={19} />,
  },
];

const komiteNav: NavItem[] = [
  {
    href: "/komite/dashboard",
    label: "Dashboard",
    desc: "Pengajuan masuk",
    icon: <LayoutDashboard size={19} />,
  },
  {
    href: "/komite/riwayat",
    label: "Riwayat Pemeriksaan",
    desc: "Keputusan sebelumnya",
    icon: <GaugeCircle size={19} />,
  },
];

const senatNav: NavItem[] = [
  {
    href: "/senat/dashboard",
    label: "Dashboard",
    desc: "Pengajuan masuk",
    icon: <LayoutDashboard size={19} />,
  },
  {
    href: "/senat/riwayat",
    label: "Riwayat Keputusan",
    desc: "Keputusan senat",
    icon: <Scale size={19} />,
  },
];

const NAVS: Record<Role, NavItem[]> = {
  DOSEN: dosenNav,
  ADMIN: adminNav,
  TIM_PAK: pakNav,
  KOMITE_INTEGRITAS_AKADEMIK: komiteNav,
  TIM_SENAT: senatNav,
};

const ROLE_TITLES: Record<Role, string> = {
  DOSEN: "Portal Dosen",
  ADMIN: "Portal Admin Tim PAK",
  TIM_PAK: "Portal Tim PAK",
  KOMITE_INTEGRITAS_AKADEMIK: "Portal Komite Integritas",
  TIM_SENAT: "Portal Tim Senat",
};

const ROLE_DESCS: Record<Role, string> = {
  DOSEN: "Kelola dokumen kenaikan jabatan secara mandiri.",
  ADMIN: "Pantau, verifikasi, dan tugaskan penilaian DUPAK.",
  TIM_PAK: "Nilai pengajuan DUPAK yang ditugaskan kepada Anda.",
  KOMITE_INTEGRITAS_AKADEMIK: "Periksa integritas akademik pengusul.",
  TIM_SENAT: "Tinjau berita acara dan beri keputusan senat.",
};

export default function AppShell({
  children,
  title,
  subtitle,
  role,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");

  const navItems = NAVS[role] || dosenNav;

  const getSearchTarget = () => {
    if (role === "ADMIN") {
      return pathname.startsWith("/admin/dupak")
        ? "/admin/dupak"
        : "/admin/dosen";
    }

    if (role === "TIM_PAK") return "/pak/tugas";
    if (role === "KOMITE_INTEGRITAS_AKADEMIK") return "/komite/dashboard";
    if (role === "TIM_SENAT") return "/senat/dashboard";

    return "/dosen/dokumen";
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const target = getSearchTarget();
    const trimmed = query.trim();

    router.push(
      trimmed ? `${target}?q=${encodeURIComponent(trimmed)}` : target,
    );
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.13),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_34%)]" />

      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-6 p-4 lg:grid-cols-[300px_1fr] lg:p-6">
        <aside className="hidden lg:block">
          <div className="sticky top-6 flex h-[calc(100vh-48px)] flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
            <div className="border-b border-slate-100 p-5">
              <Link href="/" className="group flex items-center gap-4">
                <div className="relative flex h-13 w-13 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20 transition group-hover:scale-105">
                  <Image
                    src="/logo-unismuh.svg"
                    alt="Logo Kampus"
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                </div>

                <div>
                  <p className="text-xl font-black tracking-tight text-slate-950">
                    JAFUNG SMART
                  </p>
                  <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                    {role} Workspace
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4 rounded-3xl border border-sky-100 bg-sky-50/80 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-700 text-white">
                  {role === "DOSEN" ? (
                    <BookOpenCheck size={20} />
                  ) : (
                    <ShieldCheck size={20} />
                  )}
                </div>

                <p className="font-black text-slate-950">{ROLE_TITLES[role]}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {ROLE_DESCS[role]}
                </p>
              </div>

              <p className="mb-3 px-2 text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                Navigasi
              </p>

              <nav className="grid gap-2">
                {navItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative overflow-hidden rounded-2xl border px-4 py-3 transition ${
                        active
                          ? "border-sky-200 bg-sky-50 text-sky-800 shadow-sm"
                          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      {active && (
                        <div className="absolute bottom-0 left-0 top-0 w-1 rounded-full bg-sky-700" />
                      )}

                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                            active
                              ? "bg-sky-700 text-white"
                              : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-sky-700"
                          }`}
                        >
                          {item.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-black">{item.label}</p>
                          <p className="mt-0.5 truncate text-xs font-semibold opacity-70">
                            {item.desc}
                          </p>
                        </div>

                        <ChevronRight
                          size={17}
                          className={`transition ${
                            active
                              ? "text-sky-700"
                              : "text-slate-300 group-hover:translate-x-1 group-hover:text-sky-700"
                          }`}
                        />
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    <Sparkles size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Industrial Mode
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      UI siap production
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4">
              <div className="mb-3 grid grid-cols-3 gap-2">
                <MiniAction icon={<Home size={16} />} href="/" label="Home" />
                <MiniAction icon={<Bell size={16} />} href="#" label="Notif" />
                <MiniAction
                  icon={<Settings size={16} />}
                  href={
                    role === "DOSEN"
                      ? "/dosen/settings"
                      : navItems[0]?.href || "/"
                  }
                  label="Setting"
                />
              </div>

              <LogoutButton />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-4 z-40 mb-6 rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-xl lg:top-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-sky-700">
                    {role} Workspace
                  </span>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                    Production Dashboard
                  </span>
                </div>

                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  {title}
                </h1>

                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600 md:text-base">
                  {subtitle}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <form
                  onSubmit={handleSearch}
                  className="flex min-w-[260px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 transition focus-within:border-sky-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100"
                >
                  <button
                    type="submit"
                    aria-label="Cari"
                    className="text-slate-400 transition hover:text-sky-700"
                  >
                    <Search size={18} />
                  </button>

                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      role === "ADMIN" ? "Cari dosen..." : "Cari dokumen..."
                    }
                    className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </form>

                <NotificationCenter />

                <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 shadow-sm md:flex">
                  <BarChart3 size={18} className="text-sky-700" />
                  Live Monitor
                </div>
              </div>
            </div>
          </header>

          <div className="pb-8">{children}</div>
        </section>
      </div>

      <nav className="fixed bottom-4 left-4 right-4 z-50 grid grid-cols-4 gap-2 rounded-[1.5rem] border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl lg:hidden">
        {navItems.slice(0, 3).map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-2xl px-3 py-3 text-xs font-black transition ${
                active
                  ? "bg-sky-700 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {item.icon}
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/"
          className="flex flex-col items-center justify-center rounded-2xl px-3 py-3 text-xs font-black text-slate-500 hover:bg-slate-50"
        >
          <Home size={19} />
          <span className="mt-1">Home</span>
        </Link>
      </nav>
    </main>
  );
}

function MiniAction({
  icon,
  href,
  label,
}: {
  icon: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-3 text-xs font-black text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
    >
      {icon}
      <span className="mt-1">{label}</span>
    </Link>
  );
}
