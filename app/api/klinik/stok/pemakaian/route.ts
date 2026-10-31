import { NextResponse } from 'next/server';
import { createDbServiceClient } from '@/lib/db/serviceRole';
import { getStokDenganFilter, getSumberAktifStok, idSumberStok } from '@/lib/klinik/stok-queries';
import { ambilTerbit, ambilRusak, JENIS_STOK_LABEL } from '@/lib/klinik/agregasiStok';
import { getAksesKlinik } from '@/lib/klinik/akses';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mulai = searchParams.get('mulai');
  const akhir = searchParams.get('akhir');
  const diminta = searchParams.get('klinik')?.split(',').filter(Boolean);
  // petugas_klinik hanya boleh klinik yang ditautkan ke akunnya, apa pun isi parameter
  const akses = await getAksesKlinik();
  const klinikIds = akses.semua ? diminta : (diminta?.length ? diminta.filter((id) => akses.klinikIds.includes(id)) : akses.klinikIds);
  if (!akses.semua && klinikIds?.length === 0) return NextResponse.json({ success: true, data: [], tidakAdaAkses: true });

  if (!mulai || !akhir) {
    return NextResponse.json(
      { error: 'Parameter mulai dan akhir wajib diisi (format yyyy-MM-dd)' },
      { status: 400 }
    );
  }

  const supabase = createDbServiceClient();
  let query = supabase.from('klinik_binaan').select('id, nama_klinik, kategori, spreadsheet_id');
  if (klinikIds?.length) query = query.in('id', klinikIds);
  const { data: daftarKlinik } = await query;

  const klinikStok = (daftarKlinik ?? []) as { id: string; nama_klinik: string; spreadsheet_id: string | null }[];
  const sumberAktif = await getSumberAktifStok(klinikStok);
  // petakan spreadsheet_id -> klinik, lalu buang baris dari sumber yang tidak aktif (hindari hitung ganda Sheets + aplikasi)
  const klinikDariId = new Map<string, string>();
  for (const k of klinikStok) for (const id of idSumberStok(k)) klinikDariId.set(id, k.id);
  const semuaBaris = await getStokDenganFilter([...klinikDariId.keys()], mulai, akhir);
  const baris = semuaBaris.filter((b) => sumberAktif.get(`${klinikDariId.get(b.spreadsheetId)}|${b.jenisStok}`) === b.spreadsheetId);

  const jenisUnik = Array.from(new Set(baris.map((b) => b.jenisStok)));
  const data = jenisUnik.map((jenis) => {
    const barisJenis = baris.filter((b) => b.jenisStok === jenis);
    return {
      jenis,
      label: JENIS_STOK_LABEL[jenis] ?? jenis,
      Terbit: barisJenis.reduce((a, b) => a + ambilTerbit(b.data), 0),
      Rusak: barisJenis.reduce((a, b) => a + ambilRusak(b.data), 0),
    };
  });

  return NextResponse.json({ success: true, data });
}