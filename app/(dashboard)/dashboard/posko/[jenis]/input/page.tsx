// app/(dashboard)/dashboard/posko/[jenis]/input/page.tsx
// Input data harian posko di aplikasi: pilih tanggal + wilayah, isian terisi otomatis bila sudah ada data.
import { notFound } from 'next/navigation';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { bolehKelolaPosko } from '@/lib/auth/aksesPosko';
import { SLUG_KE_JENIS, WILAYAH_POSKO, type WilayahPosko } from '@/lib/posko/konstanta';
import { ambilInputHarianPosko, ambilPeriodePosko, hariIniWita } from '@/lib/posko/queries';
import { tanggalSah } from '@/lib/posko/perintahInput';
import PoskoInputClient from '@/components/posko/PoskoInputClient';

export const dynamic = 'force-dynamic';

export default async function PoskoInputPage({
  params,
  searchParams,
}: {
  params: Promise<{ jenis: string }>;
  searchParams: Promise<{ tahun?: string; tanggal?: string; wilayah?: string }>;
}) {
  const { jenis } = await params;
  const sp = await searchParams;
  const posko = SLUG_KE_JENIS[jenis];
  if (!posko) notFound();

  const { role } = await getStatusAkses();
  const bolehKelola = bolehKelolaPosko(role);
  const tahun = sp.tahun && /^\d{4}$/.test(sp.tahun) ? Number(sp.tahun) : undefined;
  const { periode, catatan } = await ambilPeriodePosko(posko, tahun);

  const wilayah: WilayahPosko = (WILAYAH_POSKO as readonly string[]).includes(sp.wilayah ?? '')
    ? (sp.wilayah as WilayahPosko)
    : 'Samarinda';

  // tanggal boleh diinput: dari mulai periode sampai min(selesai, hari ini WITA)
  const hariIni = hariIniWita();
  const tanggalMaks = periode ? (hariIni < periode.tanggalSelesai ? hariIni : periode.tanggalSelesai) : '';
  const posokBelumMulai = !!periode && tanggalMaks < periode.tanggalMulai;
  let tanggal = '';
  if (periode && !posokBelumMulai) {
    const diminta = sp.tanggal && tanggalSah(sp.tanggal) ? sp.tanggal : tanggalMaks;
    tanggal = diminta < periode.tanggalMulai || diminta > tanggalMaks ? tanggalMaks : diminta;
  }

  const awal =
    bolehKelola && periode && tanggal ? await ambilInputHarianPosko(posko, periode.tahun, tanggal, wilayah) : null;

  return (
    <PoskoInputClient
      key={`${periode?.tahun}|${tanggal}|${wilayah}`} // ganti tanggal/wilayah -> form dimuat ulang dengan data tanggal itu
      slug={jenis}
      posko={posko}
      periode={periode}
      tanggal={tanggal}
      wilayah={wilayah}
      tanggalMaks={posokBelumMulai ? '' : tanggalMaks}
      awal={awal}
      bolehKelola={bolehKelola}
      catatan={[...catatan, ...(awal?.catatan ?? [])]}
    />
  );
}
