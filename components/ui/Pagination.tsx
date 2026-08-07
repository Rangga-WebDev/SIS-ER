/** @format */

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  pathname: string;
  page: number;
  pageSize: number;
  totalItems: number;
  query?: Record<string, string | undefined>;
  pageParam?: string;
  pageSizeParam?: string;
};

function buildHref({
  pathname,
  page,
  pageSize,
  query,
  pageParam,
  pageSizeParam,
}: {
  pathname: string;
  page: number;
  pageSize: number;
  query?: Record<string, string | undefined>;
  pageParam: string;
  pageSizeParam: string;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (value) params.set(key, value);
  }

  params.set(pageParam, String(page));
  params.set(pageSizeParam, String(pageSize));

  return `${pathname}?${params.toString()}`;
}

export default function Pagination({
  pathname,
  page,
  pageSize,
  totalItems,
  query,
  pageParam = "page",
  pageSizeParam = "pageSize",
}: Props) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label="Navigasi halaman"
      className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm font-bold text-slate-500">
        Menampilkan {start}-{end} dari {totalItems} data
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={buildHref({
              pathname,
              page: page - 1,
              pageSize,
              query,
              pageParam,
              pageSizeParam,
            })}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <ChevronLeft size={15} />
            Sebelumnya
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black text-slate-300">
            <ChevronLeft size={15} />
            Sebelumnya
          </span>
        )}

        <span className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">
          {page} / {pageCount}
        </span>

        {page < pageCount ? (
          <Link
            href={buildHref({
              pathname,
              page: page + 1,
              pageSize,
              query,
              pageParam,
              pageSizeParam,
            })}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            Berikutnya
            <ChevronRight size={15} />
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black text-slate-300">
            Berikutnya
            <ChevronRight size={15} />
          </span>
        )}
      </div>
    </nav>
  );
}
