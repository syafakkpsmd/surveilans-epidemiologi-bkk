// lib/klinik/dataset-stok.ts
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { getStokTerbaruSemua } from './stok-queries';
import {
  hitungRingkasanKlinik,
  RingkasanStokKlinik,
  AMBANG_STOK_TETAP_DEFAULT,
  AMBANG_HARI_DEFAULT,
} from './agregasiStok';

// Jenis stok yang, kalau sisanya 0 di suatu klinik, BUKAN berarti kekurangan stok -
// melainkan klinik itu sudah beralih/berhenti pakai jenis ini. Jangan tampilkan sebagai
// peringatan atau ikut dihitung sebagai "klinik aktif" untuk jenis tersebut.
// Contoh: ICV sudah digantikan e-ICV di sebagian besar klinik.
const JENIS_DIABAIKAN_JIKA_NOL = ['icv'];

export async function getDatasetStokVaksin() {
  const supabase = createServiceRoleClient();
  const { data: daftarKlinik } = await supabase
    .from('klinik_binaan')
    .select('id, nama_klinik, kategori, spreadsheet_id')
    .order('nama_klinik');

  if (!daftarKlinik || daftarKlinik.length === 0) {
    return { ringkasan: [] as RingkasanStokKlinik[], gagalDimuat: false };
  }

  const idsValid = daftarKlinik.map((k) => k.spreadsheet_id).filter(Boolean) as string[];

  let gagalDimuat = false;
  let barisMentah: Awaited<ReturnType<typeof getStokTerbaruSemua>> = [];

  if (idsValid.length > 0) {
    try {
      barisMentah = await getStokTerbaruSemua(idsValid, 30);
    } catch (err) {
      console.error('Gagal ambil data stok dari Turso:', err);
      gagalDimuat = true;
    }
  }

  // Kelompokkan baris mentah per (spreadsheet_id, jenis_stok) - hasil query sudah
  // terurut DESC berdasarkan no_baris, jadi index [0] tiap grup = data paling baru.
  const grup = new Map<string, typeof barisMentah>();
  for (const b of barisMentah) {
    const kunci = b.spreadsheetId + '|' + b.jenisStok;
    if (!grup.has(kunci)) grup.set(kunci, []);
    grup.get(kunci)!.push(b);
  }

  const petaKlinik = new Map(daftarKlinik.map((k) => [k.spreadsheet_id, k]));
  const ringkasan: RingkasanStokKlinik[] = [];

  for (const [kunci, baris] of grup) {
    const [spreadsheetId, jenisStok] = kunci.split('|');
    const klinik = petaKlinik.get(spreadsheetId);
    if (!klinik) continue;

    ringkasan.push(
      hitungRingkasanKlinik(
        klinik.nama_klinik,
        jenisStok,
        baris.map((b) => b.data),
        AMBANG_STOK_TETAP_DEFAULT,
        AMBANG_HARI_DEFAULT
      )
    );
  }

  // Buang entri jenis stok yang sisanya 0 DAN memang jenis yang boleh diabaikan kalau nol
  // (klinik yang sudah beralih ke jenis lain, bukan sedang kehabisan stok).
  const ringkasanTersaring = ringkasan.filter(
    (r) => !(JENIS_DIABAIKAN_JIKA_NOL.includes(r.jenisStok) && r.sisaStokTerkini === 0)
  );

  return { ringkasan: ringkasanTersaring, gagalDimuat };
}