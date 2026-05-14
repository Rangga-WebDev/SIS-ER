/** @format */
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { serviceCards } from "@/lib/landing-data";
import SectionHeader from "./SectionHeader";
export default function ServicesSection() {
  return (
    <section id="layanan" className="relative z-10 scroll-mt-28 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="Layanan Utama"
          title="Modul layanan untuk dosen dan admin"
          desc="Sistem dibangun modular agar siap dikembangkan oleh tim engineering dan dipakai oleh pengguna non-teknis."
        />
        <div className="mt-14 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {serviceCards.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="group relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-sky-200 hover:shadow-2xl hover:shadow-sky-200/50"
              >
                <div
                  className={`absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br ${item.accent} opacity-10 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-25`}
                />
                <div
                  className={`relative mb-6 h-2 rounded-full bg-gradient-to-r ${item.accent}`}
                />
                <div className="relative flex gap-5">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${item.accent} text-white shadow-xl transition-all duration-500 group-hover:rotate-6 group-hover:scale-110`}
                  >
                    <Icon size={30} />
                  </div>
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                      <CheckCircle2 size={14} className="text-emerald-500" />{" "}
                      Modul {String(index + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-xl font-black leading-tight text-slate-950 transition group-hover:text-sky-800">
                      {item.title}
                    </h3>
                    <p className="mt-4 leading-7 text-slate-600">{item.desc}</p>
                  </div>
                </div>
                <div className="relative mt-8 border-t border-slate-100 pt-5">
                  <button className="inline-flex w-full items-center justify-between rounded-2xl bg-slate-50 px-5 py-4 text-sm font-black tracking-wide text-slate-700 transition-all duration-300 hover:bg-sky-50 hover:text-sky-800 group-hover:shadow-inner">
                    <span>Layanan</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm transition duration-300 group-hover:translate-x-1 group-hover:bg-sky-700 group-hover:text-white">
                      <ArrowRight size={18} />
                    </span>
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-sky-400 to-blue-700 transition-all duration-500 group-hover:w-full" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
