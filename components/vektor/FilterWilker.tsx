'use client';

// ================================================================
// SEGMEN 11 — components/vektor/FilterWilker.tsx
// Dropdown filter wilker generik, dipakai di semua halaman vektor.
// Update ?wilker=WK01 di URL lewat router.push (Server Component
// yang menjadi parent akan re-fetch data otomatis).
// ================================================================

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { WilkerRef } from '@/types/database.types';

export default function FilterWilker({ daftarWilker }: { daftarWilker: WilkerRef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const wilkerAktif = searchParams.get('wilker') ?? '';

  function ubahWilker(kode: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (kode) {
      params.set('wilker', kode);
    } else {
      params.delete('wilker');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={wilkerAktif}
      onChange={(e) => ubahWilker(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
    >
      // Sesudah
      <option value="">Semua Wilayah Kerja</option>
      {daftarWilker
        .filter((w) => !/bontang|tanjung bara/i.test(w.nama))
        .map((w) => (
          <option key={w.kode} value={w.kode}>
            {w.jenis === 'Bandara' ? '✈️' : '⚓'} {w.nama}
          </option>
        ))}
    </select>
  );
}