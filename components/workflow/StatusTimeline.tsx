/** @format */

import { CheckCircle2, CircleDashed, CircleDot } from "lucide-react";
import {
  getPipelineIndex,
  getStatusBadgeClass,
  getStatusLabel,
  PIPELINE_STEPS,
} from "@/lib/dupak-workflow";
import type { DupakStatus } from "@/lib/app-types";

type HistoryItem = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedByEmail: string | null;
  changedByRole: string | null;
  createdAt: Date | string;
};

type Props = {
  status: DupakStatus;
  histories?: HistoryItem[];
};

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function StatusTimeline({ status, histories = [] }: Props) {
  const activeIndex = getPipelineIndex(status);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-black text-slate-950">Tahapan Pengajuan</h3>

        <span
          className={`rounded-full border px-4 py-1.5 text-xs font-black ${getStatusBadgeClass(status)}`}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      <ol className="mt-6 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {PIPELINE_STEPS.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;

          return (
            <li
              key={step.status}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
                done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : active
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              {done ? (
                <CheckCircle2 size={17} className="shrink-0" />
              ) : active ? (
                <CircleDot size={17} className="shrink-0" />
              ) : (
                <CircleDashed size={17} className="shrink-0" />
              )}
              <span className="leading-5">{step.label}</span>
            </li>
          );
        })}
      </ol>

      {histories.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
            Riwayat Proses
          </p>

          <ol className="mt-3 space-y-3">
            {histories.map((history) => (
              <li
                key={history.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {history.fromStatus && (
                    <>
                      <span className="font-bold text-slate-500">
                        {getStatusLabel(history.fromStatus)}
                      </span>
                      <span className="text-slate-400">→</span>
                    </>
                  )}
                  <span className="font-black text-slate-900">
                    {getStatusLabel(history.toStatus)}
                  </span>
                </div>

                {history.reason && (
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    {history.reason}
                  </p>
                )}

                <p className="mt-1 text-xs font-bold text-slate-400">
                  {formatDateTime(history.createdAt)}
                  {history.changedByEmail
                    ? ` • ${history.changedByEmail} (${history.changedByRole || "-"})`
                    : ""}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
