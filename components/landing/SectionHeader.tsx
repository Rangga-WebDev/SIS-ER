/** @format */
export default function SectionHeader({
  eyebrow,
  title,
  desc,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-sky-700">
        {eyebrow}
      </p>
      <h2 className="text-4xl font-black leading-tight text-slate-950 md:text-5xl">
        {title}
      </h2>
      <p className="mt-6 text-lg leading-8 text-slate-600">{desc}</p>
    </div>
  );
}
