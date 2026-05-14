/** @format */
import { CheckCircle2 } from "lucide-react";
import { featureCards } from "@/lib/landing-data";
export default function FeaturesSection() {
  return (
    <section id="fitur" className="relative z-10 scroll-mt-28 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-sky-600" /> Fitur Teknis
            </div>
            <h2 className="text-4xl font-black leading-tight text-slate-950 md:text-5xl">
              Struktur Sistem Modern
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              PAK Platform dibangun dengan teknologi modern dan best practices
              untuk memastikan performa, keamanan, dan skalabilitas yang
              optimal.
            </p>
            <div className="mt-8 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/25">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-black">
                    dev
                  </span>
                  <div>
                    <span className="font-black">Project Standard</span>
                    <p className="text-sm text-slate-400">
                      Production-ready workflow
                    </p>
                  </div>
                </div>
                <div className="hidden gap-2 sm:flex">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                </div>
              </div>
              <pre className="relative overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-sm leading-7 text-slate-200">{`Masih \nDalam \nTahap \nPengembangan \nHEHEHE \n-QwertyDev`}</pre>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {["Clean Architecture", "Reusable Components"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-slate-200"
                  >
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {featureCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-sky-200 hover:shadow-2xl hover:shadow-sky-200/50"
                >
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-200/40 blur-2xl transition duration-500 group-hover:scale-150 group-hover:bg-blue-300/40" />
                  <div className="relative mb-6 flex items-center justify-between">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-sky-700 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-sky-700 group-hover:text-white">
                      <Icon size={30} />
                    </div>
                    <span className="text-5xl font-black text-slate-100 transition group-hover:text-sky-100">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="relative text-xl font-black text-slate-950 transition group-hover:text-sky-800">
                    {item.title}
                  </h3>
                  <p className="relative mt-3 leading-7 text-slate-600">
                    {item.desc}
                  </p>
                  <div className="relative mt-6 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-0 rounded-full bg-gradient-to-r from-sky-500 to-blue-800 transition-all duration-500 group-hover:w-full" />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
