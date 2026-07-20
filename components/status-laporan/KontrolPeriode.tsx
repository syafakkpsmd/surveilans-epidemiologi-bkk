'use client';

/**
 * components/status-laporan/KontrolPeriode.tsx
 * Toggle tab Mingguan/Bulanan + picker tahun+minggu (mingguan) atau
 * tahun+bulan (bulanan). Update lewat URL search params.
 *
 * PERUBAHAN: input Tahun & Minggu/Bulan tidak lagi masing-masing
 * memicu router.push() sendiri lewat onBlur terpisah (itu penyebab
 * 2 request RSC dobel kalau user pindah fokus antar field). Sekarang
 * nilainya disimpan di state lokal dulu, baru di-"commit" ke URL
 * lewat SATU titik (tombol Terapkan / onBlur di field terakhir),
 * dan pakai router.replace + startTransition supaya tidak menumpuk
 * history dan tidak terasa nge-freeze saat data baru dimuat.
 */

import { useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const BULAN_LABEL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type Props = {
  tab: 'mingguan' | 'bulanan';
  tahun: number;
  minggu: number;
  bulan: number;
};

export default function KontrolPeriode({ tab, tahun, minggu, bulan }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // State lokal untuk input -- tidak langsung navigasi tiap perubahan.
  const [tahunInput, setTahunInput] = useState(String(tahun));
  const [mingguInput, setMingguInput] = useState(String(minggu));
  const [bulanInput, setBulanInput] = useState(String(bulan));

  // Sinkronkan ulang state lokal kalau prop dari server berubah
  // (misalnya user navigasi lewat tombol back/forward browser).
  useEffect(() => {
    setTahunInput(String(tahun));
    setMingguInput(String(minggu));
    setBulanInput(String(bulan));
  }, [tahun, minggu, bulan]);

  function pindahTab(tabBaru: 'mingguan' | 'bulanan') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabBaru);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function terapkanMingguan() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tahun', tahunInput);
    params.set('minggu', mingguInput);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function terapkanBulanan(bulanBaru?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tahun', tahunInput);
    params.set('bulan', bulanBaru ?? bulanInput);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex overflow-hidden rounded-full border border-gray-200">
        <button
          type="button"
          onClick={() => pindahTab('mingguan')}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'mingguan' ? 'bg-[#0F2A38] text-white' : 'bg-white text-gray-600'
          }`}
        >
          Mingguan
        </button>
        <button
          type="button"
          onClick={() => pindahTab('bulanan')}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'bulanan' ? 'bg-[#0F2A38] text-white' : 'bg-white text-gray-600'
          }`}
        >
          Bulanan
        </button>
      </div>

      {tab === 'mingguan' ? (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">Tahun</label>
          <input
            type="number"
            value={tahunInput}
            onChange={(e) => setTahunInput(e.target.value)}
            onBlur={terapkanMingguan}
            onKeyDown={(e) => e.key === 'Enter' && terapkanMingguan()}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1"
          />
          <label className="text-gray-500">Minggu Epid</label>
          <input
            type="number"
            min={1}
            max={53}
            value={mingguInput}
            onChange={(e) => setMingguInput(e.target.value)}
            onBlur={terapkanMingguan}
            onKeyDown={(e) => e.key === 'Enter' && terapkanMingguan()}
            className="w-16 rounded-lg border border-gray-200 px-2 py-1"
          />
          {isPending && <span className="text-xs text-gray-400">Memuat…</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">Tahun</label>
          <input
            type="number"
            value={tahunInput}
            onChange={(e) => setTahunInput(e.target.value)}
            onBlur={() => terapkanBulanan()}
            onKeyDown={(e) => e.key === 'Enter' && terapkanBulanan()}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1"
          />
          <label className="text-gray-500">Bulan</label>
          <select
            value={bulanInput}
            onChange={(e) => {
              setBulanInput(e.target.value);
              terapkanBulanan(e.target.value);
            }}
            className="rounded-lg border border-gray-200 px-2 py-1"
          >
            {BULAN_LABEL.map((label, idx) => (
              <option key={label} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
          {isPending && <span className="text-xs text-gray-400">Memuat…</span>}
        </div>
      )}
    </div>
  );
}