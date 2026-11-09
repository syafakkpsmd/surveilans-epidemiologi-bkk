'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type FilterRentangBulanProps = {
  /** Bulan akhir bawaan bila alamat belum punya bulanSampai (1-12). Tanpa ini: 12 (perilaku lama). */
  bulanAkhirDefault?: number;
};

export default function FilterRentangBulan({ bulanAkhirDefault }: FilterRentangBulanProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const tahunAktif = searchParams.get('tahun') ?? new Date().getFullYear().toString();

  const urlDari = searchParams.get('bulanDari')?.split('-')[1] ?? '1';
  const urlSampai = searchParams.get('bulanSampai')?.split('-')[1] ?? String(bulanAkhirDefault ?? 12);

  const [bulanDari, setBulanDari] = useState(urlDari);
  const [bulanSampai, setBulanSampai] = useState(urlSampai);

  // Ikuti alamat (mis. saat tahun diganti dan rentang direset)
  useEffect(() => {
    setBulanDari(urlDari);
    setBulanSampai(urlSampai);
  }, [urlDari, urlSampai]);

  function terapkan() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('bulanDari', `${tahunAktif}-${bulanDari.padStart(2, '0')}`);
    params.set('bulanSampai', `${tahunAktif}-${bulanSampai.padStart(2, '0')}`);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
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