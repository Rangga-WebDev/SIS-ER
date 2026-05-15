/** @format */

import {
  DUPAK_PERSONAL_FIELDS,
  DUPAK_TEMPLATE_ROWS,
  getAssessorTotal,
  getProposerTotal,
  type DupakCreditData,
  type DupakPersonalData,
} from "@/lib/dupak-template";

type Props = {
  nomor?: string | null;
  instansi?: string | null;
  masaPenilaianStart?: string | Date | null;
  masaPenilaianEnd?: string | Date | null;
  personalData?: DupakPersonalData | null;
  creditData?: DupakCreditData | null;
  supportNotes?: string | null;
};

function formatDate(date?: string | Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function DupakPreview({
  nomor,
  instansi,
  masaPenilaianStart,
  masaPenilaianEnd,
  personalData = {},
  creditData = {},
  supportNotes,
}: Props) {
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
        <table className="w-full min-w-[980px] text-left text-sm">
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

              if (row.type === "SECTION") {
                return (
                  <tr key={row.code} className="bg-sky-50">
                    <td
                      colSpan={7}
                      className="border border-slate-200 p-3 font-black text-sky-900"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={row.code}
                  className={row.type === "TOTAL" ? "bg-slate-100" : "bg-white"}
                >
                  <td
                    className={`border border-slate-200 p-3 ${
                      row.type === "TOTAL"
                        ? "font-black text-slate-950"
                        : "font-semibold text-slate-700"
                    }`}
                    style={{ paddingLeft: `${12 + row.level * 18}px` }}
                  >
                    {row.label}
                  </td>
                  <Cell value={value?.oldProposer} />
                  <Cell value={value?.newProposer} />
                  <Cell value={String(getProposerTotal(value) || "")} bold />
                  <Cell value={value?.oldAssessor} />
                  <Cell value={value?.newAssessor} />
                  <Cell value={String(getAssessorTotal(value) || "")} bold />
                </tr>
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
