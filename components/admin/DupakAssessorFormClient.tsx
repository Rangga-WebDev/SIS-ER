/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Save,
} from "lucide-react";
import {
  computeDupakSubtotals,
  DUPAK_TEMPLATE_ROWS,
  getAssessorTotal,
  getNumberValue,
  getProposerTotal,
  type DupakCreditData,
} from "@/lib/dupak-template";

type AssessorValue = {
  oldAssessor: string;
  newAssessor: string;
};

type Props = {
  dupakId: string;
  creditData: DupakCreditData;
  endpoint?: string;
  readOnly?: boolean;
};

export default function DupakAssessorFormClient({
  dupakId,
  creditData,
  endpoint,
  readOnly = false,
}: Props) {
  const router = useRouter();

  const apiEndpoint = endpoint || `/api/admin/dupak/${dupakId}/assessor`;

  const itemRows = useMemo(
    () => DUPAK_TEMPLATE_ROWS.filter((row) => row.type === "ITEM"),
    [],
  );

  const [values, setValues] = useState<Record<string, AssessorValue>>(() => {
    const initial: Record<string, AssessorValue> = {};

    for (const row of itemRows) {
      initial[row.code] = {
        oldAssessor: String(creditData?.[row.code]?.oldAssessor || ""),
        newAssessor: String(creditData?.[row.code]?.newAssessor || ""),
      };
    }

    return initial;
  });

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filledRows = itemRows.filter((row) => {
    const value = values[row.code];

    return (
      getNumberValue(value?.oldAssessor) > 0 ||
      getNumberValue(value?.newAssessor) > 0
    );
  }).length;

  // Subtotal live: nilai pengusul dari data tersimpan + nilai penilai dari input.
  const subtotals = useMemo(() => {
    const merged: DupakCreditData = {};

    for (const row of itemRows) {
      merged[row.code] = {
        oldProposer: creditData?.[row.code]?.oldProposer,
        newProposer: creditData?.[row.code]?.newProposer,
        oldAssessor: values[row.code]?.oldAssessor,
        newAssessor: values[row.code]?.newAssessor,
      };
    }

    return computeDupakSubtotals(merged);
  }, [creditData, itemRows, values]);

  const updateValue = (
    code: string,
    key: keyof AssessorValue,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      [code]: {
        ...current[code],
        [key]: value,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessorData: values,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: result.message || "Gagal menyimpan penilaian.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: result.message || "Penilaian tim penilai berhasil disimpan.",
      });

      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Tidak dapat terhubung ke server.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <ClipboardCheck size={21} />
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-950">
              Penilaian Tim Penilai
            </h3>
            <p className="text-sm font-semibold text-slate-500">
              Isi kolom Lama dan Baru Tim Penilai untuk setiap butir kegiatan.
              {` ${filledRows}/${itemRows.length} baris terisi.`}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={saving || readOnly}
          onClick={save}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-800 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {readOnly ? "Penilaian Terkunci" : "Simpan Penilaian"}
        </button>
      </div>

      {message && (
        <div
          className={`mb-5 flex gap-3 rounded-2xl border p-4 text-sm font-semibold leading-6 ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="bg-slate-950 text-white">
              <th rowSpan={2} className="border border-slate-700 p-3">
                Unsur/Sub Unsur/Butir Kegiatan
              </th>

              <th
                rowSpan={2}
                className="border border-slate-700 p-3 text-center"
              >
                Jumlah Pengusul
              </th>

              <th
                colSpan={3}
                className="border border-slate-700 p-3 text-center"
              >
                Tim Penilai
              </th>
            </tr>

            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-700 p-3 text-center">Lama</th>
              <th className="border border-slate-700 p-3 text-center">Baru</th>
              <th className="border border-slate-700 p-3 text-center">
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
                      colSpan={5}
                      className="border border-slate-200 p-3 font-black text-sky-900"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              if (row.type !== "ITEM") {
                const subtotal = subtotals[row.code];

                return (
                  <tr key={row.code} className="bg-slate-100">
                    <td
                      className="border border-slate-200 p-3 font-black text-slate-950"
                      style={{ paddingLeft: `${12 + row.level * 18}px` }}
                    >
                      {row.label}
                    </td>

                    <td className="border border-slate-200 p-2 text-center font-black text-slate-900">
                      {subtotal?.proposerTotal || "-"}
                    </td>

                    <td className="border border-slate-200 p-2 text-center font-black text-slate-900">
                      {subtotal?.oldAssessor || "-"}
                    </td>

                    <td className="border border-slate-200 p-2 text-center font-black text-slate-900">
                      {subtotal?.newAssessor || "-"}
                    </td>

                    <td className="border border-slate-200 p-2 text-center font-black text-slate-900">
                      {subtotal?.assessorTotal || "-"}
                    </td>
                  </tr>
                );
              }

              const value = values[row.code];
              const proposerTotal = getProposerTotal(creditData?.[row.code]);

              return (
                <tr key={row.code} className="bg-white">
                  <td
                    className="border border-slate-200 p-3 font-semibold text-slate-700"
                    style={{ paddingLeft: `${12 + row.level * 18}px` }}
                  >
                    {row.label}
                  </td>

                  <td className="border border-slate-200 bg-slate-50 p-2 text-center font-black text-slate-800">
                    {proposerTotal || "-"}
                  </td>

                  <td className="border border-slate-200 p-2">
                    <input
                      value={value?.oldAssessor || ""}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateValue(row.code, "oldAssessor", event.target.value)
                      }
                      inputMode="decimal"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-700 outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:opacity-60"
                      placeholder="0"
                    />
                  </td>

                  <td className="border border-slate-200 p-2">
                    <input
                      value={value?.newAssessor || ""}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateValue(row.code, "newAssessor", event.target.value)
                      }
                      inputMode="decimal"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-700 outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:opacity-60"
                      placeholder="0"
                    />
                  </td>

                  <td className="border border-slate-200 bg-slate-50 p-2 text-center font-black text-slate-800">
                    {getAssessorTotal(value) || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
