/** @format */
import { flowSteps } from "@/lib/landing-data";
import SectionHeader from "./SectionHeader";
export default function WorkflowSection() {
  return (
    <section id="alur" className="relative z-10 scroll-mt-28 bg-white/70 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="Alur Sistem"
          title="Workflow dari register sampai verifikasi"
          desc="Setiap tahapan didesain jelas agar dosen dan admin mengetahui status pekerjaan berikutnya."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {flowSteps.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="group relative rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:border-sky-200 hover:shadow-xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 transition group-hover:rotate-6 group-hover:scale-110 group-hover:bg-sky-700 group-hover:text-white">
                    <Icon size={28} />
                  </div>
                  <span className="text-5xl font-black text-slate-100 transition group-hover:text-sky-100">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">{item.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
