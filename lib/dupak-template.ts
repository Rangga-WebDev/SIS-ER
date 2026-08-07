/** @format */

export type DupakRowType = "SECTION" | "SUBSECTION" | "ITEM" | "TOTAL";

export type DupakTemplateRow = {
  code: string;
  type: DupakRowType;
  label: string;
  level: number;
};

export type DupakCreditValue = {
  oldProposer?: string;
  newProposer?: string;
  oldAssessor?: string;
  newAssessor?: string;
};

export type DupakCreditData = Record<string, DupakCreditValue>;

export type DupakPersonalData = {
  nama?: string;
  nidnOrNuptk?: string;
  nomorSeriKarpeg?: string;
  tempatTanggalLahir?: string;
  jenisKelamin?: string;
  pendidikanDiperhitungkan?: string;
  jabatanAkademikTmt?: string;
  masaKerjaGolonganLama?: string;
  masaKerjaGolonganBaru?: string;
  unitKerja?: string;
};

export const DUPAK_PERSONAL_FIELDS: {
  key: keyof DupakPersonalData;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "nama",
    label: "Nama",
    placeholder: "Nama lengkap dosen",
  },
  {
    key: "nidnOrNuptk",
    label: "NIDN/NUPTK",
    placeholder: "NIDN atau NUPTK",
  },
  {
    key: "nomorSeriKarpeg",
    label: "Nomor Seri Kartu Pegawai",
    placeholder: "Nomor seri kartu pegawai",
  },
  {
    key: "tempatTanggalLahir",
    label: "Tempat dan Tanggal Lahir",
    placeholder: "Contoh: Makassar, 01 Januari 1980",
  },
  {
    key: "jenisKelamin",
    label: "Jenis Kelamin",
    placeholder: "Laki-laki / Perempuan",
  },
  {
    key: "pendidikanDiperhitungkan",
    label: "Pendidikan yang Diperhitungkan Angka Kreditnya",
    placeholder: "Contoh: S2 / S3",
  },
  {
    key: "jabatanAkademikTmt",
    label: "Jabatan Akademik Dosen/TMT",
    placeholder: "Contoh: Lektor / 01-02-2023",
  },
  {
    key: "masaKerjaGolonganLama",
    label: "Masa Kerja Golongan Lama",
    placeholder: "Contoh: 3 tahun 2 bulan",
  },
  {
    key: "masaKerjaGolonganBaru",
    label: "Masa Kerja Golongan Baru",
    placeholder: "Contoh: 4 tahun 0 bulan",
  },
  {
    key: "unitKerja",
    label: "Unit Kerja",
    placeholder: "Contoh: Fakultas Keguruan dan Ilmu Pendidikan",
  },
];

export const DUPAK_TEMPLATE_ROWS: DupakTemplateRow[] = [
  {
    code: "PENDIDIKAN",
    type: "SECTION",
    label: "PENDIDIKAN",
    level: 0,
  },
  {
    code: "PENDIDIKAN_FORMAL",
    type: "SUBSECTION",
    label: "A. Pendidikan formal",
    level: 1,
  },
  {
    code: "DOKTOR_S3",
    type: "ITEM",
    label: "Doktor (S3)",
    level: 2,
  },
  {
    code: "MAGISTER_S2",
    type: "ITEM",
    label: "Magister (S2)",
    level: 2,
  },
  {
    code: "PRAJABATAN",
    type: "SUBSECTION",
    label: "B. Pendidikan dan pelatihan Prajabatan",
    level: 1,
  },
  {
    code: "PRAJABATAN_GOL_III",
    type: "ITEM",
    label: "Pendidikan dan pelatihan Prajabatan golongan III",
    level: 2,
  },
  {
    code: "JUMLAH_UNSUR_PENDIDIKAN",
    type: "TOTAL",
    label: "JUMLAH UNSUR PENDIDIKAN",
    level: 1,
  },

  {
    code: "PELAKSANAAN_PENDIDIKAN",
    type: "SECTION",
    label: "PELAKSANAAN PENDIDIKAN",
    level: 0,
  },
  {
    code: "PERKULIAHAN_TUTORIAL",
    type: "ITEM",
    label: "Melaksanakan perkuliahan/tutorial dan membimbing",
    level: 1,
  },
  {
    code: "MEMBIMBING_SEMINAR",
    type: "ITEM",
    label: "Membimbing seminar",
    level: 1,
  },
  {
    code: "MEMBIMBING_KKN_PKN",
    type: "ITEM",
    label:
      "Membimbing kuliah kerja nyata/praktek kerja nyata/praktek kerja lapangan",
    level: 1,
  },
  {
    code: "PEMBIMBING_UTAMA_DISERTASI",
    type: "ITEM",
    label: "Pembimbing utama disertasi",
    level: 2,
  },
  {
    code: "PEMBIMBING_UTAMA_THESIS",
    type: "ITEM",
    label: "Pembimbing utama thesis",
    level: 2,
  },
  {
    code: "PEMBIMBING_UTAMA_SKRIPSI",
    type: "ITEM",
    label: "Pembimbing utama skripsi",
    level: 2,
  },
  {
    code: "PEMBIMBING_PENDAMPING_DISERTASI",
    type: "ITEM",
    label: "Pembimbing pendamping disertasi",
    level: 2,
  },
  {
    code: "PEMBIMBING_PENDAMPING_THESIS",
    type: "ITEM",
    label: "Pembimbing pendamping thesis",
    level: 2,
  },
  {
    code: "PEMBIMBING_PENDAMPING_SKRIPSI",
    type: "ITEM",
    label: "Pembimbing pendamping skripsi",
    level: 2,
  },
  {
    code: "KETUA_PENGUJI",
    type: "ITEM",
    label: "Ketua penguji pada ujian akhir",
    level: 1,
  },
  {
    code: "ANGGOTA_PENGUJI",
    type: "ITEM",
    label: "Anggota penguji pada ujian akhir",
    level: 1,
  },
  {
    code: "MEMBINA_KEGIATAN_MAHASISWA",
    type: "ITEM",
    label: "Membina kegiatan mahasiswa",
    level: 1,
  },
  {
    code: "MENGEMBANGKAN_PROGRAM_KULIAH",
    type: "ITEM",
    label: "Mengembangkan program kuliah",
    level: 1,
  },
  {
    code: "BUKU_AJAR",
    type: "ITEM",
    label: "Mengembangkan bahan pengajaran berupa buku ajar",
    level: 1,
  },
  {
    code: "DIKTAT_MODUL_PRAKTIKUM",
    type: "ITEM",
    label:
      "Diktat, modul, petunjuk praktikum, model, atau alat bantu pengajaran",
    level: 1,
  },
  {
    code: "ORASI_ILMIAH",
    type: "ITEM",
    label: "Menyampaikan orasi ilmiah",
    level: 1,
  },
  {
    code: "JABATAN_PIMPINAN_PT",
    type: "ITEM",
    label: "Menduduki jabatan pimpinan perguruan tinggi",
    level: 1,
  },
  {
    code: "PEMBIMBING_DOSEN_RENDAH",
    type: "ITEM",
    label: "Membimbing akademik dosen yang lebih rendah jabatannya",
    level: 1,
  },
  {
    code: "DETASERING_PENCANGKOKAN",
    type: "ITEM",
    label: "Melaksanakan kegiatan detasering dan pencangkokan",
    level: 1,
  },
  {
    code: "PENGEMBANGAN_DIRI",
    type: "ITEM",
    label: "Melakukan kegiatan pengembangan diri untuk meningkatkan kompetensi",
    level: 1,
  },
  {
    code: "JUMLAH_UNSUR_PENGAJARAN",
    type: "TOTAL",
    label: "JUMLAH UNSUR PENGAJARAN",
    level: 1,
  },

  {
    code: "PELAKSANAAN_PENELITIAN",
    type: "SECTION",
    label: "PELAKSANAAN PENELITIAN",
    level: 0,
  },
  {
    code: "MONOGRAF",
    type: "ITEM",
    label: "Hasil penelitian atau pemikiran dalam bentuk monograf",
    level: 1,
  },
  {
    code: "BUKU_REFERENSI",
    type: "ITEM",
    label: "Hasil penelitian atau pemikiran dalam bentuk buku referensi",
    level: 1,
  },
  {
    code: "JURNAL_INTERNASIONAL",
    type: "ITEM",
    label: "Jurnal ilmiah internasional",
    level: 1,
  },
  {
    code: "JURNAL_NASIONAL_TERAKREDITASI",
    type: "ITEM",
    label: "Jurnal ilmiah nasional terakreditasi",
    level: 1,
  },
  {
    code: "JURNAL_NASIONAL_TIDAK_TERAKREDITASI",
    type: "ITEM",
    label: "Jurnal ilmiah nasional tidak terakreditasi",
    level: 1,
  },
  {
    code: "SEMINAR_INTERNASIONAL",
    type: "ITEM",
    label: "Makalah disajikan pada seminar internasional",
    level: 1,
  },
  {
    code: "SEMINAR_NASIONAL",
    type: "ITEM",
    label: "Makalah disajikan pada seminar nasional",
    level: 1,
  },
  {
    code: "POSTER_INTERNASIONAL",
    type: "ITEM",
    label: "Poster tingkat internasional",
    level: 1,
  },
  {
    code: "POSTER_NASIONAL",
    type: "ITEM",
    label: "Poster tingkat nasional",
    level: 1,
  },
  {
    code: "KORAN_MAJALAH_POPULER",
    type: "ITEM",
    label: "Hasil penelitian dalam koran/majalah populer atau umum",
    level: 1,
  },
  {
    code: "PENELITIAN_TIDAK_DIPUBLIKASIKAN",
    type: "ITEM",
    label: "Hasil penelitian atau pemikiran yang tidak dipublikasikan",
    level: 1,
  },
  {
    code: "MENERJEMAHKAN_BUKU_ILMIAH",
    type: "ITEM",
    label: "Menerjemahkan atau menyadur buku ilmiah",
    level: 1,
  },
  {
    code: "MENYUNTING_KARYA_ILMIAH",
    type: "ITEM",
    label: "Mengedit atau menyunting karya ilmiah",
    level: 1,
  },
  {
    code: "PATEN_INTERNASIONAL",
    type: "ITEM",
    label: "Karya teknologi yang dipatenkan tingkat internasional",
    level: 1,
  },
  {
    code: "PATEN_NASIONAL",
    type: "ITEM",
    label: "Karya teknologi yang dipatenkan tingkat nasional",
    level: 1,
  },
  {
    code: "KARYA_TEKNOLOGI_INTERNASIONAL",
    type: "ITEM",
    label:
      "Rancangan/karya teknologi atau seni monumental tingkat internasional",
    level: 1,
  },
  {
    code: "KARYA_TEKNOLOGI_NASIONAL",
    type: "ITEM",
    label: "Rancangan/karya teknologi atau seni monumental tingkat nasional",
    level: 1,
  },
  {
    code: "KARYA_TEKNOLOGI_LOKAL",
    type: "ITEM",
    label: "Rancangan/karya teknologi atau seni monumental tingkat lokal",
    level: 1,
  },
  {
    code: "JUMLAH_UNSUR_PENELITIAN",
    type: "TOTAL",
    label: "JUMLAH UNSUR PENELITIAN",
    level: 1,
  },

  {
    code: "PENGABDIAN",
    type: "SECTION",
    label: "PELAKSANAAN PENGABDIAN KEPADA MASYARAKAT",
    level: 0,
  },
  {
    code: "PIMPINAN_LEMBAGA_PENGABDIAN",
    type: "ITEM",
    label:
      "Menduduki jabatan pimpinan pada lembaga pengabdian kepada masyarakat",
    level: 1,
  },
  {
    code: "PENGEMBANGAN_HASIL_PENDIDIKAN",
    type: "ITEM",
    label:
      "Melaksanakan pengembangan hasil pendidikan dan penelitian untuk masyarakat",
    level: 1,
  },
  {
    code: "PELATIHAN_TERPROGRAM_INTERNASIONAL",
    type: "ITEM",
    label: "Memberi latihan/penyuluhan terprogram tingkat internasional",
    level: 1,
  },
  {
    code: "PELATIHAN_TERPROGRAM_NASIONAL",
    type: "ITEM",
    label: "Memberi latihan/penyuluhan terprogram tingkat nasional",
    level: 1,
  },
  {
    code: "PELATIHAN_TERPROGRAM_LOKAL",
    type: "ITEM",
    label: "Memberi latihan/penyuluhan terprogram tingkat lokal",
    level: 1,
  },
  {
    code: "PELATIHAN_INSIDENTAL",
    type: "ITEM",
    label: "Memberi latihan/penyuluhan/ceramah secara insidental",
    level: 1,
  },
  {
    code: "PELAYANAN_MASYARAKAT_KEAHLIAN",
    type: "ITEM",
    label: "Memberi pelayanan kepada masyarakat berdasarkan bidang keahlian",
    level: 1,
  },
  {
    code: "PELAYANAN_MASYARAKAT_PENUGASAN",
    type: "ITEM",
    label: "Memberi pelayanan kepada masyarakat berdasarkan penugasan lembaga",
    level: 1,
  },
  {
    code: "PELAYANAN_MASYARAKAT_JABATAN",
    type: "ITEM",
    label:
      "Memberi pelayanan kepada masyarakat berdasarkan fungsi atau jabatan",
    level: 1,
  },
  {
    code: "KARYA_PENGABDIAN",
    type: "ITEM",
    label: "Membuat atau menulis karya pengabdian kepada masyarakat",
    level: 1,
  },
  {
    code: "JUMLAH_UNSUR_PENGABDIAN",
    type: "TOTAL",
    label: "JUMLAH UNSUR PENGABDIAN",
    level: 1,
  },

  {
    code: "PENUNJANG",
    type: "SECTION",
    label: "PENUNJANG TUGAS DOSEN",
    level: 0,
  },
  {
    code: "PANITIA_PT_KETUA",
    type: "ITEM",
    label: "Menjadi ketua/wakil ketua panitia atau badan pada perguruan tinggi",
    level: 1,
  },
  {
    code: "PANITIA_PT_ANGGOTA",
    type: "ITEM",
    label: "Menjadi anggota panitia atau badan pada perguruan tinggi",
    level: 1,
  },
  {
    code: "PANITIA_PEMERINTAH_PUSAT",
    type: "ITEM",
    label:
      "Menjadi anggota panitia/badan pada lembaga pemerintah tingkat pusat",
    level: 1,
  },
  {
    code: "PANITIA_PEMERINTAH_DAERAH",
    type: "ITEM",
    label:
      "Menjadi anggota panitia/badan pada lembaga pemerintah tingkat daerah",
    level: 1,
  },
  {
    code: "ORGANISASI_PROFESI_INTERNASIONAL",
    type: "ITEM",
    label: "Menjadi anggota organisasi profesi tingkat internasional",
    level: 1,
  },
  {
    code: "ORGANISASI_PROFESI_NASIONAL",
    type: "ITEM",
    label: "Menjadi anggota organisasi profesi tingkat nasional",
    level: 1,
  },
  {
    code: "MEWAKILI_PT",
    type: "ITEM",
    label: "Mewakili perguruan tinggi atau lembaga pemerintah",
    level: 1,
  },
  {
    code: "DELEGASI_NASIONAL",
    type: "ITEM",
    label: "Menjadi anggota delegasi nasional ke pertemuan internasional",
    level: 1,
  },
  {
    code: "PENGELOLAAN_JURNAL",
    type: "ITEM",
    label: "Berperan aktif dalam pengelolaan jurnal ilmiah",
    level: 1,
  },
  {
    code: "PERTEMUAN_ILMIAH",
    type: "ITEM",
    label: "Berperan aktif dalam pertemuan ilmiah",
    level: 1,
  },
  {
    code: "PENGHARGAAN_SATYA_LANCANA",
    type: "ITEM",
    label: "Mendapat penghargaan/tanda jasa Satya Lancana Karya Satya",
    level: 1,
  },
  {
    code: "PENGHARGAAN_LAINNYA",
    type: "ITEM",
    label: "Memperoleh penghargaan lainnya",
    level: 1,
  },
  {
    code: "BUKU_PELAJARAN_SLTA_KE_BAWAH",
    type: "ITEM",
    label: "Menulis buku pelajaran SLTA ke bawah yang diterbitkan",
    level: 1,
  },
  {
    code: "PRESTASI_OLAHRAGA_HUMANIORA",
    type: "ITEM",
    label: "Mempunyai prestasi di bidang olahraga atau humaniora",
    level: 1,
  },
  {
    code: "TIM_PENILAI_JABATAN",
    type: "ITEM",
    label: "Menjadi anggota tim penilaian jabatan akademik dosen",
    level: 1,
  },
  {
    code: "JUMLAH_UNSUR_PENUNJANG",
    type: "TOTAL",
    label: "JUMLAH UNSUR PENUNJANG",
    level: 1,
  },
  {
    code: "JUMLAH_UTAMA_DAN_PENUNJANG",
    type: "TOTAL",
    label: "JUMLAH UNSUR UTAMA DAN PENUNJANG",
    level: 0,
  },
];

export function getNumberValue(value?: string) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getProposerTotal(value?: DupakCreditValue) {
  return (
    getNumberValue(value?.oldProposer) + getNumberValue(value?.newProposer)
  );
}

export function getAssessorTotal(value?: DupakCreditValue) {
  return (
    getNumberValue(value?.oldAssessor) + getNumberValue(value?.newAssessor)
  );
}

export type DupakSubtotal = {
  oldProposer: number;
  newProposer: number;
  proposerTotal: number;
  oldAssessor: number;
  newAssessor: number;
  assessorTotal: number;
};

export const DUPAK_GRAND_TOTAL_CODE = "JUMLAH_UTAMA_DAN_PENUNJANG";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// Baris TOTAL menjumlah seluruh ITEM pada seksinya; baris grand total
// menjumlah seluruh ITEM di semua seksi.
export function computeDupakSubtotals(
  creditData?: DupakCreditData | null,
): Record<string, DupakSubtotal> {
  const data = creditData || {};
  const result: Record<string, DupakSubtotal> = {};

  const zero = (): DupakSubtotal => ({
    oldProposer: 0,
    newProposer: 0,
    proposerTotal: 0,
    oldAssessor: 0,
    newAssessor: 0,
    assessorTotal: 0,
  });

  let section = zero();
  const grand = zero();

  const accumulate = (target: DupakSubtotal, value?: DupakCreditValue) => {
    target.oldProposer += getNumberValue(value?.oldProposer);
    target.newProposer += getNumberValue(value?.newProposer);
    target.oldAssessor += getNumberValue(value?.oldAssessor);
    target.newAssessor += getNumberValue(value?.newAssessor);
  };

  const finalize = (target: DupakSubtotal): DupakSubtotal => ({
    oldProposer: round2(target.oldProposer),
    newProposer: round2(target.newProposer),
    proposerTotal: round2(target.oldProposer + target.newProposer),
    oldAssessor: round2(target.oldAssessor),
    newAssessor: round2(target.newAssessor),
    assessorTotal: round2(target.oldAssessor + target.newAssessor),
  });

  for (const row of DUPAK_TEMPLATE_ROWS) {
    if (row.type === "ITEM") {
      const value = data[row.code];
      accumulate(section, value);
      accumulate(grand, value);
      continue;
    }

    if (row.type === "TOTAL") {
      if (row.code === DUPAK_GRAND_TOTAL_CODE) {
        result[row.code] = finalize(grand);
      } else {
        result[row.code] = finalize(section);
        section = zero();
      }
    }
  }

  return result;
}
