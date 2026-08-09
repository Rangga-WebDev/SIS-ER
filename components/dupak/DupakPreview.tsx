/** @format */

import { Fragment } from "react";
import {
  computeDupakSubtotals,
  DUPAK_PERSONAL_FIELDS,
  DUPAK_TEMPLATE_ROWS,
  getAssessorTotal,
  getProposerTotal,
  type DupakCreditData,
  type DupakPersonalData,
} from "@/lib/dupak-template";

export type DupakEvidencePreviewItem = {
  id: string;
  rowCode: string;
  rowLabel: string;
  evidenceUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  note: string | null;
  uploadedAt: Date | string;
};

export type DupakEntryPreviewItem = {
  id: string;
  rowCode: string;
  title: string;
  subCategory?: string | null;
  activityYear?: string | null;
  credit?: string | null;
  evidenceUrl?: string | null;
  orderIndex?: number;
};

type Props = {
  nomor?: string | null;
  instansi?: string | null;
  masaPenilaianStart?: string | Date | null;
  masaPenilaianEnd?: string | Date | null;
  personalData?: DupakPersonalData | null;
  creditData?: DupakCreditData | null;
  supportNotes?: string | null;
  evidences?: DupakEvidencePreviewItem[];
  showEvidenceColumn?: boolean;
  entries?: DupakEntryPreviewItem[];
};

function formatDate(date?: string | Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date?: string | Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export default function DupakPreview({
  nomor,
  instansi,
  masaPenilaianStart,
  masaPenilaianEnd,
  personalData = {},
  creditData = {},
  supportNotes,
  evidences = [],
  showEvidenceColumn = false,
  entries = [],
}: Props) {
  const evidenceMap = new Map<string, DupakEvidencePreviewItem>();

  for (const evidence of evidences) {
    if (!evidenceMap.has(evidence.rowCode)) {
      evidenceMap.set(evidence.rowCode, evidence);
    }
  }

  const entriesByRow = new Map<string, DupakEntryPreviewItem[]>();

  for (const entry of entries) {
    const list = entriesByRow.get(entry.rowCode) || [];
    list.push(entry);
    entriesByRow.set(entry.rowCode, list);
  }

  for (const list of entriesByRow.values()) {
    list.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  const subtotals = computeDupakSubtotals(creditData);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          Daftar Usul Penetapan Angka Kredit Jabatan Akademik Dosen
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950">
          FORMAT DUPAK
        </h2>

        <p className="mt-2 text-sm font-bold text-slate-500">
          Nomor: {nomor || "-"}
        </p>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <Info label="Instansi" value={instansi || "-"} />
        <Info
          label="Masa Penilaian"
          value={`${formatDate(masaPenilaianStart)} s.d. ${formatDate(
            masaPenilaianEnd,
          )}`}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <div className="bg-slate-950 px-5 py-4 text-white">
          <p className="font-black">Keterangan Perorangan</p>
        </div>

        <div className="divide-y divide-slate-200">
          {DUPAK_PERSONAL_FIELDS.map((field, index) => (
            <div
              key={field.key}
              className="grid gap-2 bg-white px-5 py-3 md:grid-cols-[80px_320px_1fr]"
            >
              <p className="font-black text-slate-400">{index + 1}.</p>
              <p className="font-bold text-slate-700">{field.label}</p>
              <p className="font-semibold text-slate-950">
                {personalData?.[field.key] || "-"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table
          className={`w-full text-left text-sm ${
            showEvidenceColumn ? "min-w-[1250px]" : "min-w-[980px]"
          }`}
        >
          <thead>
            <tr className="bg-slate-950 text-white">
              <th rowSpan={2} className="border border-slate-700 p-3">
                Unsur/Sub Unsur/Butir Kegiatan
              </th>

              <th
                colSpan={3}
                className="border border-slate-700 p-3 text-center"
              >
                Instansi Pengusul
              </th>

              <th
                colSpan={3}
                className="border border-slate-700 p-3 text-center"
              >
                Tim Penilai
              </th>

              {showEvidenceColumn && (
                <th
                  rowSpan={2}
                  className="border border-slate-700 p-3 text-center"
                >
                  Bukti Dokumen
                </th>
              )}
            </tr>

            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-700 p-3 text-center">Lama</th>
              <th className="border border-slate-700 p-3 text-center">Baru</th>
              <th className="border border-slate-700 p-3 text-center">
                Jumlah
              </th>
              <th className="border border-slate-700 p-3 text-center">Lama</th>
              <th className="border border-slate-700 p-3 text-center">Baru</th>
              <th className="border border-slate-700 p-3 text-center">
                Jumlah
              </th>
            </tr>
          </thead>

          <tbody>
            {DUPAK_TEMPLATE_ROWS.map((row) => {
              const value = creditData?.[row.code];
              const evidence = evidenceMap.get(row.code) || null;
              const rowEntries = entriesByRow.get(row.code) || [];

              if (row.type === "SECTION") {
                return (
                  <tr key={row.code} className="bg-sky-50">
                    <td
                      colSpan={showEvidenceColumn ? 8 : 7}
                      className="border border-slate-200 p-3 font-black text-sky-900"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              return (
                <Fragment key={row.code}>
                  <tr
                    className={
                      row.type === "TOTAL" ? "bg-slate-100" : "bg-white"
                    }
                  >
                    <td
                      className={`border border-slate-200 p-3 ${
                        row.type === "TOTAL"
                          ? "font-black text-slate-950"
                          : "font-semibold text-slate-700"
                      }`}
                      style={{
                        paddingLeft: `${12 + row.level * 18}px`,
                      }}
                    >
                      {row.label}
                    </td>

                    {row.type === "TOTAL" ? (
                      (() => {
                        const subtotal = subtotals[row.code];

                        return (
                          <>
                            <Cell
                              value={String(subtotal?.oldProposer || "")}
                              bold
                            />
                            <Cell
                              value={String(subtotal?.newProposer || "")}
                              bold
                            />
                            <Cell
                              value={String(subtotal?.proposerTotal || "")}
                              bold
                            />
                            <Cell
                              value={String(subtotal?.oldAssessor || "")}
                              bold
                            />
                            <Cell
                              value={String(subtotal?.newAssessor || "")}
                              bold
                            />
                            <Cell
                              value={String(subtotal?.assessorTotal || "")}
                              bold
                            />
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <Cell value={value?.oldProposer} />
                        <Cell value={value?.newProposer} />
                        <Cell
                          value={String(getProposerTotal(value) || "")}
                          bold
                        />
                        <Cell value={value?.oldAssessor} />
                        <Cell value={value?.newAssessor} />
                        <Cell
                          value={String(getAssessorTotal(value) || "")}
                          bold
                        />
                      </>
                    )}

                    {showEvidenceColumn && (
                      <EvidencePreviewCell
                        rowType={row.type}
                        rowLabel={row.label}
                        evidence={evidence}
                      />
                    )}
                  </tr>

                  {/* Sub-baris rincian kegiatan milik baris ini. */}
                  {row.type === "ITEM" &&
                    rowEntries.map((entry, index) => (
                      <tr key={entry.id} className="bg-slate-50/60">
                        <td
                          colSpan={showEvidenceColumn ? 8 : 7}
                          className="border border-slate-200 py-2 pr-3 text-sm"
                          style={{
                            paddingLeft: `${12 + (row.level + 1) * 18}px`,
                          }}
                        >
                          <span className="font-black text-slate-400">
                            {index + 1}.
                          </span>{" "}
                          <span className="font-bold text-slate-700">
                            {entry.title}
                          </span>
                          {entry.subCategory && (
                            <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-black text-slate-600">
                              {entry.subCategory}
                            </span>
                          )}
                          {entry.activityYear && (
                            <span className="ml-2 text-xs font-bold text-slate-400">
                              ({entry.activityYear})
                            </span>
                          )}
                          <span className="ml-2 text-xs font-black text-slate-500">
                            AK: {entry.credit || "0"}
                          </span>
                          {entry.evidenceUrl && (
                            <a
                              href={entry.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-black text-sky-700 transition hover:bg-sky-100"
                            >
                              Bukti ↗
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="font-black text-slate-950">Lampiran Pendukung DUPAK</p>
        <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">
          {supportNotes || "-"}
        </p>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Cell({ value, bold = false }: { value?: string; bold?: boolean }) {
  return (
    <td
      className={`border border-slate-200 p-3 text-center ${
        bold ? "font-black text-slate-950" : "font-semibold text-slate-600"
      }`}
    >
      {value || "-"}
    </td>
  );
}

function EvidencePreviewCell({
  rowType,
  rowLabel,
  evidence,
}: {
  rowType: string;
  rowLabel: string;
  evidence: DupakEvidencePreviewItem | null;
}) {
  if (rowType === "TOTAL") {
    return (
      <td className="border border-slate-200 p-3 text-center text-xs font-bold text-slate-400">
        Tidak perlu bukti
      </td>
    );
  }

  if (!evidence?.evidenceUrl) {
    return (
      <td className="border border-slate-200 p-3 text-center">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-400">
          Belum ada link bukti
        </span>
      </td>
    );
  }

  return (
    <td className="border border-slate-200 p-3 align-top">
      <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-white p-3">
        <div>
          <p className="text-xs font-black text-slate-800">
            Link Bukti Google Drive
          </p>

          <p className="mt-1 text-[11px] font-bold text-slate-400">
            {formatDateTime(evidence.uploadedAt)}
          </p>
        </div>

        {evidence.note && (
          <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold leading-5 text-slate-500">
            {evidence.note}
          </p>
        )}

        <a
          href={evidence.evidenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          Buka Link Bukti
        </a>
      </div>
    </td>
  );
}
