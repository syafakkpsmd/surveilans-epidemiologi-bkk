'use client';

// components/global-emerging/GlobalEmergingFilterBar.tsx
// Client Component: toggle Mingguan/Bulanan + filter penyakit & negara +
// filter rentang minggu/bulan. Pola: update searchParams via router.push.

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DAFTAR_PENYAKIT, DAFTAR_NEGARA, type JenisPeriode } from '@/types/global-emerging.types';

interface GlobalEmergingFilterBarProps {
  jenisAktif: JenisPeriode;
  penyakitAktif?: string;
  negaraAktif?: string;
  tahunAktif: number;
  mgAwal: number;
  mgAkhir: number;
  bulanAwal: number;
  bulanAkhir: number;
  mingguMaks: number;
}

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function daftarTahunPilihan(): number[] {
  const tahunSekarang = new Date().getFullYear();
  const tahun: number[] = [];
  for (let t = tahunSekarang; t >= tahunSekarang - 7; t--) {
    tahun.push(t);
  }
  return tahun;
}

export default function GlobalEmergingFilterBar({
  jenisAktif,
  penyakitAktif,
  negaraAktif,
  tahunAktif,
  mgAwal,
  mgAkhir,
  bulanAwal,
  bulanAkhir,
  mingguMaks,
}: GlobalEmergingFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[10px] bg-white p-4 shadow-sm">
      {/* Filter Tahun */}
      <select
        value={tahunAktif}
        onChange={(e) => updateParam('tahun', e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
      >
        {daftarTahunPilihan().map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Toggle Mingguan/Bulanan */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        {(['mingguan', 'bulanan'] as JenisPeriode[]).map((jenis) => (
          <button
            key={jenis}
            type="button"
            onClick={() => updateParam('jenis', jenis)}
            className={`px-4 py-2 text-sm font-medium transition ${
              jenisAktif === jenis
                ? 'bg-[#0F2A38] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {jenis === 'mingguan' ? 'Mingguan' : 'Bulanan'}
          </button>
        ))}
      </div>

      {/* Filter Rentang Periode */}
      {jenisAktif === 'mingguan' ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Mg</span>
          <select
            value={mgAwal}
            onChange={(e) => updateParam('mgAwal', e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm text-gray-700"
          >
            {Array.from({ length: mingguMaks }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span>s.d.</span>
          <select
            value={mgAkhir}
            onChange={(e) => updateParam('mgAkhir', e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm text-gray-700"
          >
            {Array.from({ length: mingguMaks }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <select
            value={bulanAwal}
            onChange={(e) => updateParam('bulanAwal', e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm text-gray-700"
          >
            {NAMA_BULAN.map((b, i) => (
              <option key={b} value={i + 1}>{b}</option>
            ))}
          </select>
          <span>s.d.</span>
          <select
            value={bulanAkhir}
            onChange={(e) => updateParam('bulanAkhir', e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm text-gray-700"
          >
            {NAMA_BULAN.map((b, i) => (
              <option key={b} value={i + 1}>{b}</option>
            ))}
          </select>
        </div>
      )}

      {/* Filter Penyakit */}
      <select
        value={penyakitAktif ?? ''}
        onChange={(e) => updateParam('penyakit', e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
      >
        <option value="">Semua Penyakit</option>
        {DAFTAR_PENYAKIT.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {/* Filter Negara */}
      <select
        value={negaraAktif ?? ''}
        onChange={(e) => updateParam('negara', e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
      >
        <option value="">Semua Negara</option>
        {DAFTAR_NEGARA.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      {(penyakitAktif || negaraAktif) && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-sm text-[#0F4C5C] underline"
        >
          Reset filter
        </button>
      )}
    </div>
  );
}