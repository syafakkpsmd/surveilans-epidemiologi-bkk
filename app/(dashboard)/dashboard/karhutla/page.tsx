import KarhutlaClient from './KarhutlaClient';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import {
  ambilTrenIspaPm25, ambilHotspotCache,
  ambilDaftarWilayahIspa, ambilDaftarLokasiUdara,
  ambilDaftarWilayahKerjaSkdr,
} from '@/lib/supabase/queries-karhutla-server';

export const dynamic = 'force-dynamic';

export default async function HalamanKarhutla() {
  const [role, statusAkses, trenAwal, hotspotAwal, daftarWilayahIspa, daftarLokasiUdara, daftarWilayahSkdr] = await Promise.all([
    getUserRole(), // khusus tombol "Sinkronisasi Hotspot" (admin-only) -- JANGAN dipakai untuk Analisis AI
    getStatusAkses(), // khusus BoxAnalisisAI/BoxPrediksiAI, lihat catatan di lib/auth/getStatusAkses.ts
    ambilTrenIspaPm25({ wilayahKeys: [], hariTerakhir: 30 }),
    ambilHotspotCache(3),
    ambilDaftarWilayahIspa(),
    ambilDaftarLokasiUdara(),
    ambilDaftarWilayahKerjaSkdr(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Surveilans Karhutla &amp; ISPA</h1>
        <p className="text-sm text-gray-500">
          Pemantauan titik panas dan kasus ISPA harian di wilayah kerja BKK Kelas I Samarinda
        </p>
      </div>

      <KarhutlaClient
        role={role}
        sudahLoginAI={statusAkses.sudahLogin}
        roleAI={statusAkses.role}
        trenAwal={trenAwal}
        hotspotAwal={hotspotAwal}
        daftarWilayahIspa={daftarWilayahIspa}
        daftarLokasiUdara={daftarLokasiUdara}
        daftarWilayahSkdr={daftarWilayahSkdr}
      />
    </div>
  );
}