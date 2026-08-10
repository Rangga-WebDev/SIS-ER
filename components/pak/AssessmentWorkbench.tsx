/** @format */

"use client";

// Form penilaian DUPAK Tim PAK model tabel FORMAT DUPAK:
// kolom Instansi Pengusul & Tim Penilai (Lama/Baru/Jumlah otomatis),
// tombol bukti per item, status + komentar per item, autosave server-side.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CloudUpload,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  computeDupakSubtotals,
  DUPAK_GRAND_TOTAL_CODE,
  DUPAK_TEMPLATE_ROWS,
  getNumberValue,
  getProposerTotal,
  type DupakCreditData,
} from "@/lib/dupak-template";

export type WorkbenchReview = {
  assessedCredit: string;
  status: "SESUAI" | "PERLU_REVISI" | "TIDAK_SESUAI" | "DIREVISI_DOSEN" | "";
  comment: string;
};

export type AssessmentEntryItem = {
  id: string;
  rowCode: string;
  title: string;
  subCategory: string | null;
  description: string | null;
  activityYear: string | null;
  credit: string | null;
  evidenceUrl: string | null;
  orderIndex: number;
};

type Props = {
  assignmentId: string;
  creditData: DupakCreditData;
  entries: AssessmentEntryItem[];
  rowEvidences: Record<string, string>;
  initialReviews: Record<string, WorkbenchReview>;
  readOnly: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const NUMERIC_PATTERN = /^$|^[0-9]+([.,][0-9]*)?$/;

const STATUS_CHOICES = [
  { value: "", label: "○ Belum Dinilai" },
  { value: "SESUAI", label: "✓ Sesuai" },
  { value: "PERLU_REVISI", label: "! Perlu Revisi" },
  { value: "TIDAK_SESUAI", label: "× Tidak Sesuai" },
] as const;

function unitKey(rowCode: string, entryKey: string) {
  return `${rowCode}::${entryKey}`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function emptyReview(): WorkbenchReview {
  return { assessedCredit: "", status: "", comment: "" };
}

export default function AssessmentWorkbench({
  assignmentId,
  creditData,
  entries,
  rowEvidences,
  initialReviews,
  readOnly,
}: Props) {
  const itemRows = useMemo(
    () => DUPAK_TEMPLATE_ROWS.filter((row) => row.type === "ITEM"),
    [],
  );

  const entriesByRow = useMemo(() => {
    const map = new Map<string, AssessmentEntryItem[]>();

    for (const entry of entries) {
      const list = map.get(entry.rowCode) || [];
      list.push(entry);
      map.set(entry.rowCode, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return map;
  }, [entries]);

  const [reviews, setReviews] = useState<Record<string, WorkbenchReview>>(
    () => {
      const map: Record<string, WorkbenchReview> = {};

      for (const row of itemRows) {
        const rowEntries = entriesByRow.get(row.code) || [];

        if (rowEntries.length > 0) {
          for (const entry of rowEntries) {
            map[unitKey(row.code, entry.id)] =
              initialReviews[unitKey(row.code, entry.id)] || emptyReview();
          }
          continue;
        }

        const key = unitKey(row.code, "");
        const initial = initialReviews[key];

        map[key] = initial || {
          ...emptyReview(),
          // Nilai lama dari creditData agar penilaian sebelumnya tetap tampil.
          assessedCredit: String(creditData[row.code]?.newAssessor || ""),
        };
      }

      return map;
    },
  );

  const [oldAssessors, setOldAssessors] = useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {};
      for (const row of itemRows) {
        map[row.code] = String(creditData[row.code]?.oldAssessor || "");
      }
      return map;
    },
  );

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const dirtyReviewsRef = useRef<Set<string>>(new Set());
  const dirtyOldRowsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewsRef = useRef(reviews);
  const oldAssessorsRef = useRef(oldAssessors);
  const flushRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    reviewsRef.current = reviews;
  }, [reviews]);

  useEffect(() => {
    oldAssessorsRef.current = oldAssessors;
  }, [oldAssessors]);

  // Baris dianggap "diajukan" bila ada rincian, AK pengusul, atau bukti.
  const requiredRows = useMemo(() => {
    const set = new Set<string>();

    for (const row of itemRows) {
      const hasEntries = (entriesByRow.get(row.code) || []).length > 0;
      const proposed = getProposerTotal(creditData[row.code]);

      if (hasEntries || proposed > 0 || rowEvidences[row.code]) {
        set.add(row.code);
      }
    }

    return set;
  }, [itemRows, entriesByRow, creditData, rowEvidences]);

  // creditData efektif untuk subtotal hidup (kolom penilai dari state form).
  const liveCreditData = useMemo(() => {
    const live: DupakCreditData = {};

    for (const row of itemRows) {
      const base = creditData[row.code] || {};
      const rowEntries = entriesByRow.get(row.code) || [];

      let newAssessor: string;

      if (rowEntries.length > 0) {
        const total = rowEntries.reduce(
          (sum, entry) =>
            sum +
            getNumberValue(
              reviews[unitKey(row.code, entry.id)]?.assessedCredit || "",
            ),
          0,
        );
        const hasValue = rowEntries.some((entry) =>
          String(
            reviews[unitKey(row.code, entry.id)]?.assessedCredit || "",
          ).trim(),
        );
        newAssessor = hasValue ? String(round2(total)) : "";
      } else {
        newAssessor = reviews[unitKey(row.code, "")]?.assessedCredit || "";
      }

      live[row.code] = {
        oldProposer: base.oldProposer,
        newProposer: base.newProposer,
        oldAssessor: oldAssessors[row.code] || "",
        newAssessor,
      };
    }

    return live;
  }, [itemRows, entriesByRow, creditData, reviews, oldAssessors]);

  const subtotals = useMemo(
    () => computeDupakSubtotals(liveCreditData),
    [liveCreditData],
  );

  const progress = useMemo(() => {
    let total = 0;
    let reviewed = 0;

    for (const row of itemRows) {
      const rowEntries = entriesByRow.get(row.code) || [];
      const units =
        rowEntries.length > 0
          ? rowEntries.map((entry) => unitKey(row.code, entry.id))
          : [unitKey(row.code, "")];

      const isRequired = requiredRows.has(row.code);

      for (const key of units) {
        if (!isRequired) continue;
        total += 1;

        const status = reviews[key]?.status;
        if (status && status !== "DIREVISI_DOSEN") reviewed += 1;
      }
    }

    return {
      total,
      reviewed,
      percent: total > 0 ? Math.round((reviewed / total) * 100) : 100,
    };
  }, [itemRows, entriesByRow, requiredRows, reviews]);

  const grand = subtotals[DUPAK_GRAND_TOTAL_CODE];

  const flushSave = useCallback(async () => {
    if (readOnly) return;

    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }

    const reviewKeys = Array.from(dirtyReviewsRef.current);
    const oldRows = Array.from(dirtyOldRowsRef.current);

    if (reviewKeys.length === 0 && oldRows.length === 0) return;

    // Maksimal 50 item per kiriman; sisanya menyusul otomatis.
    const batchKeys = reviewKeys.slice(0, 50);

    for (const key of batchKeys) dirtyReviewsRef.current.delete(key);
    dirtyOldRowsRef.current.clear();

    if (dirtyReviewsRef.current.size > 0) pendingRef.current = true;

    inFlightRef.current = true;
    setSaveState("saving");
    setSaveError("");

    const items = batchKeys.map((key) => {
      const [rowCode, entryKey] = key.split("::");
      const review = reviewsRef.current[key] || emptyReview();

      return {
        rowCode,
        entryKey: entryKey || "",
        assessedCredit: review.assessedCredit,
        status:
          review.status === "" || review.status === "DIREVISI_DOSEN"
            ? null
            : review.status,
        comment: review.comment,
      };
    });

    const rowOldAssessors: Record<string, string> = {};
    for (const rowCode of oldRows) {
      rowOldAssessors[rowCode] = oldAssessorsRef.current[rowCode] || "";
    }

    try {
      const response = await fetch(
        `/api/pak/assignments/${assignmentId}/reviews`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            ...(oldRows.length > 0 ? { rowOldAssessors } : {}),
          }),
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Gagal menyimpan penilaian.");
      }

      setSaveState("saved");
      setSavedAt(new Date());
    } catch (error) {
      for (const key of batchKeys) dirtyReviewsRef.current.add(key);
      for (const rowCode of oldRows) dirtyOldRowsRef.current.add(rowCode);

      setSaveState("error");
      setSaveError(
        error instanceof Error
          ? error.message
          : "Tidak dapat terhubung ke server.",
      );

      if (retryRef.current) clearTimeout(retryRef.current);
      retryRef.current = setTimeout(() => {
        void flushRef.current?.();
      }, 5000);
    } finally {
      inFlightRef.current = false;

      if (pendingRef.current) {
        pendingRef.current = false;
        void flushRef.current?.();
      }
    }
  }, [assignmentId, readOnly]);

  useEffect(() => {
    flushRef.current = flushSave;
  }, [flushSave]);

  const scheduleSave = useCallback(() => {
    if (readOnly) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void flushRef.current?.();
    }, 800);
  }, [readOnly]);

  const updateReview = useCallback(
    (rowCode: string, entryKey: string, patch: Partial<WorkbenchReview>) => {
      const key = unitKey(rowCode, entryKey);

      setReviews((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || emptyReview()), ...patch },
      }));

      dirtyReviewsRef.current.add(key);
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateOldAssessor = useCallback(
    (rowCode: string, value: string) => {
      setOldAssessors((prev) => ({ ...prev, [rowCode]: value }));
      dirtyOldRowsRef.current.add(rowCode);
      scheduleSave();
    },
    [scheduleSave],
  );

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (
        dirtyReviewsRef.current.size > 0 ||
        dirtyOldRowsRef.current.size > 0 ||
        inFlightRef.current
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
    },
    [],
  );

  return (
    <section className="space-y-4">
      {/* Bilah progres + indikator autosave */}
      <div className="sticky top-2 z-30 rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-56 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-black text-slate-950">
                Kemajuan Penilaian: {progress.reviewed} / {progress.total} item
                diajukan
              </p>
              <p className="text-sm font-black text-slate-500">
                {progress.percent}%
              </p>
            </div>

            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-sky-600 transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm font-black">
            <span className="rounded-2xl bg-slate-100 px-4 py-2 text-slate-700">
              AK Diajukan: {grand?.proposerTotal ?? 0}
            </span>
            <span className="rounded-2xl bg-sky-100 px-4 py-2 text-sky-800">
              AK Dinilai: {grand?.assessorTotal ?? 0}
            </span>
          </div>

          {!readOnly && (
            <div
              aria-live="polite"
              className="flex items-center gap-2 text-sm font-black"
            >
              {saveState === "saving" && (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-slate-600">
                  <Loader2 size={16} className="animate-spin" />
                  Menyimpan…
                </span>
              )}

              {saveState === "saved" && (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-emerald-700">
                  <CloudUpload size={16} />
                  Tersimpan otomatis
                  {savedAt
                    ? ` • ${savedAt.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
                </span>
              )}

              {saveState === "error" && (
                <button
                  type="button"
                  onClick={() => void flushSave()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800"
                >
                  <AlertTriangle size={16} />
                  Belum tersimpan — klik untuk coba lagi
                </button>
              )}

              {saveState === "idle" && (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-slate-400">
                  <CloudUpload size={16} />
                  Perubahan disimpan otomatis
                </span>
              )}
            </div>
          )}
        </div>

        {saveState === "error" && saveError && (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
            {saveError} Sistem akan mencoba menyimpan ulang otomatis.
          </p>
        )}
      </div>

      {/* Tabel penilaian model FORMAT DUPAK — muat satu layar tanpa scroll samping */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="rounded-2xl border border-slate-200">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "38%" }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-950 text-white">
                <th
                  rowSpan={2}
                  className="border border-slate-700 p-1.5 text-[11px]"
                >
                  Unsur/Sub Unsur/Butir Kegiatan
                </th>
                <th
                  colSpan={3}
                  className="border border-slate-700 p-1.5 text-center text-[11px]"
                >
                  Instansi Pengusul
                </th>
                <th
                  colSpan={3}
                  className="border border-slate-700 p-1.5 text-center text-[11px]"
                >
                  Tim Penilai
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-700 p-1.5 text-center text-[11px]"
                >
                  Bukti
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-700 p-1.5 text-center text-[11px]"
                >
                  Status & Komentar Tim Penilai
                </th>
              </tr>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-700 p-1 text-center text-[10px]">
                  Lama
                </th>
                <th className="border border-slate-700 p-1 text-center text-[10px]">
                  Baru
                </th>
                <th className="border border-slate-700 p-1 text-center text-[10px]">
                  Jumlah
                </th>
                <th className="border border-slate-700 p-1 text-center text-[10px]">
                  Lama
                </th>
                <th className="border border-slate-700 p-1 text-center text-[10px]">
                  Baru
                </th>
                <th className="border border-slate-700 p-1 text-center text-[10px]">
                  Jumlah
                </th>
              </tr>
            </thead>

            <tbody>
              {DUPAK_TEMPLATE_ROWS.map((row) => {
                if (row.type === "SECTION") {
                  return (
                    <tr key={row.code} className="bg-sky-50">
                      <td
                        colSpan={9}
                        className="border border-slate-200 p-2 font-black text-sky-900"
                      >
                        {row.label}
                      </td>
                    </tr>
                  );
                }

                if (row.type === "SUBSECTION") {
                  return (
                    <tr key={row.code} className="bg-white">
                      <td
                        colSpan={9}
                        className="border border-slate-200 p-2 font-bold text-slate-600"
                        style={{ paddingLeft: `${8 + row.level * 12}px` }}
                      >
                        {row.label}
                      </td>
                    </tr>
                  );
                }

                if (row.type === "TOTAL") {
                  const subtotal = subtotals[row.code];

                  return (
                    <tr key={row.code} className="bg-slate-100">
                      <td
                        className="border border-slate-200 p-2 font-black text-slate-950"
                        style={{ paddingLeft: `${8 + row.level * 12}px` }}
                      >
                        {row.label}
                      </td>
                      <TotalCell value={subtotal?.oldProposer} />
                      <TotalCell value={subtotal?.newProposer} />
                      <TotalCell value={subtotal?.proposerTotal} />
                      <TotalCell value={subtotal?.oldAssessor} />
                      <TotalCell value={subtotal?.newAssessor} />
                      <TotalCell value={subtotal?.assessorTotal} />
                      <td className="border border-slate-200 p-1 text-center text-[10px] font-bold text-slate-400">
                        —
                      </td>
                      <td className="border border-slate-200 p-1 text-center text-[10px] font-bold text-slate-400">
                        —
                      </td>
                    </tr>
                  );
                }

                const rowEntries = entriesByRow.get(row.code) || [];
                const hasEntries = rowEntries.length > 0;
                const isRequired = requiredRows.has(row.code);
                const live = liveCreditData[row.code];
                const rowEvidence = rowEvidences[row.code] || null;
                const rowReview = reviews[unitKey(row.code, "")];

                return (
                  <RowGroup key={row.code}>
                    <tr className={isRequired ? "bg-white" : "bg-slate-50/50"}>
                      <td
                        className="border border-slate-200 p-2 align-top font-semibold text-slate-700"
                        style={{ paddingLeft: `${8 + row.level * 12}px` }}
                      >
                        {row.label}
                        {!isRequired && (
                          <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                            Tidak diajukan dosen
                          </span>
                        )}
                        {hasEntries && (
                          <span className="mt-0.5 block text-[10px] font-black text-sky-600">
                            {rowEntries.length} rincian — nilai per rincian di
                            bawah
                          </span>
                        )}
                      </td>

                      <StaticCell value={live?.oldProposer} />
                      <StaticCell value={live?.newProposer} />
                      <ComputedCell value={getProposerTotal(live)} />

                      {/* Tim Penilai: Lama */}
                      <td className="border border-slate-200 p-1 align-top">
                        <NumberInput
                          value={oldAssessors[row.code] || ""}
                          disabled={readOnly}
                          onChange={(value) =>
                            updateOldAssessor(row.code, value)
                          }
                        />
                      </td>

                      {/* Tim Penilai: Baru */}
                      {hasEntries ? (
                        <td
                          className="border border-slate-200 bg-sky-50/60 p-1 text-center align-middle font-black text-sky-800"
                          title="Dihitung otomatis dari rincian di bawah"
                        >
                          {live?.newAssessor || "-"}
                          <span className="block text-[9px] font-bold text-sky-500">
                            otomatis
                          </span>
                        </td>
                      ) : (
                        <td className="border border-slate-200 p-1 align-top">
                          <NumberInput
                            value={rowReview?.assessedCredit || ""}
                            disabled={readOnly}
                            onChange={(value) =>
                              updateReview(row.code, "", {
                                assessedCredit: value,
                              })
                            }
                          />
                        </td>
                      )}

                      <ComputedCell
                        value={round2(
                          getNumberValue(live?.oldAssessor) +
                            getNumberValue(live?.newAssessor),
                        )}
                      />

                      {/* Bukti level baris */}
                      <td className="border border-slate-200 p-1 text-center align-middle">
                        {rowEvidence ? (
                          <EvidenceButton url={rowEvidence} />
                        ) : hasEntries ? (
                          <span className="text-[10px] font-bold text-slate-400">
                            per rincian
                          </span>
                        ) : isRequired ? (
                          <span className="text-[10px] font-bold text-amber-600">
                            Belum ada
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">
                            -
                          </span>
                        )}
                      </td>

                      {/* Status + komentar level baris */}
                      {hasEntries ? (
                        <td className="border border-slate-200 p-2 text-center align-middle text-[10px] font-bold text-slate-400">
                          Nilai per rincian
                        </td>
                      ) : (
                        <ReviewCell
                          review={rowReview}
                          readOnly={readOnly}
                          onChange={(patch) =>
                            updateReview(row.code, "", patch)
                          }
                        />
                      )}
                    </tr>

                    {/* Sub-baris rincian */}
                    {rowEntries.map((entry, index) => {
                      const entryReview = reviews[unitKey(row.code, entry.id)];

                      return (
                        <tr key={entry.id} className="bg-sky-50/30">
                          <td
                            className="border border-slate-200 p-2 align-top"
                            style={{
                              paddingLeft: `${8 + (row.level + 1) * 12}px`,
                            }}
                          >
                            <span className="text-[10px] font-black text-slate-400">
                              {index + 1}.
                            </span>{" "}
                            <span className="text-xs font-black text-slate-800">
                              {entry.title}
                            </span>
                            <span className="mt-0.5 block text-[10px] font-bold text-slate-500">
                              {[entry.subCategory, entry.activityYear]
                                .filter(Boolean)
                                .join(" • ") || ""}
                            </span>
                          </td>

                          <td
                            colSpan={3}
                            className="border border-slate-200 p-1 text-center align-middle text-[11px] font-bold text-slate-600"
                          >
                            AK Diajukan:{" "}
                            <span className="font-black text-slate-900">
                              {entry.credit || "0"}
                            </span>
                          </td>

                          <td
                            colSpan={3}
                            className="border border-slate-200 p-1 align-middle"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-black text-slate-500">
                                AK Dinilai:
                              </span>
                              <div className="w-16">
                                <NumberInput
                                  value={entryReview?.assessedCredit || ""}
                                  disabled={readOnly}
                                  onChange={(value) =>
                                    updateReview(row.code, entry.id, {
                                      assessedCredit: value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </td>

                          <td className="border border-slate-200 p-1 text-center align-middle">
                            {entry.evidenceUrl || rowEvidence ? (
                              <EvidenceButton
                                url={(entry.evidenceUrl || rowEvidence)!}
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-amber-600">
                                Belum ada
                              </span>
                            )}
                          </td>

                          <ReviewCell
                            review={entryReview}
                            readOnly={readOnly}
                            onChange={(patch) =>
                              updateReview(row.code, entry.id, patch)
                            }
                          />
                        </tr>
                      );
                    })}
                  </RowGroup>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function StaticCell({ value }: { value?: string }) {
  return (
    <td className="border border-slate-200 bg-slate-50 p-1 text-center align-middle text-xs font-bold text-slate-600">
      {String(value || "").trim() || "-"}
    </td>
  );
}

function ComputedCell({ value }: { value: number }) {
  return (
    <td className="border border-slate-200 bg-slate-50 p-1 text-center align-middle text-xs font-black text-slate-800">
      {value || "-"}
    </td>
  );
}

function TotalCell({ value }: { value?: number }) {
  return (
    <td className="border border-slate-200 p-1.5 text-center text-xs font-black text-slate-950">
      {value || "-"}
    </td>
  );
}

function NumberInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      inputMode="decimal"
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value;
        if (NUMERIC_PATTERN.test(next)) onChange(next);
      }}
      placeholder="0"
      className="w-full rounded-lg border border-slate-200 bg-white px-1 py-1.5 text-center text-xs font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:opacity-60"
    />
  );
}

function EvidenceButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-2 py-1.5 text-[10px] font-black text-white transition hover:bg-sky-800"
    >
      <ExternalLink size={11} />
      Bukti
    </a>
  );
}

function ReviewCell({
  review,
  readOnly,
  onChange,
}: {
  review?: WorkbenchReview;
  readOnly: boolean;
  onChange: (patch: Partial<WorkbenchReview>) => void;
}) {
  const status = review?.status || "";
  const comment = review?.comment || "";
  const commentRequired =
    status === "PERLU_REVISI" || status === "TIDAK_SESUAI";

  return (
    <td className="border border-slate-200 p-1.5 align-top">
      <div className="space-y-1.5">
        {status === "DIREVISI_DOSEN" && (
          <p className="flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700">
            <RefreshCw size={11} />
            Direvisi dosen — nilai ulang
          </p>
        )}

        <select
          value={status === "DIREVISI_DOSEN" ? "" : status}
          disabled={readOnly}
          onChange={(event) =>
            onChange({
              status: event.target.value as WorkbenchReview["status"],
            })
          }
          className={`w-full rounded-lg border px-2 py-1.5 text-xs font-black outline-none transition focus:border-sky-400 disabled:opacity-60 ${
            status === "SESUAI"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : status === "PERLU_REVISI"
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : status === "TIDAK_SESUAI"
                  ? "border-rose-300 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {STATUS_CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>

        <textarea
          value={comment}
          disabled={readOnly}
          onChange={(event) => onChange({ comment: event.target.value })}
          placeholder={
            commentRequired
              ? "Komentar wajib — jelaskan yang perlu diperbaiki dosen..."
              : "Komentar untuk dosen (opsional)..."
          }
          className={`min-h-12 w-full rounded-lg border px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:bg-white disabled:opacity-60 ${
            commentRequired && !comment.trim()
              ? "border-rose-300 bg-rose-50 focus:border-rose-400"
              : "border-slate-200 bg-slate-50 focus:border-sky-400"
          }`}
        />

        {commentRequired && !comment.trim() && (
          <p className="text-[10px] font-black text-rose-600">
            Komentar wajib untuk status ini.
          </p>
        )}
      </div>
    </td>
  );
}
