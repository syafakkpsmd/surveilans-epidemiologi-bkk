import type { Metadata } from "next";
import "./globals.css";
import { NAMA_BKK } from '@/lib/konfigurasi/instansi';

export const metadata: Metadata = {
  title: `Surveilans Epidemiologi ${NAMA_BKK}`,
  description:
    `Dashboard surveilans Epidemiologi ${NAMA_BKK}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
