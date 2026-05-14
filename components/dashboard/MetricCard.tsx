/** @format */

type MetricTone = "sky" | "emerald" | "amber" | "rose" | "slate" | "violet";

type MetricCardProps = {
  label: string;
  value: string | number;
  desc?: string;
  icon?: React.ReactNode;
  tone?: MetricTone;
  footer?: string;
};

const toneStyles: Record<
  MetricTone,
  {
    icon: string;
    glow: string;
    bar: string;
  }
> = {
  sky: {
    icon: "bg-sky-100 text-sky-700",
    glow: "bg-sky-200/50",
    bar: "bg-sky-700",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    glow: "bg-emerald-200/50",
    bar: "bg-emerald-600",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    glow: "bg-amber-200/50",
    bar: "bg-amber-500",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700",
    glow: "bg-rose-200/50",
    bar: "bg-rose-600",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700",
    glow: "bg-slate-200/50",
    bar: "bg-slate-800",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700",
    glow: "bg-violet-200/50",
    bar: "bg-violet-600",
  },
};

export default function MetricCard({
  label,
  value,
  desc,
  icon,
  tone = "sky",
  footer,
}: MetricCardProps) {
  const styles = toneStyles[tone];

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-2xl hover:shadow-slate-200">
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition duration-300 group-hover:scale-125 ${styles.glow}`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
            {label}
          </p>

          <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          {desc && (
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {desc}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:rotate-6 group-hover:scale-110 ${styles.icon}`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full w-1/2 rounded-full transition-all duration-500 group-hover:w-full ${styles.bar}`}
        />
      </div>

      {footer && (
        <p className="relative mt-4 text-xs font-black uppercase tracking-widest text-slate-400">
          {footer}
        </p>
      )}
    </article>
  );
}
