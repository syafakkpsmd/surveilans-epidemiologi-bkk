'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react'; // 1. Import useTransition

function hitungMingguEpidSaatIni(): { tahunEpid: number; mingguEpid: number } {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  let yr = d.getFullYear();

  function hitungAwalMinggu1(tahun: number) {
    const j1 = new Date(tahun, 0, 1);
    const dow = j1.getDay();
    const awal = new Date(j1);
    if (dow <= 3) {
      awal.setDate(j1.getDate() - dow);
    } else {
      awal.setDate(j1.getDate() + (7 - dow));
    }
    return awal;
  }

  let minggu1Mulai = hitungAwalMinggu1(yr);

  if (d < minggu1Mulai) {
    yr -= 1;
    minggu1Mulai = hitungAwalMinggu1(yr);
  }

  const selisihHari = Math.floor((d.getTime() - minggu1Mulai.getTime()) / 86400000);
  const mingguEpid = Math.floor(selisihHari / 7) + 1;

  return { tahunEpid: yr, mingguEpid };
}

type FilterRentangMingguProps = {
  /** Minggu akhir bawaan bila alamat belum punya mgSampai. Tanpa ini: minggu epid hari ini (perilaku lama). */
  mingguAkhirDefault?: number;
  /** Jumlah minggu pada pilihan (52 atau 53). Bawaan 52. */
  jumlahMinggu?: number;
};

export default function FilterRentangMinggu({ mingguAkhirDefault, jumlahMinggu = 52 }: FilterRentangMingguProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 2. Tambahkan hook useTransition
  const [isPending, startTransition] = useTransition();

  const { mingguEpid: mingguSaatIni } = hitungMingguEpidSaatIni();
  const defaultDari = '1';
  const defaultSampai = String(mingguAkhirDefault ?? mingguSaatIni);

  const urlDari = searchParams.get('mgDari') || defaultDari;
  const urlSampai = searchParams.get('mgSampai') || defaultSampai;

  const [mgDari, setMgDari] = useState(urlDari);
  const [mgSampai, setMgSampai] = useState(urlSampai);

  useEffect(() => {
    setMgDari(urlDari);
    setMgSampai(urlSampai);
  }, [urlDari, urlSampai]);

  const daftarMinggu = Array.from({ length: jumlahMinggu }, (_, i) => i + 1);

  const handleTerapkan = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mgDari', mgDari);
    params.set('mgSampai', mgSampai);

    // 3. Bungkus router.push di dalam startTransition
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-600">Rentang Minggu</span>

      <select
        value={mgDari}
        onChange={(e) => setMgDari(e.target.value)}
        disabled={isPending}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none disabled:opacity-50"
      >
        {daftarMinggu.map((m) => (
          <option key={`awal-${m}`} value={m}>
            Mg-{m}
          </option>
        ))}
      </select>

      <span className="text-gray-500">s.d.</span>

      <select
        value={mgSampai}
        onChange={(e) => setMgSampai(e.target.value)}
        disabled={isPending}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none disabled:opacity-50"
      >
        {daftarMinggu.map((m) => (
          <option key={`akhir-${m}`} value={m}>
            Mg-{m}
          </option>
        ))}
      </select>

      {/* 4. Tampilkan status loading saat isPending === true */}
      <button
        type="button"
        onClick={handleTerapkan}
        disabled={isPending}
        className="rounded bg-[#063940] px-3 py-1 font-medium text-white hover:bg-[#04282d] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Memuat...' : 'Terapkan'}
      </button>
    </div>
  );
}