import { ambilDataSiaos } from '@/lib/db/modul/queriesSiaos';
import { getWilkerModul } from '@/lib/wilayah-kerja/server';
import { WARNA_SERI_WILKER } from '@/lib/wilayah-kerja/warna';
import { bacaTahun } from '@/lib/tahun';
import SiaosClient from './SiaosClient';

export const dynamic = 'force-dynamic';

export default async function SiaosPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const { tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? bacaTahun(tahunParam, 0) : new Date().getFullYear();

  const [data, wilayah] = await Promise.all([ambilDataSiaos(tahun), getWilkerModul('siaos')]);

  const lokasi = wilayah.map((w, i) => ({ nama: w.namaPendek, warna: w.warna ?? WARNA_SERI_WILKER[i % WARNA_SERI_WILKER.length] }));

  return <SiaosClient key={tahun} data={data} lokasi={lokasi} />;
}