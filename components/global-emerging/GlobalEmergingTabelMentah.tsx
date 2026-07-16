'use client';

// components/global-emerging/GlobalEmergingTabelMentah.tsx
// Client Component: tabel data mentah, collapsible, untuk kebutuhan
// verifikasi/audit data oleh petugas (pola sama seperti Segmen 6/7).

import { useState } from 'react';
import type { LaporanPenyakitEmerging } from '@/types/global-emerging.types';

interface GlobalEmergingTabelMentahProps {
  data: LaporanPenyakitEmerging[];
}

export default function GlobalEmergingTabelMentah({ data }: GlobalEmergingTabelMentahProps) {
  const [terbuka, setTerbuka] = useState(false);

  return (
    <div className="rounded-[10px] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setTerbuka(!terbuka)}
        className="flex w-full items-center justify-between p-4 text-sm font-semibold text-[#0F2A38]"
      >
        <span>Data Mentah ({data.length} baris) — untuk verifikasi/audit</span>
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
              {data.map((row) => (
                <tr key={row.id} className="border-t border-gray-50">
                  <td className="py-2 pr-4">{row.penyakit}</td>
                  <td className="py-2 pr-4">{row.negara}</td>
                  <td className="py-2 pr-4">
                    {row.jenis_periode === 'mingguan'
                      ? `M${row.minggu_epid} / ${row.tahun_epid}`
                      : `Bln ${row.bulan} / ${row.tahun_epid}`}
                  </td>
                  <td className="py-2 pr-4">{row.jumlah_kasus}</td>
                  <td className="py-2 pr-4">{row.jumlah_kematian}</td>
                  <td className="py-2 pr-4 text-gray-500">{row.sumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">Tidak ada data.</p>
          )}
        </div>
      )}
    </div>
  );
}
