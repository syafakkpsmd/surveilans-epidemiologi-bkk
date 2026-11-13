'use client';
import { NAMA_RESMI_BKK } from '@/lib/konfigurasi/instansi';
// components/media-tanah/TanahClient.tsx
// Halaman dashboard Media Tanah (publik). Input/unggah/riwayat dipindah ke TanahInputClient (/dashboard/media-tanah/input).
import { useMemo } from 'react';
import Link from 'next/link';
import { buatKamus, type Wilayah } from '@/lib/wilayah-kerja';
import TanahDashboard from './TanahDashboard';

export default function TanahClient({ wilayah, tahun, isStaf }: { wilayah: Wilayah[]; tahun: number; isStaf: boolean }) {
  const wk = useMemo(() => buatKamus(wilayah), [wilayah]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pemeriksaan Kesehatan Lingkungan Media Tanah</h1>
          <p className="text-sm text-slate-600">{NAMA_RESMI_BKK}</p>
        </div>
        <Link
          href="/dashboard/media-tanah/input"
          className="rounded-md border border-teal-700 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          {isStaf ? 'Input data & unggah Excel' : 'Login untuk input data'}
        </Link>
      </div>

      <TanahDashboard wk={wk} tahun={tahun} />
    </main>
  );
}

