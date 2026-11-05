import { ambilDataSiaos } from '@/lib/db/modul/queriesSiaos';
import { getWilkerModul } from '@/lib/wilayah-kerja/server';
import { WARNA_SERI_WILKER } from '@/lib/wilayah-kerja/warna';
import SiaosClient from './SiaosClient';

// Data selalu diambil langsung dari database saat request, tidak di-cache statis
export const dynamic = 'force-dynamic';

export default async function SiaosPage() {
  const [data, wilayah] = await Promise.all([ambilDataSiaos(), getWilkerModul('siaos')]);
  // Wilayah yang menjalankan SIAOS diatur di /dashboard/pengaturan-wilayah-kerja (modul "SIAOS").
  const lokasi = wilayah.map((w, i) => ({ nama: w.namaPendek, warna: w.warna ?? WARNA_SERI_WILKER[i % WARNA_SERI_WILKER.length] }));

  return <SiaosClient data={data} lokasi={lokasi} />;
}
