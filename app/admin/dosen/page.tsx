/** @format */

import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  ShieldCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import LecturerAvatar from "@/components/ui/LecturerAvatar";
import RemoveLecturerButton from "@/components/admin/RemoveLecturerButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getStatusLabel(status: string) {
  if (status === "VALID") return "Valid";
  if (status === "PENDING") return "Pending";
  if (status === "REVISION") return "Revisi";
  if (status === "REJECTED") return "Ditolak";
  if (status === "NOT_UPLOADED") return "Belum Upload";
  return status;
}

function getStatusClass(status: string) {
  if (status === "VALID") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "PENDING") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (status === "REVISION") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-500";
}

function formatDate(date?: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function AdminDosenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const { q } = await searchParams;
  const query = String(q || "").trim();

  const [lecturers, totalRequirements] = await Promise.all([
    prisma.lecturerProfile.findMany({
      where: {
        user: {
          status: {
            not: "SUSPENDED",
          },
        },
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { nidnOrNuptk: { contains: query, mode: "insensitive" } },
                { studyProgram: { contains: query, mode: "insensitive" } },
                {
                  user: {
                    email: { contains: query, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            createdAt: true,
          },
        },
        submissions: {
          orderBy: {
            uploadedAt: "desc",
          },
          select: {
            id: true,
            status: true,
            uploadedAt: true,
            requirementId: true,
            requirement: {
              select: {
                id: true,
                name: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.documentRequirement.count({
      where: {
        audience: {
          in: ["DOSEN", "BOTH"],
        },
      },
    }),
  ]);

  const rows = lecturers.map((lecturer) => {
    const uniqueSubmittedRequirementIds = new Set<string>();

    for (const submission of lecturer.submissions) {
      if (submission.status !== "NOT_UPLOADED") {
        uniqueSubmittedRequirementIds.add(submission.requirementId);
      }
    }

    const filled = uniqueSubmittedRequirementIds.size;

    const valid = lecturer.submissions.filter(
      (submission) => submission.status === "VALID",
    ).length;

    const pending = lecturer.submissions.filter(
      (submission) => submission.status === "PENDING",
    ).length;

    const revision = lecturer.submissions.filter(
      (submission) => submission.status === "REVISION",
    ).length;

    const rejected = lecturer.submissions.filter(
      (submission) => submission.status === "REJECTED",
    ).length;

    const needAction = pending + revision + rejected;

    const completionRate =
      totalRequirements > 0
        ? Math.round((filled / totalRequirements) * 100)
        : 0;

    const latestSubmission = lecturer.submissions[0] || null;

    return {
      lecturer,
      filled,
      valid,
      pending,
      revision,
      rejected,
      needAction,
      completionRate,
      latestSubmission,
    };
  });

  const totalLecturers = rows.length;

  const totalFilled = rows.reduce((sum, row) => sum + row.filled, 0);

  const totalValid = rows.reduce((sum, row) => sum + row.valid, 0);

  const totalNeedAction = rows.reduce((sum, row) => sum + row.needAction, 0);

  const averageCompletion =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, row) => sum + row.completionRate, 0) / rows.length,
        )
      : 0;

  return (
    <AppShell
      role="ADMIN"
      title="Daftar Dosen"
      subtitle="Pantau dosen aktif, lihat foto profil, buka detail dokumen, dan keluarkan dosen dari daftar aktif."
    >
      <div className="space-y-6">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<UsersRound size={22} />}
            label="Total Dosen"
            value={totalLecturers}
            description="Dosen aktif"
            tone="sky"
          />

          <MetricCard
            icon={<FileText size={22} />}
            label="Total Terisi"
            value={totalFilled}
            description="Dokumen dikirim"
            tone="violet"
          />

          <MetricCard
            icon={<CheckCircle2 size={22} />}
            label="Valid"
            value={totalValid}
            description="Diterima admin"
            tone="emerald"
          />

          <MetricCard
            icon={<Clock3 size={22} />}
            label="Tindak Lanjut"
            value={totalNeedAction}
            description="Pending/revisi/tolak"
            tone="amber"
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-700">
                Monitoring Dosen
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Daftar Dosen Aktif
              </h2>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Dosen dengan status akun SUSPENDED tidak ditampilkan pada daftar
                aktif.
              </p>
            </div>

            <form
              method="GET"
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-400 transition focus-within:border-sky-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100 lg:max-w-md"
            >
              <button
                type="submit"
                aria-label="Cari dosen"
                className="text-slate-400 transition hover:text-sky-700"
              >
                <Search size={19} />
              </button>

              <input
                name="q"
                defaultValue={query}
                placeholder="Cari nama, NIDN/NUPTK, prodi, atau email..."
                className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </form>
          </div>
        </section>

        {rows.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
              <UsersRound size={30} />
            </div>

            <h3 className="mt-5 text-xl font-black text-slate-950">
              {query ? "Tidak Ada Hasil Pencarian" : "Belum Ada Dosen Aktif"}
            </h3>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              {query
                ? `Tidak ditemukan dosen yang cocok dengan \"${query}\".`
                : "Dosen yang sudah registrasi dan berstatus aktif akan tampil di halaman ini."}
            </p>
          </section>
        ) : (
          <section className="grid gap-5">
            {rows.map((row) => {
              const lecturer = row.lecturer;

              return (
                <article
                  key={lecturer.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70"
                >
                  <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
                    <div className="p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <LecturerAvatar
                            lecturerId={lecturer.id}
                            name={lecturer.fullName}
                            size="lg"
                          />

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-sky-700">
                                Profil Dosen
                              </span>

                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                  lecturer.documentStatus,
                                )}`}
                              >
                                {getStatusLabel(lecturer.documentStatus)}
                              </span>
                            </div>

                            <h3 className="mt-3 text-2xl font-black text-slate-950">
                              {lecturer.fullName}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {lecturer.user.email}
                            </p>

                            <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                              NIDN/NUPTK: {lecturer.nidnOrNuptk}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/dosen/${lecturer.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                          >
                            Detail
                            <ArrowRight size={17} />
                          </Link>

                          <RemoveLecturerButton
                            lecturerId={lecturer.id}
                            lecturerName={lecturer.fullName}
                          />
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <InfoBox
                          label="Program Studi"
                          value={lecturer.studyProgram}
                        />

                        <InfoBox
                          label="Jabatan Akademik"
                          value={lecturer.academicPosition}
                        />

                        <InfoBox
                          label="Status Dosen"
                          value={lecturer.lecturerStatus}
                        />

                        <InfoBox
                          label="Bergabung"
                          value={formatDate(lecturer.user.createdAt)}
                        />
                      </div>

                      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400">
                              Progress Kelengkapan
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-600">
                              {row.filled} dari {totalRequirements} syarat sudah
                              diisi
                            </p>
                          </div>

                          <p className="text-4xl font-black text-slate-950">
                            {row.completionRate}%
                          </p>
                        </div>

                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-sky-700"
                            style={{
                              width: `${row.completionRate}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
                            Ringkasan Verifikasi
                          </p>

                          <p className="mt-2 text-sm font-semibold text-slate-300">
                            Status dokumen terakhir dan distribusi verifikasi.
                          </p>
                        </div>

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <ShieldCheck size={26} />
                        </div>
                      </div>

                      <div className="mt-7 grid grid-cols-2 gap-3">
                        <StatusBox
                          label="Valid"
                          value={row.valid}
                          className="bg-emerald-500/10 text-emerald-200"
                        />

                        <StatusBox
                          label="Pending"
                          value={row.pending}
                          className="bg-sky-500/10 text-sky-200"
                        />

                        <StatusBox
                          label="Revisi"
                          value={row.revision}
                          className="bg-amber-500/10 text-amber-200"
                        />

                        <StatusBox
                          label="Tolak"
                          value={row.rejected}
                          className="bg-red-500/10 text-red-200"
                        />
                      </div>

                      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                          Dokumen Terakhir
                        </p>

                        {row.latestSubmission ? (
                          <div className="mt-3">
                            <p className="text-sm font-black text-white">
                              {row.latestSubmission.requirement.name}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {row.latestSubmission.requirement.category.name} •{" "}
                              {formatDate(row.latestSubmission.uploadedAt)}
                            </p>

                            <span
                              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                row.latestSubmission.status,
                              )}`}
                            >
                              {getStatusLabel(row.latestSubmission.status)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
                            <XCircle size={17} />
                            Belum ada dokumen yang dikirim
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  description: string;
  tone: "sky" | "violet" | "emerald" | "amber";
}) {
  const toneClass = {
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
  }[tone];

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div
        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-sm font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>

      <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>
    </article>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-black leading-6 text-slate-950">
        {value || "-"}
      </p>
    </div>
  );
}

function StatusBox({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl p-4 text-center ${className}`}>
      <p className="text-2xl font-black">{value}</p>

      <p className="mt-1 text-xs font-black">{label}</p>
    </div>
  );
}
