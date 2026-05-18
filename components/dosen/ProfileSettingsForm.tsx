/** @format */

"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Save,
  UserRound,
} from "lucide-react";
import LecturerAvatar from "@/components/ui/LecturerAvatar";

type ProfileForm = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nidnOrNuptk: string;
  phone: string;
  institution: string;
  faculty: string;
  studyProgram: string;
  academicPosition: string;
  lecturerStatus: string;
};

export default function ProfileSettingsForm({
  initialData,
}: {
  initialData: ProfileForm;
}) {
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>(initialData);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    setMessage(null);
    setPhoto(file);

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    if (!file) {
      setPhotoPreview(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhoto(null);
      setPhotoPreview(null);
      setMessage({
        type: "error",
        text: "Foto harus berformat JPG, PNG, atau WEBP.",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhoto(null);
      setPhotoPreview(null);
      setMessage({
        type: "error",
        text: "Ukuran foto maksimal 2 MB.",
      });
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage(null);
    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("firstName", form.firstName);
      formData.append("lastName", form.lastName);
      formData.append("nidnOrNuptk", form.nidnOrNuptk);
      formData.append("phone", form.phone);
      formData.append("institution", form.institution);
      formData.append("faculty", form.faculty);
      formData.append("studyProgram", form.studyProgram);
      formData.append("academicPosition", form.academicPosition);
      formData.append("lecturerStatus", form.lecturerStatus);

      if (photo) {
        formData.append("photo", photo);
      }

      const response = await fetch("/api/dosen/settings", {
        method: "PATCH",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: json.message || "Gagal memperbarui profil.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: json.message || "Profil berhasil diperbarui.",
      });

      setPhoto(null);
      setPhotoPreview(null);

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
    <form onSubmit={submit} className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-950 p-6 text-white">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-300">
            Profil Dosen
          </p>

          <h2 className="mt-2 text-3xl font-black">Pengaturan Data Dosen</h2>

          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
            Perubahan profil akan digunakan pada dashboard dosen, daftar admin,
            detail dokumen, dan pengisian DUPAK.
          </p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex justify-center">
              {photoPreview ? (
                <div className="h-36 w-36 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Preview foto baru"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <LecturerAvatar
                  lecturerId={form.id}
                  name={form.fullName}
                  size="xl"
                />
              )}
            </div>

            <div className="mt-5 text-center">
              <p className="text-xl font-black text-slate-950">
                {form.firstName} {form.lastName}
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                {form.nidnOrNuptk}
              </p>
            </div>

            <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-800">
              <Camera size={18} />
              Ganti Foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>

            <p className="mt-3 text-center text-xs font-semibold leading-5 text-slate-500">
              Format JPG, PNG, atau WEBP. Maksimal 2 MB.
            </p>

            {photo ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <div className="flex items-center gap-2">
                  <ImagePlus size={16} />
                  Foto baru dipilih
                </div>

                <p className="mt-1 truncate text-xs">{photo.name}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            {message && (
              <div
                className={`flex gap-2 rounded-2xl border p-4 text-sm font-bold leading-6 ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                )}
                {message.text}
              </div>
            )}

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <UserRound size={21} />
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    Data Profil
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">
                    Lengkapi atau perbarui identitas dosen.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nama Depan">
                  <input
                    required
                    value={form.firstName}
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                    className="input-settings"
                  />
                </Field>

                <Field label="Nama Belakang">
                  <input
                    required
                    value={form.lastName}
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                    className="input-settings"
                  />
                </Field>

                <Field label="NIDN/NUPTK">
                  <input
                    required
                    value={form.nidnOrNuptk}
                    onChange={(event) =>
                      updateField("nidnOrNuptk", event.target.value)
                    }
                    className="input-settings"
                  />
                </Field>

                <Field label="Nomor HP">
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    className="input-settings"
                    placeholder="08xxxxxxxxxx"
                  />
                </Field>

                <Field label="Institusi">
                  <input
                    required
                    value={form.institution}
                    onChange={(event) =>
                      updateField("institution", event.target.value)
                    }
                    className="input-settings"
                  />
                </Field>

                <Field label="Fakultas">
                  <input
                    value={form.faculty}
                    onChange={(event) =>
                      updateField("faculty", event.target.value)
                    }
                    className="input-settings"
                  />
                </Field>

                <Field label="Program Studi">
                  <input
                    required
                    value={form.studyProgram}
                    onChange={(event) =>
                      updateField("studyProgram", event.target.value)
                    }
                    className="input-settings"
                  />
                </Field>

                <Field label="Jabatan Akademik">
                  <select
                    required
                    value={form.academicPosition}
                    onChange={(event) =>
                      updateField("academicPosition", event.target.value)
                    }
                    className="input-settings"
                  >
                    <option value="">Pilih jabatan</option>
                    <option value="Asisten Ahli">Asisten Ahli</option>
                    <option value="Lektor">Lektor</option>
                    <option value="Lektor Kepala">Lektor Kepala</option>
                    <option value="Guru Besar">Guru Besar</option>
                  </select>
                </Field>

                <Field label="Status Dosen">
                  <select
                    required
                    value={form.lecturerStatus}
                    onChange={(event) =>
                      updateField("lecturerStatus", event.target.value)
                    }
                    className="input-settings"
                  >
                    <option value="">Pilih status</option>
                    <option value="Dosen Tetap">Dosen Tetap</option>
                    <option value="Dosen Tidak Tetap">Dosen Tidak Tetap</option>
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="Non-ASN">Non-ASN</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-6 py-4 text-sm font-black text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .input-settings {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.9rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: rgb(51 65 85);
          outline: none;
          transition: 0.2s ease;
        }

        .input-settings:focus {
          border-color: rgb(56 189 248);
          background: white;
          box-shadow: 0 0 0 4px rgb(224 242 254);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
