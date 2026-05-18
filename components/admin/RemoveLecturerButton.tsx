/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export default function RemoveLecturerButton({
  lecturerId,
  lecturerName,
}: {
  lecturerId: string;
  lecturerName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const removeLecturer = async () => {
    const confirmed = window.confirm(
      `Keluarkan ${lecturerName} dari daftar dosen aktif? Data dokumen tetap tersimpan, tetapi akun akan dinonaktifkan.`,
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/dosen/${lecturerId}`, {
        method: "DELETE",
      });

      const json = await response.json();

      if (!response.ok) {
        alert(json.message || "Gagal mengeluarkan dosen.");
        return;
      }

      alert(json.message || "Dosen berhasil dikeluarkan.");
      router.refresh();
    } catch {
      alert("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={removeLecturer}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Trash2 size={16} />
      )}
      Keluarkan
    </button>
  );
}
