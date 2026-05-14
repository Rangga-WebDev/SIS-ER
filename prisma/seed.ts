/** @format */

import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const adminEmail = "admin@kampus.ac.id";
  const adminPassword = "Admin123!";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  /**
   * Hapus requirement lama yang tidak lagi dipakai.
   * Ini aman untuk tahap development.
   */
  await prisma.documentRequirement.deleteMany({
    where: {
      code: {
        in: [
          "SKP_2023",
          "SKP_2024",
          "SKP_2025",
          "ARTIKEL_SYARAT_KHUSUS",
          "BUKTI_KORESPONDENSI",
          "SIMILARITY_CHECK",
          "PAKTA_INTEGRITAS",
          "SURAT_PENGANTAR",
        ],
      },
    },
  });

  const categories = [
    {
      code: "PROFIL_KEPAKARAN",
      name: "Profil dan Kepakaran",
      description: "Data profil, pendidikan tertinggi, dan kepakaran dosen.",
      order: 1,
      requirements: [
        {
          code: "THESIS_DISERTASI",
          name: "Disertasi/Thesis Pendidikan Tertinggi",
          description:
            "Halaman judul, lembar pengesahan, dan abstrak dalam satu dokumen.",
          inputType: "FILE",
          order: 1,
          isRequired: true,
          helperText:
            "Lampirkan halaman judul, lembar pengesahan, dan abstrak disertasi/thesis.",
        },
      ],
    },
    {
      code: "ANGKA_KREDIT",
      name: "Angka Kredit",
      description: "SKP tahunan, angka kredit prestasi, dan AK kumulatif.",
      order: 2,
      requirements: [
        {
          code: "SKP_TAHUNAN",
          name: "Dokumentasi SKP Tahunan",
          description:
            "Dosen memilih tahun SKP dari 2023 sampai tahun berjalan, lalu mengunggah dokumen SKP.",
          inputType: "FILE",
          order: 1,
          isRequired: true,
          isYearly: true,
          yearStart: 2023,
          helperText:
            "Pilih tahun SKP, isi predikat SKP, lalu unggah dokumen SKP sesuai tahun tersebut.",
        },
        {
          code: "AK_PRESTASI",
          name: "Bukti AK Prestasi",
          description:
            "Bukti publikasi, HKI, prosiding, buku, karya ilmiah, atau kegiatan penelitian/karya lain yang diklaim.",
          inputType: "FILE",
          order: 2,
          isRequired: false,
          helperText:
            "Unggah bukti pendukung AK Prestasi sesuai jenis karya yang diklaim.",
        },
        {
          code: "AK_KUMULATIF",
          name: "Dokumen AK Kumulatif",
          description:
            "Dokumen perhitungan Angka Kredit Kumulatif untuk divalidasi oleh tim penilai.",
          inputType: "FILE",
          order: 3,
          isRequired: true,
          helperText:
            "Unggah dokumen perhitungan AK Kumulatif dalam format PDF.",
        },
      ],
    },
    {
      code: "SYARAT_KHUSUS",
      name: "Syarat Khusus",
      description:
        "Profil akademik dan dokumen karya ilmiah yang menjadi syarat khusus pengajuan.",
      order: 3,
      requirements: [
        {
          code: "SINTA_PROFILE_URL",
          name: "Tautan Profil Akun SINTA",
          description: "Link profil SINTA dosen.",
          inputType: "URL",
          order: 1,
          isRequired: true,
          requiresExternalUrl: true,
          helperText:
            "Masukkan tautan profil SINTA yang aktif dan dapat diakses.",
        },
        {
          code: "GOOGLE_SCHOLAR_PROFILE_URL",
          name: "Tautan Profil Google Scholar",
          description: "Link profil Google Scholar dosen.",
          inputType: "URL",
          order: 2,
          isRequired: true,
          requiresExternalUrl: true,
          helperText:
            "Masukkan tautan profil Google Scholar yang aktif dan dapat diakses.",
        },
        {
          code: "SCOPUS_PROFILE_URL",
          name: "Tautan Profil Scopus",
          description: "Link profil Scopus dosen.",
          inputType: "URL",
          order: 3,
          isRequired: false,
          requiresExternalUrl: true,
          helperText:
            "Masukkan tautan profil Scopus apabila tersedia dan relevan.",
        },
        {
          code: "PAKTA_INTEGRITAS_KARYA_ILMIAH",
          name: "Surat Pernyataan Pakta Integritas Karya Ilmiah Dosen",
          description:
            "Surat pernyataan pakta integritas karya ilmiah dosen sebagai bukti keabsahan karya.",
          inputType: "FILE",
          order: 4,
          isRequired: true,
          sampleUrl: "#",
          helperText:
            "Unggah dokumen pakta integritas karya ilmiah dosen dalam format PDF, JPG, JPEG, atau PNG.",
        },
        {
          code: "LAMPIRAN_KARYA_ILMIAH",
          name: "Lampiran Karya Ilmiah",
          description:
            "Lampiran karya ilmiah yang mendukung syarat khusus pengajuan.",
          inputType: "FILE",
          order: 5,
          isRequired: true,
          helperText:
            "Unggah lampiran karya ilmiah atau gunakan fitur tarik portofolio pada tahap berikutnya.",
        },
      ],
    },
    {
      code: "DOKUMEN_REKOMENDASI",
      name: "Dokumen Rekomendasi",
      description:
        "Dokumen rekomendasi, berita acara, dan surat pernyataan yang mendukung pengajuan.",
      order: 4,
      requirements: [
        {
          code: "PENGANTAR_PT_LLDIKTI_KL",
          name: "Pengantar PT/LLDIKTI/KL",
          description:
            "Dokumen ditandatangani oleh Rektor/Direktur/Ketua Sekolah Tinggi/Kepala LLDIKTI/Pimpinan Mitra KL yang membidangi kepegawaian dosen.",
          inputType: "FILE",
          order: 1,
          isRequired: true,
          requiresLetterNumber: true,
          requiresLetterDate: true,
          helperText:
            "Unggah dokumen pengantar, lalu isi nomor surat dan tanggal surat sesuai dokumen.",
        },
        {
          code: "BERITA_ACARA_SENAT",
          name: "Berita Acara Senat",
          description:
            "Pastikan mencantumkan jumlah keseluruhan anggota senat dan lampiran daftar hadir.",
          inputType: "FILE",
          order: 2,
          isRequired: true,
          sampleUrl: "#",
          helperText:
            "Unggah berita acara senat dalam format PDF, JPG, JPEG, atau PNG.",
        },
        {
          code: "BERITA_ACARA_KOMITE_INTEGRITAS",
          name: "Berita Acara Komite Integritas Akademik",
          description:
            "Dokumen ditandatangani minimal oleh Ketua Tim Komite Integritas Akademik.",
          inputType: "FILE",
          order: 3,
          isRequired: true,
          requiresLetterNumber: true,
          requiresLetterDate: true,
          sampleUrl: "#",
          helperText:
            "Unggah berita acara komite integritas akademik, lalu isi nomor dan tanggal surat.",
        },
        {
          code: "SURAT_PERNYATAAN_PEMIMPIN",
          name: "Surat Pernyataan Pemimpin PTN/PTS/PTKL",
          description:
            "Surat pernyataan pimpinan perguruan tinggi terkait kelengkapan dan kebenaran dokumen pengajuan.",
          inputType: "FILE",
          order: 4,
          isRequired: true,
          requiresLetterNumber: true,
          requiresLetterDate: true,
          helperText:
            "Unggah surat pernyataan pimpinan, lalu isi nomor surat dan tanggal surat.",
        },
      ],
    },
  ];

  for (const category of categories) {
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
          inputType: requirement.inputType as any,
          order: requirement.order,
          isRequired: requirement.isRequired,
          isYearly: "isYearly" in requirement ? requirement.isYearly : false,
          yearStart: "yearStart" in requirement ? requirement.yearStart : null,
          yearEnd: null,
          requiresLetterNumber:
            "requiresLetterNumber" in requirement
              ? requirement.requiresLetterNumber
              : false,
          requiresLetterDate:
            "requiresLetterDate" in requirement
              ? requirement.requiresLetterDate
              : false,
          requiresExternalUrl:
            "requiresExternalUrl" in requirement
              ? requirement.requiresExternalUrl
              : false,
          helperText:
            "helperText" in requirement ? requirement.helperText : null,
          sampleUrl: "sampleUrl" in requirement ? requirement.sampleUrl : null,
          categoryId: savedCategory.id,
        },
        create: {
          code: requirement.code,
          name: requirement.name,
          description: requirement.description,
          inputType: requirement.inputType as any,
          order: requirement.order,
          isRequired: requirement.isRequired,
          isYearly: "isYearly" in requirement ? requirement.isYearly : false,
          yearStart: "yearStart" in requirement ? requirement.yearStart : null,
          yearEnd: null,
          requiresLetterNumber:
            "requiresLetterNumber" in requirement
              ? requirement.requiresLetterNumber
              : false,
          requiresLetterDate:
            "requiresLetterDate" in requirement
              ? requirement.requiresLetterDate
              : false,
          requiresExternalUrl:
            "requiresExternalUrl" in requirement
              ? requirement.requiresExternalUrl
              : false,
          helperText:
            "helperText" in requirement ? requirement.helperText : null,
          sampleUrl: "sampleUrl" in requirement ? requirement.sampleUrl : null,
          categoryId: savedCategory.id,
        },
      });
    }
  }

  console.log("Seed selesai.");
  console.log("Admin:", adminEmail, "/", adminPassword);
}

main()
  .catch((error) => {
    console.error("SEED_ERROR:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
