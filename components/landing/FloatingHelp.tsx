/** @format */
import { HelpCircle } from "lucide-react";
export default function FloatingHelp() {
  return (
    <a
      href="#kontak"
      className="fixed bottom-8 right-8 z-40 hidden items-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-blue-700 md:flex"
    >
      <HelpCircle size={22} />
      Pusat Bantuan
    </a>
  );
}
