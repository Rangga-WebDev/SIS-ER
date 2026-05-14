/** @format */

import type { ComponentType } from "react";
import {
  Award,
  Building2,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileText,
  Headphones,
  Layers3,
  LockKeyhole,
  MonitorCheck,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";

export type LandingIcon = ComponentType<{ size?: number; className?: string }>;

export const navItems = [
  { label: "Beranda", href: "#beranda" },
  { label: "Layanan", href: "#layanan" },
  { label: "Alur", href: "#alur" },
  { label: "Fitur", href: "#fitur" },
  { label: "FAQ", href: "#faq" },
  { label: "Kontak", href: "#kontak" },
];

export const serviceCards = [
  {
    title: "Kenaikan Jabatan Akademik",
    desc: "Pengajuan jabatan akademik dosen dengan alur dokumen, status, dan verifikasi yang lebih terstruktur.",
    icon: Award,
    accent: "from-red-500 to-rose-600",
  },
  {
    title: "Portal Mandiri Dosen",
    desc: "Dosen mengunggah dokumen sendiri sehingga admin dapat memantau progres tanpa input manual berulang.",
    icon: Users,
    accent: "from-sky-500 to-blue-700",
  },
  {
    title: "Beban Kerja Dosen",
    desc: "Ruang untuk dokumen BKD/SKP dan bukti kinerja tahunan yang dibutuhkan dalam proses administrasi.",
    icon: ClipboardCheck,
    accent: "from-emerald-500 to-teal-700",
  },
  {
    title: "Dokumen Akademik",
    desc: "Pengelolaan dokumen profil, kepakaran, angka kredit, syarat khusus, dan rekomendasi.",
    icon: FileCheck2,
    accent: "from-pink-500 to-fuchsia-700",
  },
  {
    title: "Verifikasi Admin",
    desc: "Admin dapat melihat, menilai, memberi catatan revisi, dan menetapkan status setiap berkas.",
    icon: Building2,
    accent: "from-violet-500 to-purple-700",
  },
  {
    title: "Pusat Bantuan",
    desc: "Informasi alur, FAQ, dan panduan penggunaan untuk dosen maupun admin.",
    icon: Headphones,
    accent: "from-amber-500 to-orange-700",
  },
];

export const flowSteps = [
  {
    title: "Register Dosen",
    desc: "Dosen membuat akun dengan NIDN/NUPTK, email, dan data akademik.",
    icon: Users,
  },
  {
    title: "Login Role-Based",
    desc: "Dosen dan admin masuk ke sistem sesuai role masing-masing.",
    icon: LockKeyhole,
  },
  {
    title: "Lengkapi Profil",
    desc: "Dosen melengkapi informasi profil, kepakaran, dan data pendukung.",
    icon: Layers3,
  },
  {
    title: "Upload Dokumen",
    desc: "Berkas diunggah ke storage dan metadata tersimpan di database relasional.",
    icon: UploadCloud,
  },
  {
    title: "Verifikasi Admin",
    desc: "Admin memberi status valid, revisi, atau ditolak dengan catatan.",
    icon: FileText,
  },
  {
    title: "Monitoring Status",
    desc: "Progress kelengkapan dapat dipantau dari dashboard.",
    icon: MonitorCheck,
  },
];

export const featureCards = [
  {
    title: "Role-Based Access",
    desc: "Akses dosen dan admin dipisahkan untuk keamanan dan kejelasan workflow.",
    icon: ShieldCheck,
  },
  {
    title: "Database Terstruktur",
    desc: "Data user, profil, dokumen, verifikasi, dan log aktivitas memakai database relasional yang terorganisir.",
    icon: Database,
  },
  {
    title: "Workflow Bertahap",
    desc: "Setiap proses dibuat modular agar mudah dikembangkan oleh tim.",
    icon: ScrollText,
  },
  {
    title: "UI Responsif",
    desc: "Desain dibuat modern, mobile-friendly, dan siap production polish.",
    icon: Sparkles,
  },
];

export const faqs = [
  {
    question: "Apakah ini memakai data asli SISTER?",
    answer: "Tidak. Ini adalah sistem mandiri dengan database project sendiri.",
  },
  {
    question: "Siapa yang mengunggah dokumen?",
    answer:
      "Dosen mengunggah dokumen melalui dashboard dosen, lalu admin memverifikasi melalui dashboard admin.",
  },
  {
    question: "Siapa yang mengelola sistem ini?",
    answer:
      "Sistem ini dikembangkan oleh tim internal kampus sebagai proyek mandiri untuk meningkatkan pengalaman administrasi akademik.",
  },
];

export const footerLinks = [
  {
    title: "Produk",
    links: [
      { label: "Beranda", href: "#beranda" },
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
      { label: "Dashboard", href: "/dosen/dashboard" },
    ],
  },
  {
    title: "Layanan",
    links: [
      { label: "Upload Dokumen", href: "/dosen/dokumen" },
      { label: "Verifikasi", href: "/admin/dosen" },
      { label: "Monitoring", href: "#fitur" },
    ],
  },
  {
    title: "Developer",
    links: [
      { label: "QwertyDev", href: "#fitur" },
      { label: "Anony", href: "#fitur" },
      { label: "Anonym", href: "#fitur" },
      { label: "Anonymous", href: "#fitur" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Keamanan", href: "#fitur" },
      { label: "Kontak", href: "#kontak" },
    ],
  },
];
