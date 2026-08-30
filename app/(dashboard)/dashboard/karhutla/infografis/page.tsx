import InfografisClient from './InfografisClient';
import { ambilRingkasanInfografisHarian } from '@/lib/supabase/queries-karhutla-server';
import { tanggalWitaHariIni } from '@/lib/karhutla/infografis-utils';

export const dynamic = 'force-dynamic';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export default async function HalamanInfografisKarhutla({
  searchParams,
}: {
  searchParams: Promise<{ tanggal?: string }>;
}) {
  const params = await searchParams;
  const tanggalAwal = params.tanggal && POLA_TANGGAL.test(params.tanggal) ? params.tanggal : tanggalWitaHariIni();

  let dataAwal = null;
  try {
    dataAwal = await ambilRingkasanInfografisHarian(tanggalAwal);
  } catch (err) {
    console.error('[HalamanInfografisKarhutla]', err);
  }

  return <InfografisClient tanggalAwal={tanggalAwal} dataAwal={dataAwal} />;
}
