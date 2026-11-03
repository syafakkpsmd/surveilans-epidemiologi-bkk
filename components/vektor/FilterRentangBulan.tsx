'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function FilterRentangBulan() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const tahunAktif = searchParams.get('tahun') ?? new Date().getFullYear().toString();

  const [bulanDari, setBulanDari] = useState(searchParams.get('bulanDari')?.split('-')[1] ?? '1');
  const [bulanSampai, setBulanSampai] = useState(searchParams.get('bulanSampai')?.split('-')[1] ?? '12');

  function terapkan() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('bulanDari', `${tahunAktif}-${bulanDari.padStart(2, '0')}`);
    params.set('bulanSampai', `${tahunAktif}-${bulanSampai.padStart(2, '0')}`);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-500">Rentang Bulan</span>
      <select
        value={bulanDari}
        onChange={(e) => setBulanDari(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1"
      >
        {NAMA_BULAN.map((nama, i) => (
          <option key={i} value={i + 1}>{nama}</option>
        ))}
      </select>
      <span>s.d.</span>
      <select
        value={bulanSampai}
        onChange={(e) => setBulanSampai(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1"
      >
        {NAMA_BULAN.map((nama, i) => (
          <option key={i} value={i + 1}>{nama}</option>
        ))}
      </select>
      <button
        onClick={terapkan}
        disabled={isPending}
        className="rounded-lg bg-[#0F4C5C] px-3 py-1 text-white hover:bg-[#0d3f4c] disabled:opacity-50"
      >
        {isPending ? 'Memuat...' : 'Terapkan'}
      </button>
    </div>
  );
}