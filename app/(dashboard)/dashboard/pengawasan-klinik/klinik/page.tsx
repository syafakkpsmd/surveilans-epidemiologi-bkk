// app/(dashboard)/dashboard/pengawasan-klinik/klinik/page.tsx
import { createDbClient } from '@/lib/db/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { redirect } from 'next/navigation';
import KelolaKlinikClient from './KelolaKlinikClient';
import { getDbClient } from '@/lib/db/client';
import { NAMA_KOTA_BKK } from '@/lib/konfigurasi/instansi';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';

export default async function KelolaKlinikPage() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || role !== 'admin') redirect('/login');

  const supabase = await createDbClient();
  const { data: daftarKlinik } = await supabase
  .from('klinik_binaan')
  .select('*')
  .order('kabupaten_kota')
  .order('nama_klinik');

  // Saran kabupaten/kota: yang sudah dipakai klinik binaan dan poliklinik non-BKK, ditambah kota kedudukan BKK.
  const saran = new Set<string>([NAMA_KOTA_BKK]);
  for (const k of daftarKlinik ?? []) if (k.kabupaten_kota) saran.add(String(k.kabupaten_kota).trim());
  try {
    const { rows } = await getDbClient().execute(`SELECT DISTINCT kabupaten_kota FROM poliklinik_non_bkk WHERE kabupaten_kota IS NOT NULL`);
    for (const r of rows) if (r.kabupaten_kota) saran.add(String(r.kabupaten_kota).trim());
  } catch {
    // tabel poliklinik_non_bkk belum ada: abaikan, saran dari klinik binaan sudah cukup
  }

  // Pilihan wilayah kerja: yang aktif (bukan kantor induk) + wilayah nonaktif yang masih dipakai klinik, agar tidak hilang saat edit.
  const kamus = await getKamusWilker();
  const dipakai = new Set((daftarKlinik ?? []).map((k) => (k as { kode_wilker?: string | null }).kode_wilker).filter(Boolean));
  const opsiWilayah = kamus.semua
    .filter((w) => w.jenis !== 'Kantor' && (w.aktif || dipakai.has(w.kode)))
    .map((w) => ({ kode: w.kode, nama: w.nama }));

  return (
    <KelolaKlinikClient
      daftarKlinik={daftarKlinik ?? []}
      saranKabKota={[...saran].filter(Boolean).sort()}
      opsiWilayah={opsiWilayah}
    />
  );
}