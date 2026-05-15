/** @format */

import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "JAFUNG SMART",
  description: "Dashboard SISTER PAK Universitas Muhammadiyah Makassar",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <link rel="icon" href="/logo-unismuh.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
