/** @format */

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Eye,
  EyeOff,
  FileImage,
  GraduationCap,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UploadCloud,
  User,
  UserPlus,
  X,
} from "lucide-react";

type RegisterFormState = {
  nidnOrNuptk: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  institution: string;
  faculty: string;
  studyProgram: string;
  academicPosition: string;
  lecturerStatus: string;
  password: string;
  confirmPassword: string;
};

const academicPositions = [
  "Asisten Ahli",
  "Lektor",
  "Lektor Kepala",
  "Guru Besar",
];

const lecturerStatuses = [
  "Dosen Tetap",
  "Dosen Tidak Tetap",
  "Dosen PNS",
  "Dosen Non PNS",
];

const studyPrograms = [
  "S1 - Informatika",
  "S1 - Sistem Informasi",
  "S1 - Pendidikan Bahasa Indonesia",
  "S1 - Pendidikan Bahasa Inggris",
  "S1 - Akuntansi",
  "S1 - Manajemen",
  "S2 - Administrasi Publik",
  "Lainnya",
];

const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
const maxPhotoSize = 2 * 1024 * 1024;

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export default function RegisterForm() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState<RegisterFormState>({
    nidnOrNuptk: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    institution: "Universitas Muhammadiyah Makassar",
    faculty: "",
    studyProgram: "",
    academicPosition: "",
    lecturerStatus: "",
    password: "",
    confirmPassword: "",
  });

  const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

  const passwordScore = useMemo(() => {
    let s = 0;

    if (form.password.length >= 8) s++;
    if (/[A-Z]/.test(form.password)) s++;
    if (/[a-z]/.test(form.password)) s++;
    if (/[0-9]/.test(form.password)) s++;
    if (/[^A-Za-z0-9]/.test(form.password)) s++;

    return s;
  }, [form.password]);

  const passwordLabel = !form.password
    ? "Belum diisi"
    : passwordScore <= 2
      ? "Lemah"
      : passwordScore <= 4
        ? "Cukup Kuat"
        : "Sangat Kuat";

  const passwordColor = !form.password
    ? "bg-slate-200"
    : passwordScore <= 2
      ? "bg-red-500"
      : passwordScore <= 4
        ? "bg-amber-500"
        : "bg-emerald-500";

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setForm((p) => ({ ...p, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    setError("");
    setSuccess("");

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }

    if (!allowedPhotoTypes.includes(file.type)) {
      setPhoto(null);
      setPhotoPreview(null);
      setError("Foto harus berformat JPG, PNG, atau WEBP.");
      return;
    }

    if (file.size > maxPhotoSize) {
      setPhoto(null);
      setPhotoPreview(null);
      setError("Ukuran foto maksimal 2 MB.");
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(null);
    setPhotoPreview(null);
  };

  const validate1 = () =>
    !form.nidnOrNuptk.trim()
      ? "NIDN/NUPTK wajib diisi."
      : form.nidnOrNuptk.trim().length < 6
        ? "NIDN/NUPTK minimal 6 karakter."
        : !form.firstName.trim()
          ? "Nama depan wajib diisi."
          : !form.lastName.trim()
            ? "Nama belakang wajib diisi."
            : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
              ? "Format email tidak valid."
              : "";

  const validate2 = () =>
    !form.institution.trim()
      ? "Perguruan tinggi wajib diisi."
      : !form.studyProgram
        ? "Program studi wajib dipilih."
        : !form.academicPosition
          ? "Jabatan akademik wajib dipilih."
          : !form.lecturerStatus
            ? "Status dosen wajib dipilih."
            : "";

  const validate3 = () =>
    !form.password
      ? "Password wajib diisi."
      : form.password.length < 8
        ? "Password minimal 8 karakter."
        : passwordScore < 3
          ? "Password terlalu lemah."
          : form.password !== form.confirmPassword
            ? "Konfirmasi password tidak sama."
            : !agree
              ? "Anda harus menyetujui pernyataan penggunaan sistem."
              : "";

  const validate4 = () =>
    !photo
      ? "Foto dosen wajib diunggah."
      : !allowedPhotoTypes.includes(photo.type)
        ? "Foto harus berformat JPG, PNG, atau WEBP."
        : photo.size > maxPhotoSize
          ? "Ukuran foto maksimal 2 MB."
          : "";

  const next = () => {
    const msg =
      step === 1
        ? validate1()
        : step === 2
          ? validate2()
          : step === 3
            ? validate3()
            : step === 4
              ? validate4()
              : "";

    if (msg) {
      setError(msg);
      return;
    }

    setError("");
    setStep((p) => Math.min(p + 1, 5));
  };

  const back = () => {
    setError("");
    setStep((p) => Math.max(p - 1, 1));
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const msg = [validate1(), validate2(), validate3(), validate4()].find(
      Boolean,
    );

    if (msg) {
      setError(msg);
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      formData.append("nidnOrNuptk", form.nidnOrNuptk);
      formData.append("firstName", form.firstName);
      formData.append("lastName", form.lastName);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("institution", form.institution);
      formData.append("faculty", form.faculty);
      formData.append("studyProgram", form.studyProgram);
      formData.append("academicPosition", form.academicPosition);
      formData.append("lecturerStatus", form.lecturerStatus);
      formData.append("password", form.password);
      formData.append("confirmPassword", form.confirmPassword);

      if (photo) {
        formData.append("photo", photo);
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Registrasi gagal.");
        return;
      }

      setSuccess("Akun berhasil dibuat. Mengarahkan ke login...");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-7xl overflow-hidden rounded-[2.3rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200">
      <div className="grid min-h-[780px] grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
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
                  <GraduationCap size={16} />
                  Registrasi Dosen
                </div>

                <h2 className="text-4xl font-black leading-tight md:text-5xl">
                  Buat akun untuk mengelola dokumen.
                </h2>

                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                  Akun ini menjadi identitas dosen untuk upload dokumen, DUPAK,
                  dan monitoring proses jabatan akademik.
                </p>
              </div>
            </div>

            <div className="mt-12 grid gap-4">
              <SideInfo
                icon={<CreditCard size={20} />}
                title="NIDN/NUPTK"
                desc="Identitas utama dosen untuk sinkronisasi data."
              />
              <SideInfo
                icon={<FileImage size={20} />}
                title="Foto Wajib"
                desc="Foto dosen menjadi identitas visual pada dashboard admin."
              />
              <SideInfo
                icon={<ShieldCheck size={20} />}
                title="Aman"
                desc="Password di-hash dan session memakai HTTP-only cookie."
              />
            </div>
          </div>
        </section>

        <section className="p-8 md:p-12">
          <div className="mx-auto flex h-full max-w-2xl flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
              Buat Akun Dosen
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              Registrasi Akun
            </h2>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              Lengkapi data bertahap, unggah foto, lalu simpan ke database.
            </p>

            <Stepper step={step} />

            <form onSubmit={submit} className="mt-8">
              {step === 1 && (
                <div className="space-y-5">
                  <SectionTitle
                    title="Identitas Dasar"
                    desc="Masukkan identitas dosen sesuai data akademik."
                  />

                  <InputField
                    label="NIDN / NUPTK"
                    name="nidnOrNuptk"
                    value={form.nidnOrNuptk}
                    onChange={handleChange}
                    placeholder="0912345678"
                    icon={<CreditCard size={20} />}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <InputField
                      label="Nama Depan"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="Nama depan"
                      icon={<User size={20} />}
                    />
                    <InputField
                      label="Nama Belakang"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Nama belakang"
                      icon={<User size={20} />}
                    />
                  </div>

                  <InputField
                    label="Email Aktif"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="nama@kampus.ac.id"
                    icon={<Mail size={20} />}
                  />

                  <InputField
                    label="Nomor HP / WhatsApp"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Opsional"
                    icon={<Phone size={20} />}
                    required={false}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <SectionTitle
                    title="Data Akademik"
                    desc="Data ini digunakan untuk pengelompokan dan monitoring admin."
                  />

                  <InputField
                    label="Perguruan Tinggi"
                    name="institution"
                    value={form.institution}
                    onChange={handleChange}
                    placeholder="Nama PT"
                    icon={<Building2 size={20} />}
                  />

                  <InputField
                    label="Fakultas"
                    name="faculty"
                    value={form.faculty}
                    onChange={handleChange}
                    placeholder="Opsional"
                    icon={<Building2 size={20} />}
                    required={false}
                  />

                  <SelectField
                    label="Program Studi"
                    name="studyProgram"
                    value={form.studyProgram}
                    onChange={handleChange}
                    options={studyPrograms}
                    placeholder="Pilih prodi"
                    icon={<BookOpen size={20} />}
                  />

                  <SelectField
                    label="Jabatan Akademik Saat Ini"
                    name="academicPosition"
                    value={form.academicPosition}
                    onChange={handleChange}
                    options={academicPositions}
                    placeholder="Pilih jabatan"
                    icon={<Briefcase size={20} />}
                  />

                  <SelectField
                    label="Status Dosen"
                    name="lecturerStatus"
                    value={form.lecturerStatus}
                    onChange={handleChange}
                    options={lecturerStatuses}
                    placeholder="Pilih status"
                    icon={<GraduationCap size={20} />}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <SectionTitle
                    title="Keamanan Akun"
                    desc="Buat password yang kuat untuk menjaga keamanan akun."
                  />

                  <PasswordField
                    label="Password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Minimal 8 karakter"
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                  />

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500">
                        Kekuatan Password
                      </span>
                      <span className="text-sm font-black text-slate-700">
                        {passwordLabel}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${passwordColor}`}
                        style={{ width: `${Math.max(passwordScore * 20, 8)}%` }}
                      />
                    </div>
                  </div>

                  <PasswordField
                    label="Konfirmasi Password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Ulangi password"
                    showPassword={showConfirmPassword}
                    setShowPassword={setShowConfirmPassword}
                  />

                  <label className="flex cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-1 h-5 w-5"
                    />
                    <span className="text-sm font-semibold leading-6 text-slate-600">
                      Saya menyatakan data benar dan memahami sistem digunakan
                      untuk pengelolaan dokumen.
                    </span>
                  </label>
                </div>
              )}

              {step === 4 && (
                <PhotoStep
                  photo={photo}
                  photoPreview={photoPreview}
                  onChange={handlePhotoChange}
                  onRemove={removePhoto}
                />
              )}

              {step === 5 && (
                <ReviewStep
                  form={form}
                  fullName={fullName}
                  photo={photo}
                  photoPreview={photoPreview}
                />
              )}

              {error && <AlertBox type="error" message={error} />}
              {success && <AlertBox type="success" message={success} />}

              <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={step === 1 ? () => router.push("/login") : back}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black text-slate-700 transition hover:-translate-y-1 hover:bg-slate-50 hover:shadow-lg"
                >
                  <ChevronLeft size={20} />
                  {step === 1 ? "Sudah Punya Akun" : "Sebelumnya"}
                </button>

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-700 to-blue-950 px-7 py-4 font-black text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
                  >
                    Lanjutkan
                    <ArrowRight size={20} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-700 to-blue-950 px-7 py-4 font-black text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={22} className="animate-spin" />
                        Membuat Akun...
                      </>
                    ) : (
                      <>
                        <UserPlus size={21} />
                        Buat Akun
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Identitas", "Akademik", "Keamanan", "Foto", "Review"];

  return (
    <div className="mt-8 grid grid-cols-5 gap-3">
      {steps.map((item, index) => {
        const n = index + 1;
        const active = step === n;
        const done = step > n;

        return (
          <div key={item}>
            <div
              className={`h-2 rounded-full ${done || active ? "bg-sky-700" : "bg-slate-200"}`}
            />
            <div className="mt-3 flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${done ? "bg-emerald-500 text-white" : active ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-500"}`}
              >
                {done ? <CheckCircle2 size={17} /> : n}
              </div>
              <span
                className={`hidden text-sm font-black sm:block ${active ? "text-sky-800" : "text-slate-500"}`}
              >
                {item}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h3 className="text-2xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 leading-7 text-slate-500">{desc}</p>
    </div>
  );
}

function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  icon: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-black text-slate-800">
        {label}
        {!required && (
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
            Opsional
          </span>
        )}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  icon,
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  options: string[];
  placeholder: string;
  icon: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block font-black text-slate-800">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <select
          name={name}
          value={value}
          onChange={onChange}
          required
          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        >
          <option value="">{placeholder}</option>
          {options.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  name,
  value,
  onChange,
  placeholder,
  showPassword,
  setShowPassword,
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}) {
  return (
    <div>
      <label className="mb-2 block font-black text-slate-800">{label}</label>
      <div className="relative">
        <LockKeyhole
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type={showPassword ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-14 font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
  );
}

function PhotoStep({
  photo,
  photoPreview,
  onChange,
  onRemove,
}: {
  photo: File | null;
  photoPreview: string | null;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Foto Dosen"
        desc="Unggah foto formal dosen sebagai identitas visual pada sistem."
      />

      <div className="grid gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-[180px_1fr] md:items-center">
        <div className="flex justify-center">
          <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Preview foto dosen"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center text-slate-400">
                <ImagePlus size={38} className="mx-auto" />
                <p className="mt-2 text-xs font-black">Foto Dosen</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block">
            <span className="mb-2 block font-black text-slate-800">
              Upload Foto Dosen
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onChange}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-sky-700 file:px-4 file:py-2 file:text-sm file:font-black file:text-white hover:bg-slate-50"
            />
          </label>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            Format yang diterima: JPG, PNG, atau WEBP. Ukuran maksimal 2 MB.
          </p>

          {photo ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate">{photo.name}</p>
                <p className="mt-1 text-xs font-black text-emerald-600">
                  {formatFileSize(photo.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
              >
                <X size={14} />
                Hapus
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
              <UploadCloud size={18} />
              Foto wajib diunggah sebelum lanjut ke review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  form,
  fullName,
  photo,
  photoPreview,
}: {
  form: RegisterFormState;
  fullName: string;
  photo: File | null;
  photoPreview: string | null;
}) {
  const rows = [
    ["NIDN/NUPTK", form.nidnOrNuptk],
    ["Nama Lengkap", fullName],
    ["Email", form.email],
    ["HP", form.phone || "-"],
    ["PT", form.institution],
    ["Fakultas", form.faculty || "-"],
    ["Program Studi", form.studyProgram],
    ["Jabatan", form.academicPosition],
    ["Status", form.lecturerStatus],
    [
      "Foto",
      photo
        ? `${photo.name} (${formatFileSize(photo.size)})`
        : "Belum diunggah",
    ],
  ];

  return (
    <div className="space-y-5">
      <SectionTitle title="Review Data" desc="Periksa kembali data Anda." />

      <div className="grid gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-[150px_1fr] md:items-start">
        <div className="flex justify-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Review foto dosen"
                className="h-full w-full object-cover"
              />
            ) : (
              <FileImage size={34} className="text-slate-300" />
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {rows.map(([label, value], i) => (
            <div
              key={label}
              className={`grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[190px_1fr] ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}
            >
              <div className="font-black text-slate-700">{label}</div>
              <div className="font-semibold text-slate-600">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertBox({
  type,
  message,
}: {
  type: "error" | "success";
  message: string;
}) {
  const isError = type === "error";

  return (
    <div
      className={`mt-6 flex gap-3 rounded-2xl border p-4 ${isError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
    >
      {isError ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
      <p className="text-sm font-semibold leading-6">{message}</p>
    </div>
  );
}

function SideInfo({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sky-300">
        {icon}
      </div>
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
    </div>
  );
}
