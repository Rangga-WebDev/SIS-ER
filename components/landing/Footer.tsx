/** @format */
import { ArrowRight, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { footerLinks } from "@/lib/landing-data";
import type { ReactNode } from "react";
export default function Footer({
  onNavClick,
}: {
  onNavClick: (href: string) => void;
}) {
  return (
    <footer className="relative z-10 overflow-hidden border-t border-slate-200 bg-slate-950 text-white">
      <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-blue-700/25 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-14 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-sky-200">
                <Sparkles size={16} /> Siap untuk digunakan
              </div>
              <h2 className="text-3xl font-black leading-tight md:text-4xl">
                Ketik 1 untuk mulai
              </h2>
              <p className="mt-4 max-w-2xl leading-8 text-slate-300">
                Struktur Sistem telah dirancang untuk memudahkan pengembangan
                fitur baru dan integrasi dengan layanan kampus lainnya di masa
                depan.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <a
                href="/register"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-sky-600 px-6 py-4 font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-sky-700"
              >
                Register <ArrowRight size={20} />
              </a>
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-white/15"
              >
                Login
              </a>
            </div>
          </div>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1.85fr]">
          <div>
            <button
              type="button"
              onClick={() => onNavClick("#beranda")}
              className="group flex items-center gap-4 text-left"
            >
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-800 shadow-lg shadow-sky-900/30 transition group-hover:rotate-6 group-hover:scale-110">
                <div className="relative h-7 w-7 rounded-full bg-white/90" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white">
                  SISTER
                </h2>
                <p className="text-xs font-bold tracking-[0.22em] text-slate-400">
                  PAK PLATFORM
                </p>
              </div>
            </button>
            <p className="mt-6 max-w-md leading-8 text-slate-300">
              Platform pengelolaan dokumen kenaikan jabatan dosen dengan
              pengalaman pengguna yang modern.
            </p>
            <div className="mt-7 grid gap-3">
              <FooterInfo
                icon={<ShieldCheck size={19} />}
                title="Aman untuk operasional"
                desc="Role-based access control, validasi file, dan audit log untuk keamanan dan kepatuhan operasional kampus."
              />
              <FooterInfo
                icon={<Mail size={19} />}
                title="Kontak"
                desc="support@unismuh.ac.id"
              />
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h3 className="mb-5 font-black text-white">{group.title}</h3>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-sky-300"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-600 transition group-hover:w-4 group-hover:bg-sky-400" />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-6 border-t border-white/10 pt-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© 2026 SISTER PAK. Built for modern academic operations.</p>
        </div>
      </div>
    </footer>
  );
}
function FooterInfo({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-sky-400/30 hover:bg-sky-400/10">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300 transition group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white">
        {icon}
      </div>
      <div>
        <h4 className="font-black text-white">{title}</h4>
        <p className="mt-1 text-sm text-slate-400">{desc}</p>
      </div>
    </div>
  );
}
