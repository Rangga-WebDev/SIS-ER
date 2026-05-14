/** @format */
import { ArrowRight, CheckCircle2, Mail, MapPin } from "lucide-react";
import type { ReactNode } from "react";
export default function ContactSection() {
  return (
    <section id="kontak" className="relative z-10 scroll-mt-28 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-2xl">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 text-white md:p-12">
              <p className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-sky-300">
                Kontak & Bantuan
              </p>
              <h2 className="text-4xl font-black leading-tight md:text-5xl">
                Butuh bantuan penggunaan sistem?
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Dalam tahap pengembangan.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <ContactItem
                  icon={<Mail size={22} />}
                  title="Email Bantuan"
                  desc="support@unismuh.ac.id"
                />
                <ContactItem
                  icon={<MapPin size={22} />}
                  title="Institusi"
                  desc="Universitas Muhammadiyah Makassar"
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-sky-600 to-blue-900 p-8 text-white md:p-12">
              <h3 className="text-2xl font-black">Status Sistem</h3>
              <div className="mt-8 space-y-5">
                {[
                  "Landing page aktif",
                  "Register dosen tersedia",
                  "Login dosen/admin tersedia",
                  "Upload dokumen via Supabase Storage",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl bg-white/10 p-4"
                  >
                    <CheckCircle2 size={22} />
                    <span className="font-bold">{item}</span>
                  </div>
                ))}
              </div>
              <a
                href="/register"
                className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 font-black text-sky-800 shadow-lg transition hover:-translate-y-1"
              >
                Mulai Register <ArrowRight size={22} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
function ContactItem({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-sky-200">
        {icon}
      </div>
      <h4 className="font-black text-white">{title}</h4>
      <p className="mt-2 text-slate-300">{desc}</p>
    </div>
  );
}
