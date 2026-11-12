// lib/db/modul/omkaba.ts
// Kueri dasbor Lalu Lintas OMKABA. Satu kueri per muat halaman: data setahun dikirim ke browser dan semua filter
// serta grafik dihitung di sana (components/omkaba/OmkabaDashboardClient.tsx), jadi tidak ada bolak-balik ke database.
import { getDbClient } from '@/lib/db/client';
import type { DbValue as InValue } from '@/lib/db/client';
import { muatDaftarWilayahSingkat } from '@/lib/wilayah-kerja/db';
import { DAFTAR_DOKUMEN } from '@/lib/omkaba/dokumen';
import type { BarisOmkaba } from '@/lib/omkaba/hitung';
import { klausaWilayahSql, variasiTulisan } from '@/lib/wilayah-kerja';

/** Pengaman: satu tahun OMKABA jauh di bawah angka ini; bila terlampaui, dasbor menampilkan yang terbaru. */
const BATAS_BARIS = 5000;

/** Sama dengan filter wilker modul malaria: FilterWilker mengirim KODE (WK01...), kolom wilayah_kerja berisi nama pendek. */
async function filterWilker(kodeWilker?: string): Promise<{ klausa: string; args: InValue[] }> {
  if (!kodeWilker || kodeWilker === 'Semua') return { klausa: '', args: [] };
    const w = (await muatDaftarWilayahSingkat()).find((x) => x.kode === kodeWilker);
  if (!w) return { klausa: ' AND wilayah_kerja = ?', args: [kodeWilker] };
  // Semua ejaan yang mungkin tersimpan (nama saat ini + alias nama lama), dibandingkan tanpa spasi dan huruf besar.
    const varian = variasiTulisan(w);
  return { klausa: ` AND ${klausaWilayahSql()} IN (${varian.map(() => '?').join(', ')})`, args: varian };
}

const teks = (v: unknown): string | null => (v == null || String(v).trim() === '' ? null : String(v).trim());

export async function getBarisOmkaba({ tahun, kodeWilker }: { tahun: number; kodeWilker?: string }): Promise<BarisOmkaba[]> {
  const { klausa, args } = await filterWilker(kodeWilker);
  const hasil = await getDbClient().execute({
    sql: `
      SELECT id::text AS id, no_dokumen, to_char(diterbitkan_tanggal, 'YYYY-MM-DD') AS tanggal, wilayah_kerja, jenis_layanan,
             nama_keagenan, nama_eksportir_importir, nama_buyer, jenis_komoditi, negara_tujuan, negara_asal,
             pelabuhan_tujuan, pelabuhan_asal, nama_kapal, no_voyage, health_certificate, petugas_pemeriksa, jumlah_bayar,
             ${DAFTAR_DOKUMEN.map((d) => d.kolom).join(', ')}
      FROM omkaba_sertifikat
      WHERE diterbitkan_tanggal >= ?::date AND diterbitkan_tanggal < ?::date${klausa}
      ORDER BY diterbitkan_tanggal DESC, no_dokumen DESC
      LIMIT ${BATAS_BARIS}
    `,
    args: [`${tahun}-01-01`, `${tahun + 1}-01-01`, ...args],
  });

  return hasil.rows.map((r) => ({
    id: String(r.id),
    no_dokumen: String(r.no_dokumen ?? ''),
    tanggal: String(r.tanggal ?? '').slice(0, 10),
    wilayah_kerja: teks(r.wilayah_kerja),
    jenis_layanan: teks(r.jenis_layanan),
    nama_keagenan: teks(r.nama_keagenan),
    nama_eksportir_importir: teks(r.nama_eksportir_importir),
    nama_buyer: teks(r.nama_buyer),
    jenis_komoditi: teks(r.jenis_komoditi),
    negara_tujuan: teks(r.negara_tujuan),
    negara_asal: teks(r.negara_asal),
    pelabuhan_tujuan: teks(r.pelabuhan_tujuan),
    pelabuhan_asal: teks(r.pelabuhan_asal),
    nama_kapal: teks(r.nama_kapal),
    no_voyage: teks(r.no_voyage),
    health_certificate: teks(r.health_certificate),
    petugas_pemeriksa: teks(r.petugas_pemeriksa),
    jumlah_bayar: r.jumlah_bayar == null ? null : Number(r.jumlah_bayar),
    dok: Object.fromEntries(DAFTAR_DOKUMEN.map((d) => [d.kolom, teks(r[d.kolom])])),
  }));
}