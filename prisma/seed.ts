/** @format */

import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];

type RequirementSeed = {
  code: string;
  name: string;
  description?: string;
  inputType?: "FILE" | "URL" | "FILE_AND_URL" | "METADATA_ONLY";
  order: number;
  isRequired?: boolean;
  isYearly?: boolean;
  yearStart?: number | null;
  yearEnd?: number | null;
  requiresLetterNumber?: boolean;
  requiresLetterDate?: boolean;
  requiresExternalUrl?: boolean;
  helperText?: string | null;
  sampleUrl?: string | null;
};

type CategorySeed = {
  code: string;
  name: string;
  description?: string;
  order: number;
  requirements: RequirementSeed[];
};

const documentCategories: CategorySeed[] = [
  {
    code: "PROFIL_KEPAKARAN",
    name: "Profil dan Kepakaran",
    description:
      "Dokumen dan metadata yang berkaitan dengan identitas akademik, kepakaran, dan profil keilmuan dosen.",
    order: 1,
    requirements: [
      {
        code: "THESIS_DISERTASI",
        name: "Disertasi/Thesis Pendidikan Tertinggi",
        description:
          "Halaman judul, lembar pengesahan, dan abstrak disertasi/thesis dalam satu dokumen.",
        inputType: "FILE",
        order: 1,
        isRequired: true,
        helperText:
          "Lampirkan halaman judul, lembar pengesahan, dan abstrak disertasi/thesis dalam satu dokumen.",
      },
      {
        code: "MATA_KULIAH_DIAMPU",
        name: "Mata Kuliah yang Diampu",
        description:
          "Metadata mata kuliah yang paling merepresentasikan kepakaran dosen.",
        inputType: "METADATA_ONLY",
        order: 2,
        isRequired: true,
        helperText:
          "Data ini dapat digunakan sebagai pendukung pemetaan kepakaran dosen.",
      },
      {
        code: "RANTING_ILMU_KEPAKARAN",
        name: "Ranting Ilmu atau Kepakaran",
        description:
          "Ranting ilmu atau kepakaran sesuai keputusan berita acara senat.",
        inputType: "METADATA_ONLY",
        order: 3,
        isRequired: true,
        helperText:
          "Tuliskan ranting ilmu secara lengkap dan sesuai dengan dokumen pendukung.",
      },
    ],
  },
  {
    code: "ANGKA_KREDIT",
    name: "Angka Kredit",
    description:
      "Dokumen SKP tahunan, angka kredit penyetaraan, angka kredit prestasi, dan AK kumulatif.",
    order: 2,
    requirements: [
      {
        code: "SKP_TAHUNAN",
        name: "Dokumentasi SKP Tahunan",
        description:
          "Predikat SKP dan bukti dokumen SKP tahunan dari tahun 2023 sampai tahun berjalan.",
        inputType: "FILE",
        order: 1,
        isRequired: true,
        isYearly: true,
        yearStart: 2023,
        yearEnd: null,
        helperText:
          "Dosen memilih tahun SKP, mengisi predikat, lalu mengunggah file SKP tahun tersebut.",
      },
      {
        code: "AK_PENYETARAAN_SKP",
        name: "AK Penyetaraan, Pendidikan, dan SKP",
        description:
          "Dokumen pendukung angka kredit selain prestasi, termasuk penyetaraan dan konversi SKP.",
        inputType: "FILE",
        order: 2,
        isRequired: true,
        helperText:
          "Unggah dokumen pendukung AK penyetaraan atau konversi SKP jika tersedia.",
      },
      {
        code: "AK_PRESTASI_PENELITIAN",
        name: "AK Prestasi Penelitian dan Karya",
        description:
          "Dokumen angka kredit prestasi dari publikasi, penelitian, karya ilmiah, atau karya inovatif.",
        inputType: "FILE",
        order: 3,
        isRequired: true,
        helperText:
          "Unggah bukti karya ilmiah, publikasi, atau dokumen pendukung AK prestasi.",
      },
      {
        code: "AK_KUMULATIF",
        name: "Dokumen AK Kumulatif",
        description:
          "Dokumen perhitungan angka kredit kumulatif yang digunakan untuk proses validasi.",
        inputType: "FILE",
        order: 4,
        isRequired: true,
        helperText:
          "Unggah dokumen AK kumulatif dalam format PDF, JPG, JPEG, atau PNG.",
      },
    ],
  },
  {
    code: "IKD",
    name: "IKD",
    description:
      "Indikator Kinerja Dosen yang memuat bukti kinerja bidang pendidikan, penelitian, dan pengabdian kepada masyarakat.",
    order: 3,
    requirements: [
      {
        code: "IKD_PENDIDIKAN",
        name: "IKD Pendidikan",
        description:
          "Dokumen bukti Indikator Kinerja Dosen pada bidang pendidikan, pembelajaran, pengajaran, dan pengembangan akademik.",
        inputType: "FILE",
        order: 1,
        isRequired: true,
        helperText:
          "Unggah dokumen IKD bidang pendidikan dalam format PDF, JPG, JPEG, atau PNG.",
      },
      {
        code: "IKD_PENELITIAN_PENGMAS",
        name: "IKD Penelitian dan Pengmas",
        description:
          "Dokumen bukti Indikator Kinerja Dosen pada bidang penelitian dan pengabdian kepada masyarakat.",
        inputType: "FILE",
        order: 2,
        isRequired: true,
        helperText:
          "Unggah dokumen IKD bidang penelitian dan pengabdian kepada masyarakat dalam format PDF, JPG, JPEG, atau PNG.",
      },
    ],
  },
  {
    code: "SYARAT_KHUSUS",
    name: "Syarat Khusus",
    description:
      "Dokumen syarat khusus seperti tautan profil akademik, pakta integritas, dan lampiran karya ilmiah.",
    order: 4,
    requirements: [
      {
        code: "SINTA_PROFILE",
        name: "Tautan Profil Akun SINTA",
        description: "Tautan profil SINTA dosen.",
        inputType: "URL",
        order: 1,
        isRequired: true,
        requiresExternalUrl: true,
        helperText: "Masukkan URL profil SINTA yang aktif dan dapat diakses.",
      },
      {
        code: "GOOGLE_SCHOLAR_PROFILE",
        name: "Tautan Profil Google Scholar",
        description: "Tautan profil Google Scholar dosen.",
        inputType: "URL",
        order: 2,
        isRequired: true,
        requiresExternalUrl: true,
        helperText:
          "Masukkan URL profil Google Scholar yang aktif dan dapat diakses.",
      },
      {
        code: "SCOPUS_PROFILE",
        name: "Tautan Profil Scopus",
        description: "Tautan profil Scopus dosen jika tersedia.",
        inputType: "URL",
        order: 3,
        isRequired: false,
        requiresExternalUrl: true,
        helperText:
          "Masukkan URL profil Scopus jika tersedia. Jika belum ada, dapat dikosongkan.",
      },
      {
        code: "PAKTA_INTEGRITAS_KARYA_ILMIAH",
        name: "Surat Pernyataan Pakta Integritas Karya Ilmiah",
        description:
          "Surat pernyataan pakta integritas karya ilmiah dosen sesuai contoh dokumen.",
        inputType: "FILE",
        order: 4,
        isRequired: true,
        helperText:
          "Unggah surat pernyataan pakta integritas karya ilmiah yang telah ditandatangani.",
      },
      {
        code: "LAMPIRAN_KARYA_ILMIAH",
        name: "Lampiran Karya Ilmiah",
        description:
          "Lampiran karya ilmiah yang menjadi bukti pendukung pengajuan.",
        inputType: "FILE",
        order: 5,
        isRequired: true,
        helperText:
          "Unggah lampiran karya ilmiah dalam format PDF, JPG, JPEG, atau PNG.",
      },
      {
        code: "DOKUMEN_ARTIKEL",
        name: "Dokumen Artikel",
        description:
          "Dokumen artikel ilmiah yang menjadi bukti pendukung karya ilmiah dosen.",
        inputType: "FILE",
        order: 6,
        isRequired: true,
        helperText:
          "Unggah dokumen artikel dalam format PDF, JPG, JPEG, atau PNG dengan ukuran maksimal 5 MB.",
      },
      {
        code: "DOKUMEN_KORESPONDENSI",
        name: "Dokumen Korespondensi",
        description:
          "Dokumen korespondensi artikel, seperti bukti submit, review, accepted, atau komunikasi dengan pengelola jurnal.",
        inputType: "FILE",
        order: 7,
        isRequired: true,
        helperText:
          "Unggah dokumen korespondensi artikel dalam format PDF, JPG, JPEG, atau PNG dengan ukuran maksimal 5 MB.",
      },
      {
        code: "DOKUMEN_UJI_KEMIRIPAN",
        name: "Dokumen Uji Kemiripan",
        description:
          "Dokumen hasil uji kemiripan atau similarity check artikel ilmiah.",
        inputType: "FILE",
        order: 8,
        isRequired: true,
        helperText:
          "Unggah dokumen uji kemiripan dalam format PDF, JPG, JPEG, atau PNG dengan ukuran maksimal 5 MB.",
      },
    ],
  },
  {
    code: "DOKUMEN_REKOMENDASI",
    name: "Dokumen Rekomendasi",
    description:
      "Dokumen rekomendasi kelembagaan yang dibutuhkan dalam proses pengajuan kenaikan jabatan.",
    order: 5,
    requirements: [
      {
        code: "PENGANTAR_PT_LLDIKTI_KL",
        name: "Pengantar PT/LLDIKTI/KL",
        description:
          "Dokumen pengantar yang ditandatangani oleh Rektor/Direktur/Ketua Sekolah Tinggi/Kepala LLDIKTI/Pimpinan Mitra KL.",
        inputType: "FILE",
        order: 1,
        isRequired: true,
        requiresLetterNumber: true,
        requiresLetterDate: true,
        helperText:
          "Unggah dokumen pengantar dan isi nomor surat serta tanggal surat sesuai dokumen.",
      },
      {
        code: "BERITA_ACARA_SENAT",
        name: "Berita Acara Senat",
        description:
          "Berita acara senat yang mencantumkan jumlah keseluruhan anggota senat dan lampiran daftar hadir.",
        inputType: "FILE",
        order: 2,
        isRequired: true,
        requiresLetterNumber: false,
        requiresLetterDate: false,
        helperText:
          "Unggah berita acara senat beserta lampiran daftar hadir jika tersedia.",
      },
      {
        code: "BERITA_ACARA_KOMITE_INTEGRITAS",
        name: "Berita Acara Komite Integritas Akademik",
        description:
          "Dokumen berita acara komite integritas akademik yang ditandatangani minimal oleh ketua tim komite.",
        inputType: "FILE",
        order: 3,
        isRequired: true,
        requiresLetterNumber: true,
        requiresLetterDate: true,
        helperText:
          "Unggah berita acara komite integritas akademik dan isi metadata surat.",
      },
      {
        code: "SURAT_PERNYATAAN_PEMIMPIN",
        name: "Surat Pernyataan Pemimpin PTN/PTS/PTKL",
        description:
          "Surat pernyataan pemimpin perguruan tinggi atau lembaga terkait sebagai dokumen rekomendasi.",
        inputType: "FILE",
        order: 4,
        isRequired: true,
        requiresLetterNumber: true,
        requiresLetterDate: true,
        helperText:
          "Unggah surat pernyataan pemimpin dan isi nomor serta tanggal surat.",
      },
    ],
  },
];

async function seedAdminIfConfigured() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "Admin seed dilewati. SEED_ADMIN_EMAIL atau SEED_ADMIN_PASSWORD belum diatur.",
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: {
      email: email.toLowerCase(),
    },
    update: {
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Admin aktif: ${email.toLowerCase()}`);
}

const assessorAdminEmails = [
  "irwan.akib@unismuh.ac.id",
  "ratna@unismuh.ac.id",
  "agustan@unismuh.ac.id",
  "akhmad.pide@unismuh.ac.id",
  "syafiuddin_saleh@unismuh.ac.id",
  "munirah@unismuh.ac.id",
  "darwispanguriseng@unismuh.ac.id",
  "nursalam.h@unismuh.ac.id",
  "sukri.syamsuri@uin-alauddin.ac.id",
  "zulkiflisjamsir@unismuh.ac.id",
];

async function seedAssessorAdmins() {
  for (const rawEmail of assessorAdminEmails) {
    const email = rawEmail.toLowerCase();
    const accountName = email.split("@")[0];
    const password = `${accountName}1234!`;

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.upsert({
      where: {
        email,
      },
      update: {
        role: "TIM_PAK",
        status: "ACTIVE",
      },
      create: {
        email,
        passwordHash,
        role: "TIM_PAK",
        status: "ACTIVE",
      },
    });

    console.log(`Akun Tim PAK aktif: ${email}`);
  }
}

async function seedDocumentCategories() {
  for (const category of documentCategories) {
    const savedCategory = await prisma.documentCategory.upsert({
      where: {
        code: category.code,
      },
      update: {
        name: category.name,
        description: category.description,
        order: category.order,
      },
      create: {
        code: category.code,
        name: category.name,
        description: category.description,
        order: category.order,
      },
    });

    for (const requirement of category.requirements) {
      await prisma.documentRequirement.upsert({
        where: {
          code: requirement.code,
        },
        update: {
          name: requirement.name,
          description: requirement.description,
          audience: "DOSEN",
          inputType: requirement.inputType || "FILE",
          isRequired: requirement.isRequired ?? true,
          maxSizeMb: 5,
          allowedMimeTypes,
          order: requirement.order,
          isYearly: requirement.isYearly ?? false,
          yearStart: requirement.yearStart ?? null,
          yearEnd: requirement.yearEnd ?? null,
          requiresLetterNumber: requirement.requiresLetterNumber ?? false,
          requiresLetterDate: requirement.requiresLetterDate ?? false,
          requiresExternalUrl: requirement.requiresExternalUrl ?? false,
          helperText: requirement.helperText ?? null,
          sampleUrl: requirement.sampleUrl ?? null,
          categoryId: savedCategory.id,
        },
        create: {
          code: requirement.code,
          name: requirement.name,
          description: requirement.description,
          audience: "DOSEN",
          inputType: requirement.inputType || "FILE",
          isRequired: requirement.isRequired ?? true,
          maxSizeMb: 5,
          allowedMimeTypes,
          order: requirement.order,
          isYearly: requirement.isYearly ?? false,
          yearStart: requirement.yearStart ?? null,
          yearEnd: requirement.yearEnd ?? null,
          requiresLetterNumber: requirement.requiresLetterNumber ?? false,
          requiresLetterDate: requirement.requiresLetterDate ?? false,
          requiresExternalUrl: requirement.requiresExternalUrl ?? false,
          helperText: requirement.helperText ?? null,
          sampleUrl: requirement.sampleUrl ?? null,
          categoryId: savedCategory.id,
        },
      });
    }

    console.log(`Kategori seeded: ${category.name}`);
  }
}

async function main() {
  await seedAdminIfConfigured();
  await seedAssessorAdmins();
  await seedDocumentCategories();
}

main()
  .then(async () => {
    console.log("Seed selesai.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed gagal:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
