/**
 * components/status-laporan/TabelBulanan.tsx
 * Matriks bulanan: 7 wilker x {DBD, Tikus, Anoph, Malaria, TB, HIV, Diare}
 * + kolom Kelengkapan (%) di kanan, mengikuti gaya visual gambar acuan
 * (progress bar per wilker).
 */

import { KEGIATAN_BULANAN } from '@/lib/status-laporan/core';
import type { BarisMatriksBulanan } from '@/lib/status-laporan/core';
import BadgeStatus from './BadgeStatus';

export default function TabelBulanan({ data }: { data: BarisMatriksBulanan[] }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full min-w-[880px] text-sm">
        <thead>
          <tr className="bg-[#0F2A38] text-left text-white">
            <th className="px-4 py-3 font-medium">Wilayah Kerja</th>
            {KEGIATAN_BULANAN.map((kegiatan) => (
              <th key={kegiatan} className="px-3 py-3 text-center font-medium">
                {kegiatan}
              </th>
            ))}
            <th className="px-4 py-3 font-medium">Kelengkapan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((baris, idx) => (
            <tr key={baris.kode} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 font-medium text-gray-700">{baris.nama}</td>
              {KEGIATAN_BULANAN.map((kegiatan) => (
                <td key={kegiatan} className="px-3 py-3 text-center">
                  <BadgeStatus status={baris.status[kegiatan]} />
                </td>
              ))}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${
                        baris.kelengkapanPct === 100 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${baris.kelengkapanPct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-gray-500">
                    {baris.kelengkapanPct}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}