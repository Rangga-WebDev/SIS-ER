/** @format */

import { redirect } from "next/navigation";
import { ShieldCheck, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/dashboard/AppShell";
import PakMemberActionButton from "@/components/admin/PakMemberActionButton";
import AdminPasswordResetForm from "@/components/admin/AdminPasswordResetForm";

export default async function AdminTimPakPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  // Kandidat Tim PAK = akun non-dosen (ADMIN/TIM_PAK/OPERATOR tanpa profil dosen).
  const accounts = await prisma.user.findMany({
    where: {
      role: {
        in: ["TIM_PAK", "ADMIN", "OPERATOR"],
      },
      lecturerProfile: null,
      id: {
        not: user.id,
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          pakAssignments: {
            where: {
              status: "ACTIVE",
            },
          },
        },
      },
    },
    orderBy: [
      {
        role: "asc",
      },
      {
        email: "asc",
      },
    ],
  });

  const pakMembers = accounts.filter((account) => account.role === "TIM_PAK");
  const otherAccounts = accounts.filter(
    (account) => account.role !== "TIM_PAK",
  );

  return (
    <AppShell
      role="ADMIN"
      title="Kelola Tim PAK"
      subtitle="Kelola akun penilai: status aktif, beban tugas, dan penetapan role Tim PAK."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Akun Tim PAK ({pakMembers.length})
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Akun dengan role TIM_PAK yang dapat menerima penugasan
                penilaian.
              </p>
            </div>
          </div>

          {pakMembers.length === 0 ? (
            <p className="p-8 text-center text-sm font-bold text-slate-400">
              Belum ada akun Tim PAK. Tetapkan dari daftar akun lain di bawah.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="p-5">Email</th>
                    <th className="p-5">Status</th>
                    <th className="p-5">Tugas Aktif</th>
                    <th className="p-5">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {pakMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="p-5 font-black text-slate-900">
                        {member.email}
                      </td>

                      <td className="p-5">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${
                            member.status === "ACTIVE"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {member.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>

                      <td className="p-5 font-black text-slate-900">
                        {member._count.pakAssignments}
                      </td>

                      <td className="p-5">
                        <div className="flex flex-wrap gap-2">
                          {member.status === "ACTIVE" ? (
                            <PakMemberActionButton
                              userId={member.id}
                              action="SUSPEND"
                              label="Nonaktifkan"
                              tone="danger"
                            />
                          ) : (
                            <PakMemberActionButton
                              userId={member.id}
                              action="ACTIVATE"
                              label="Aktifkan"
                            />
                          )}

                          <PakMemberActionButton
                            userId={member.id}
                            action="SET_ADMIN"
                            label="Jadikan Admin"
                          />

                          <AdminPasswordResetForm
                            userId={member.id}
                            email={member.email}
                            compact
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <UsersRound size={21} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Akun Lain ({otherAccounts.length})
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Akun admin/operator yang dapat ditetapkan sebagai Tim PAK.
              </p>
            </div>
          </div>

          {otherAccounts.length === 0 ? (
            <p className="p-8 text-center text-sm font-bold text-slate-400">
              Tidak ada akun lain.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {otherAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-black text-slate-900">{account.email}</p>
                    <p className="text-xs font-bold text-slate-400">
                      Role: {account.role} • Status: {account.status}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <PakMemberActionButton
                      userId={account.id}
                      action="SET_TIM_PAK"
                      label="Jadikan Tim PAK"
                    />

                    {account.role !== "ADMIN" && (
                      <AdminPasswordResetForm
                        userId={account.id}
                        email={account.email}
                        compact
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
