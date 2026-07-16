/**
 * components/status-laporan/TabelMingguan.tsx
 * Matriks mingguan: 7 wilker x {COP, PHQC, Pesawat}.
 * Sel non-aplikatif (mis. kolom Pesawat untuk wilker Pelabuhan) sudah
 * ditandai 'na' di data (lihat lib/status-laporan/core.ts) dan tampil
 * sebagai "—", bukan "Belum".
 */

import type { BarisMatriksMingguan } from '@/lib/status-laporan/core';
import BadgeStatus from './BadgeStatus';

export default function TabelMingguan({ data }: { data: BarisMatriksMingguan[] }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-[#0F2A38] text-left text-white">
            <th className="px-4 py-3 font-medium">Wilayah Kerja</th>
            <th className="px-4 py-3 text-center font-medium">COP</th>
            <th className="px-4 py-3 text-center font-medium">PHQC</th>
            <th className="px-4 py-3 text-center font-medium">Pesawat</th>
          </tr>
        </thead>
        <tbody>
          {data.map((baris, idx) => (
            <tr key={baris.kode} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 font-medium text-gray-700">
                <span className="mr-1">{baris.jenis === 'Bandara' ? '✈️' : '⚓'}</span>
                {baris.nama}
              </td>
              <td className="px-4 py-3 text-center">
                <BadgeStatus status={baris.cop} />
              </td>
              <td className="px-4 py-3 text-center">
                <BadgeStatus status={baris.phqc} />
              </td>
              <td className="px-4 py-3 text-center">
                <BadgeStatus status={baris.pesawat} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}