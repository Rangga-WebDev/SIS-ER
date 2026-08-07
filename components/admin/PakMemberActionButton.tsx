/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Props = {
  userId: string;
  action: "SET_TIM_PAK" | "SET_ADMIN" | "ACTIVATE" | "SUSPEND";
  label: string;
  tone?: "default" | "danger";
};

export default function PakMemberActionButton({
  userId,
  action,
  label,
  tone = "default",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/tim-pak/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Gagal memperbarui akun.");
        return;
      }

      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={run}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition disabled:opacity-60 ${
          tone === "danger"
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
        }`}
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        {label}
      </button>

      {error && (
        <span className="max-w-48 text-[11px] font-bold text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
