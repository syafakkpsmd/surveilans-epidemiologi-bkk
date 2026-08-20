'use client';

/**
 * components/status-laporan/KontrolPeriode.tsx
 * Picker periode untuk 1 varian (Mingguan ATAU Bulanan) -- TIDAK ADA
 * toggle switch lagi, karena sejak status-laporan/page.tsx digabung
 * jadi 1 halaman (Mingguan di atas, Bulanan di bawah, tampil
 * bersamaan), toggle antar-tab sudah tidak relevan.
 *
 * Dipanggil 2x terpisah di page.tsx: 1x dengan varian="mingguan"
 * (pakai param URL tahun_mg + minggu), 1x dengan varian="bulanan"
 * (pakai param URL tahun_bl + bulan) -- param dipisah supaya picker
 * tahun di 2 blok tidak saling menimpa di URL yang sama.
 */

import { useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const BULAN_LABEL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type Props =
  | { varian: 'mingguan'; tahun: number; minggu: number }
  | { varian: 'bulanan'; tahun: number; bulan: number };

export default function KontrolPeriode(props: Props) {
  const { varian, tahun } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const paramTahun = varian === 'mingguan' ? 'tahun_mg' : 'tahun_bl';

  const [tahunInput, setTahunInput] = useState(String(tahun));
  const [mingguInput, setMingguInput] = useState(
    varian === 'mingguan' ? String(props.minggu) : '',
  );
  const [bulanInput, setBulanInput] = useState(
    varian === 'bulanan' ? String(props.bulan) : '',
  );

  // Sinkronkan ulang state lokal kalau prop dari server berubah
  // (misalnya user navigasi lewat tombol back/forward browser).
  useEffect(() => {
    setTahunInput(String(tahun));
    if (varian === 'mingguan') setMingguInput(String(props.minggu));
    if (varian === 'bulanan') setBulanInput(String(props.bulan));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, varian === 'mingguan' ? props.minggu : undefined, varian === 'bulanan' ? props.bulan : undefined]);

  function terapkanMingguan() {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramTahun, tahunInput);
    params.set('minggu', mingguInput);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function terapkanBulanan(bulanBaru?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramTahun, tahunInput);
    params.set('bulan', bulanBaru ?? bulanInput);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {varian === 'mingguan' ? (
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