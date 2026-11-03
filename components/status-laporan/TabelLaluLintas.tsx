/**
 * components/status-laporan/TabelLaluLintas.tsx
 * Satu komponen tabel untuk matriks mingguan DAN bulanan menu Lalu Lintas
 * Orang. Kolom dikirim lewat props, jadi tidak perlu dua komponen.
 */

import BadgeStatus from './BadgeStatus';
import type { BarisLaluLintas, SelStatusLlo } from '@/lib/status-laporan/lalu-lintas-orang';

type Kolom<K extends string> = { kunci: K; label: string };

function Sel({ status }: { status: SelStatusLlo }) {
  if (status === 'gagal') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
        ⚠️ Gagal muat
      </span>
    );
  }
  return <BadgeStatus status={status} />;
}

const IKON = { Bandara: '✈️', Pelabuhan: '⚓', BKK: '🏢' } as const;

export default function TabelLaluLintas<K extends string>({
  kolom,
  data,
  lebarMin = 'min-w-220',
}: {
  kolom: readonly Kolom<K>[];
  data: BarisLaluLintas<K>[];
  lebarMin?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className={`w-full ${lebarMin} text-sm`}>
        <thead>
          <tr className="bg-[#0F2A38] text-left text-white">
            <th className="px-4 py-3 font-medium">Wilayah Kerja</th>
            {kolom.map((k) => (
              <th key={k.kunci} className="px-3 py-3 text-center font-medium">
                {k.label}
              </th>
            ))}
            <th className="px-4 py-3 font-medium">Kelengkapan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((baris, idx) => (
            <tr key={baris.kode} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 font-medium text-gray-700">
                <span className="mr-1">{IKON[baris.jenis]}</span>
                {baris.nama}
              </td>
              {kolom.map((k) => (
                <td key={k.kunci} className="px-3 py-3 text-center">
                  <Sel status={baris.status[k.kunci]} />
                </td>
              ))}
              <td className="px-4 py-3">
                {baris.kelengkapanPct === null ? (
                  <span className="text-gray-300">—</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${baris.kelengkapanPct === 100 ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${baris.kelengkapanPct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs text-gray-500">{baris.kelengkapanPct}%</span>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
