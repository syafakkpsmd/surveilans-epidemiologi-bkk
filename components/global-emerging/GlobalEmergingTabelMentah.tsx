'use client';

// components/global-emerging/GlobalEmergingTabelMentah.tsx
// Client Component: tabel data mentah, collapsible, untuk kebutuhan
// verifikasi/audit data oleh petugas (pola sama seperti Segmen 6/7).

import { useState } from 'react';
import type { LaporanPenyakitEmerging } from '@/types/global-emerging.types';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

interface GlobalEmergingTabelMentahProps {
  data: LaporanPenyakitEmerging[];
}

export default function GlobalEmergingTabelMentah({ data }: GlobalEmergingTabelMentahProps) {
  const [terbuka, setTerbuka] = useState(false);

  const dataTerbaru = [...data]
    .sort((a, b) => {
      if (a.tahun_epid !== b.tahun_epid) return b.tahun_epid - a.tahun_epid;
      const periodeA = a.jenis_periode === 'mingguan' ? a.minggu_epid : a.bulan;
      const periodeB = b.jenis_periode === 'mingguan' ? b.minggu_epid : b.bulan;
      return (periodeB ?? 0) - (periodeA ?? 0);
    })
    .slice(0, 10);

  return (
    <div className="rounded-[10px] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setTerbuka(!terbuka)}
        className="flex w-full items-center justify-between p-4 text-sm font-semibold text-[#0F2A38]"
      >
        <span>Data Mentah (10 dari {data.length} baris) untuk Verifikasi</span>
        <span>{terbuka ? '▲' : '▼'}</span>
      </button>

      {terbuka && (
        <div className="overflow-x-auto border-t border-gray-100 p-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="pb-2 pr-4">Penyakit</th>
                <th className="pb-2 pr-4">Negara</th>
                <th className="pb-2 pr-4">Periode</th>
                <th className="pb-2 pr-4">Kasus</th>
                <th className="pb-2 pr-4">Kematian</th>
                <th className="pb-2 pr-4">Sumber</th>
              </tr>
            </thead>
            <tbody>
              {dataTerbaru.map((row) => (
                <tr key={row.id} className="border-t border-gray-50">
                  <td className="py-2 pr-4">{row.penyakit}</td>
                  <td className="py-2 pr-4">{row.negara}</td>
                  <td className="py-2 pr-4">
                    {row.jenis_periode === 'mingguan'
                      ? `M${row.minggu_epid} / ${row.tahun_epid}`
                      : `${NAMA_BULAN[(row.bulan ?? 1) - 1] ?? row.bulan} ${row.tahun_epid}`}
                  </td>
                  <td className="py-2 pr-4">{row.jumlah_kasus}</td>
                  <td className="py-2 pr-4">{row.jumlah_kematian}</td>
                  <td className="py-2 pr-4 text-gray-500">{row.sumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dataTerbaru.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">Tidak ada data.</p>
          )}
        </div>
      )}
    </div>
  );
}