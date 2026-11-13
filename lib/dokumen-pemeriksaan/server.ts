// lib/dokumen-pemeriksaan/server.ts
// HANYA untuk server. Pengecekan role dilakukan di pemanggil (server action / page).
import 'server-only';
import { getDbClient } from '@/lib/db/client';
import type { DbValue } from '@/lib/db/client';
import cloudinary from '@/lib/cloudinary';
import { KONFIG, type DokumenBaris, type JenisDokumen, type MasukanDokumen } from './konfigurasi';

async function jalankan(sql: string, args: DbValue[] = []) {
  return getDbClient().execute({ sql, args });
}

/**
 * Tandai dokumen yang kuncinya sudah ada di data besar sebagai "sudah sinkron".
 * Nama tabel/kolom berasal dari KONFIG (nilai tetap di kode), jadi aman diinterpolasi.
 * Fungsi ini TIDAK menulis ke tabel data besar -- kolom manual petugas (RBA, sanitasi, dst) tidak tersentuh.
 */
export async function sinkronkanDokumen(jenis: JenisDokumen): Promise<number> {
  const { tabelData, kolomKunci } = KONFIG[jenis];
  const r = await jalankan(
    `UPDATE dokumen_pemeriksaan d
        SET sudah_sinkron = TRUE, disinkron_pada = now()
      WHERE d.jenis = ? AND NOT d.sudah_sinkron
        AND EXISTS (SELECT 1 FROM ${tabelData} k WHERE upper(btrim(k.${kolomKunci})) = d.kunci)`,
    [jenis],
  );
  return r.rowsAffected;
}

export async function daftarDokumen(jenis: JenisDokumen, batas = 200): Promise<DokumenBaris[]> {
  const { tabelData, kolomKunci } = KONFIG[jenis];
  const r = await jalankan(
    `SELECT d.id, d.kunci, d.nama_kapal, d.wilayah_kerja,
            d.tanggal_pemeriksaan::text AS tanggal, d.alasan_phqc, d.url, d.tipe_berkas,
            d.diunggah_oleh, d.diunggah_pada::text AS diunggah_pada,
            EXISTS (SELECT 1 FROM ${tabelData} k WHERE upper(btrim(k.${kolomKunci})) = d.kunci) AS ada_di_data
       FROM dokumen_pemeriksaan d
      WHERE d.jenis = ?
      ORDER BY d.diunggah_pada DESC, d.id DESC
      LIMIT ${Math.max(1, Math.min(batas, 500))}`,
    [jenis],
  );
  return (r.rows as Record<string, unknown>[]).map((x) => ({
    id: Number(x.id),
    kunci: String(x.kunci ?? ''),
    namaKapal: String(x.nama_kapal ?? ''),
    wilayahKerja: String(x.wilayah_kerja ?? ''),
    tanggal: String(x.tanggal ?? ''),
    alasanPhqc: x.alasan_phqc ? String(x.alasan_phqc) : null,
    url: String(x.url ?? ''),
    tipe: x.tipe_berkas === 'pdf' ? 'pdf' : 'image',
    diunggahOleh: String(x.diunggah_oleh ?? ''),
    diunggahPada: String(x.diunggah_pada ?? ''),
    adaDiData: x.ada_di_data === true || x.ada_di_data === 't' || x.ada_di_data === 1,
  }));
}

/** Cari kunci di data besar untuk mengisi otomatis nama kapal & wilayah kerja (bila sudah ada). */
export async function cariDiDataBesar(jenis: JenisDokumen, kunciNormal: string) {
  const { tabelData, kolomKunci } = KONFIG[jenis];
  const r = await jalankan(
    `SELECT nama_kapal, wilayah_kerja FROM ${tabelData} WHERE upper(btrim(${kolomKunci})) = ? LIMIT 1`,
    [kunciNormal],
  );
  const baris = (r.rows as Record<string, unknown>[])[0];
  if (!baris) return null;
  return { namaKapal: String(baris.nama_kapal ?? ''), wilayahKerja: String(baris.wilayah_kerja ?? '') };
}

export async function simpanDokumen(m: MasukanDokumen, kunciNormal: string, oleh: string): Promise<number> {
  let tersimpan = 0;
  for (const b of m.berkas) {
    await jalankan(
      `INSERT INTO dokumen_pemeriksaan
         (jenis, kunci, nama_kapal, wilayah_kerja, tanggal_pemeriksaan, keterangan,
          tanggal_kedatangan, alasan_phqc, cloudinary_public_id, url, tipe_berkas, ukuran_byte, diunggah_oleh)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        m.jenis,
        kunciNormal,
        m.namaKapal.trim() || null,
        m.wilayahKerja.trim(),
        m.tanggalPemeriksaan,
        m.keterangan.trim() || null,
        m.jenis === 'phqc' ? m.tanggalKedatangan || null : null,
        m.jenis === 'phqc' ? m.alasanPhqc ?? null : null,
        b.publicId,
        b.url,
        b.tipe,
        Math.round(b.ukuran),
        oleh.slice(0, 255),
      ],
    );
    tersimpan += 1;
  }
  return tersimpan;
}

export async function hapusDokumenDb(id: number): Promise<boolean> {
  const r = await jalankan(`SELECT cloudinary_public_id FROM dokumen_pemeriksaan WHERE id = ?`, [id]);
  const baris = (r.rows as Record<string, unknown>[])[0];
  if (!baris) return false;
  await jalankan(`DELETE FROM dokumen_pemeriksaan WHERE id = ?`, [id]);
  try {
    // PDF maupun foto diunggah lewat /auto/upload sebagai resource_type "image"
    await cloudinary.uploader.destroy(String(baris.cloudinary_public_id), { resource_type: 'image' });
  } catch (e) {
    console.error('[dokumen-pemeriksaan] gagal hapus berkas Cloudinary', e);
  }
  return true;
}

/** Untuk kolom "Dokumen" di tabel data besar nanti: kunci (normal) -> jumlah berkas. */
export async function hitungDokumenPerKunci(jenis: JenisDokumen, kunciNormal: string[]): Promise<Map<string, number>> {
  const hasil = new Map<string, number>();
  if (kunciNormal.length === 0) return hasil;
  const tanda = kunciNormal.map(() => '?').join(',');
  const r = await jalankan(
    `SELECT kunci, count(*)::int AS jumlah FROM dokumen_pemeriksaan WHERE jenis = ? AND kunci IN (${tanda}) GROUP BY kunci`,
    [jenis, ...kunciNormal],
  );
  for (const x of r.rows as Record<string, unknown>[]) hasil.set(String(x.kunci), Number(x.jumlah));
  return hasil;
}