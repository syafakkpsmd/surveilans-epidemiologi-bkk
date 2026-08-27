import KarhutlaClient from './KarhutlaClient';
import { ambilTrenIspaPm25, ambilHotspotCache } from '@/lib/supabase/queries-karhutla-server';

export const dynamic = 'force-dynamic'; // data harian, jangan di-cache statis

export default async function HalamanKarhutla() {
  const [trenAwal, hotspotAwal] = await Promise.all([
    ambilTrenIspaPm25({ wilayahKey: 'Semua', hariTerakhir: 30 }),
    ambilHotspotCache(3),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Surveilans Karhutla &amp; ISPA</h1>
        <p className="text-sm text-gray-500">
          Pemantauan titik panas (NASA FIRMS) dan kasus ISPA harian di wilayah kerja BKK Kelas I Samarinda
        </p>
      </div>

      <KarhutlaClient trenAwal={trenAwal} hotspotAwal={hotspotAwal} />
    </div>
  );
}