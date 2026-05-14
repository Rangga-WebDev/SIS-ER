/** @format */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SISTER PAK",
  description: "Portal dokumen kenaikan jabatan dosen.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
