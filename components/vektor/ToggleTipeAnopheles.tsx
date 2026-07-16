'use client';

// ================================================================
// SEGMEN 11 — components/vektor/ToggleTipeAnopheles.tsx
// Toggle tab "Nyamuk Dewasa" | "Larva" dalam satu halaman (bukan
// 2 route terpisah), sesuai KONTEKS PROYEK Segmen 11.
// ================================================================

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function ToggleTipeAnopheles() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tipeAktif = (searchParams.get('tipe') ?? 'dewasa') as 'dewasa' | 'larva';

  function pilihTipe(tipe: 'dewasa' | 'larva') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tipe', tipe);
    router.push(`${pathname}?${params.toString()}`);
  }

  const kelasTab = (aktif: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition ${
      aktif ? 'bg-[#0F4C5C] text-white' : 'bg-white text-gray-600 border border-gray-300'
    }`;

  return (
    <div className="flex gap-2">
      <button className={kelasTab(tipeAktif === 'dewasa')} onClick={() => pilihTipe('dewasa')}>
        🦟 Nyamuk Dewasa
      </button>
      <button className={kelasTab(tipeAktif === 'larva')} onClick={() => pilihTipe('larva')}>
        🔬 Larva
      </button>
    </div>
  );
}