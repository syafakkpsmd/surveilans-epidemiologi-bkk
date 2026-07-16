// components/global-emerging/GlobalEmergingBreakdownCards.tsx
// Server-renderable (tidak butuh interaktivitas) — breakdown total kasus
// per penyakit dan per negara, ditampilkan sebagai bar-list, mengikuti
// pola card bar-list yang sudah dipakai di Dashboard Utama (Segmen 5).
// Warna teal/navy (BUKAN warna risiko hijau/kuning/merah, karena itu
// khusus kolom rba di modul COP/PHQC).

import type { RingkasanPenyakitEmerging } from '@/types/global-emerging.types';

interface GlobalEmergingBreakdownCardsProps {
  data: RingkasanPenyakitEmerging[];
}

function agregasiPer(data: RingkasanPenyakitEmerging[], kunci: 'penyakit' | 'negara') {
  const peta = new Map<string, number>();
  for (const row of data) {
    peta.set(row[kunci], (peta.get(row[kunci]) ?? 0) + row.total_kasus);
  }
  return Array.from(peta.entries())
    .map(([nama, total]) => ({ nama, total }))
    .sort((a, b) => b.total - a.total);
}

function BarList({ judul, items }: { judul: string; items: { nama: string; total: number }[] }) {
  const maksimum = Math.max(...items.map((i) => i.total), 1);

  return (
    <div className="rounded-[10px] bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[#0F2A38]">{judul}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada data.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.nama}>
              <div className="mb-1 flex justify-between text-xs text-gray-600">
                <span>{item.nama}</span>
                <span className="font-medium">{item.total}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EEF1F4]">
                <div
                  className="h-2 rounded-full bg-[#0F4C5C]"
                  style={{ width: `${(item.total / maksimum) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function GlobalEmergingBreakdownCards({ data }: GlobalEmergingBreakdownCardsProps) {
  const perPenyakit = agregasiPer(data, 'penyakit');
  const perNegara = agregasiPer(data, 'negara');

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <BarList judul="Total Kasus per Penyakit" items={perPenyakit} />
      <BarList judul="Total Kasus per Negara" items={perNegara} />
    </div>
  );
}
