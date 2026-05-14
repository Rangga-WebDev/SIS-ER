/** @format */
"use client";
import { useRouter } from "next/navigation";
export default function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
  return (
    <button
      onClick={handleLogout}
      className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-slate-800"
    >
      Keluar
    </button>
  );
}
