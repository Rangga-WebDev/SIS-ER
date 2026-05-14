/** @format */
import { ChevronDown } from "lucide-react";
import { faqs } from "@/lib/landing-data";
import SectionHeader from "./SectionHeader";
export default function FaqSection({
  openFaq,
  setOpenFaq,
}: {
  openFaq: number | null;
  setOpenFaq: (v: number | null) => void;
}) {
  return (
    <section id="faq" className="relative z-10 scroll-mt-28 bg-white/70 py-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Pertanyaan umum"
          desc="Informasi batasan, keamanan, dan alur penggunaan."
          centered
        />
        <div className="mt-12 space-y-4">
          {faqs.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <article
                key={item.question}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-5 px-7 py-6 text-left"
                >
                  <span className="text-lg font-black text-slate-950">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={22}
                    className={`shrink-0 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-7 pb-7 pt-5 leading-8 text-slate-600">
                    {item.answer}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
