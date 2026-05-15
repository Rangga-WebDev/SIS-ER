/** @format */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

type Role = "DOSEN" | "ADMIN";
export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("DOSEN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message || "Login gagal.");
        return;
      }
      router.push(result.redirectTo);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="relative w-full max-w-6xl overflow-hidden rounded-[2.3rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200">
      <div className="grid min-h-[700px] grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative overflow-hidden bg-slate-950 p-8 text-white md:p-12">
          <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute -bottom-28 right-0 h-96 w-96 rounded-full bg-blue-700/30 blur-3xl" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mb-10 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-slate-300 transition hover:-translate-y-1 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={18} />
                Kembali
              </button>
              <div className="flex items-center gap-4">
                <Image
                  src="/logo-unismuh.svg"
                  alt="Logo Kampus"
                  width={68}
                  height={68}
                  className="rounded-full"
                />
                <div>
                  <h1 className="text-3xl font-black">JAFUNG SMART</h1>
                  <p className="text-xs font-bold tracking-[0.22em] text-slate-400">
                    UNIVERSITAS MUHAMMADIYAH MAKASSAR
                  </p>
                </div>
              </div>
              <div className="mt-16">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-sky-200">
                  <ShieldCheck size={16} />
                  Portal Login
                </div>
                <h2 className="text-4xl font-black leading-tight md:text-5xl">
                  Masuk untuk mengelola dokumen.
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                  Dosen mengupload dokumen. Admin memantau dan memverifikasi.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="p-8 md:p-12">
          <div className="mx-auto flex h-full max-w-xl flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
              Login Sistem
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              Masuk ke Akun
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Pilih role akun dan masuk menggunakan email serta password.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <RoleButton
                active={role === "DOSEN"}
                icon={<GraduationCap size={25} />}
                title="Dosen"
                desc="Upload dokumen"
                onClick={() => setRole("DOSEN")}
              />
              <RoleButton
                active={role === "ADMIN"}
                icon={<ShieldCheck size={25} />}
                title="Admin"
                desc="Verifikasi dokumen"
                onClick={() => setRole("ADMIN")}
              />
            </div>
            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block font-black text-slate-800">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@kampus.ac.id"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block font-black text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-14 font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-sky-700"
                  >
                    {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                  <AlertCircle size={22} />
                  <p className="text-sm font-semibold leading-6">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-700 to-blue-950 px-6 py-5 text-xl font-black text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk Sekarang
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-slate-900">Belum punya akun?</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Dosen mendaftar terlebih dahulu.
                  </p>
                </div>
                <a
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-sky-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:bg-sky-50 hover:shadow-lg"
                >
                  <UserPlus size={19} />
                  Buat Akun
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
function RoleButton({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-3xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${active ? "border-sky-300 bg-sky-50 shadow-sky-100" : "border-slate-200 bg-white hover:border-sky-200"}`}
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition ${active ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-sky-100 group-hover:text-sky-700"}`}
      >
        {icon}
      </div>
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{desc}</p>
    </button>
  );
}
function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
    </div>
  );
}
