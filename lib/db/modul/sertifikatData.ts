// SERVER-ONLY. Data baris sertifikat untuk satu tahun terbit (diagregasi di client agar filter terasa instan).
import { getDbClient } from '@/lib/db/client';
import type { JenisSertifikat } from '@/lib/sertifikat/meta';

export interface BarisSertifikat {
  id: string;
  wilker: string;
  nama: string;
  nomor: string;
  bendera: string;
  gt: number | null;
  tgl: string; // YYYY-MM-DD
  bayar: number;
  catatan: string;
  berlaku: string | null; // YYYY-MM-DD
}

const TGL = (kolom: string) => `to_char(${kolom}, 'YYYY-MM-DD')`;

// Nama tabel dan kolom hanya dari konstanta ini, bukan dari input pengguna.
const SQL_DASAR: Record<JenisSertifikat, string> = {
  sscec: `SELECT id::text AS id, COALESCE(wilayah_kerja,'-') AS wilker, COALESCE(nama_kapal,'') AS nama,
                 COALESCE(nomor_barcode,'') AS nomor, COALESCE(bendera,'') AS bendera, berat_gt::float8 AS gt,
                 ${TGL('tgl_terbit')} AS tgl, COALESCE(jumlah_bayar,0)::float8 AS bayar,
                 COALESCE(pencatat_pemeriksaan,'') AS catatan, NULL::text AS berlaku
            FROM sertifikat_sscec`,
  p3k: `SELECT id::text AS id, COALESCE(wilayah_kerja,'-') AS wilker, COALESCE(nama_kapal,'') AS nama,
               COALESCE(qr_code,'') AS nomor, COALESCE(bendera,'') AS bendera, berat::float8 AS gt,
               ${TGL('tgl_terbit')} AS tgl, COALESCE(jumlah_bayar,0)::float8 AS bayar,
               COALESCE(petugas_pemeriksa,'') AS catatan, NULL::text AS berlaku
          FROM sertifikat_p3k`,
  buku: `SELECT id::text AS id, COALESCE(wilayah_kerja,'-') AS wilker, COALESCE(nama_kapal,'') AS nama,
                COALESCE(qr_code,'') AS nomor, COALESCE(bendera,'') AS bendera, berat::float8 AS gt,
                ${TGL('tgl_terbit')} AS tgl, COALESCE(jumlah_bayar,0)::float8 AS bayar,
                COALESCE(e_healthbook,'') AS catatan, NULL::text AS berlaku
           FROM buku_kesehatan`,
  air: `SELECT id::text AS id, COALESCE(wilayah_kerja,'-') AS wilker, COALESCE(nama_perusahaan,'') AS nama,
                COALESCE(sample_id,'') AS nomor, '' AS bendera, NULL::float8 AS gt,
                ${TGL('tgl_terbit')} AS tgl, COALESCE(jumlah_bayar,0)::float8 AS bayar,
                COALESCE(jenis_penampungan,'') AS catatan, ${TGL('berlaku_sampai')} AS berlaku
           FROM sertifikat_air`,
};

const BATAS_BARIS = 20000;

export async function getBarisSertifikat(jenis: JenisSertifikat, tahun: number): Promise<BarisSertifikat[]> {
  const { rows } = await getDbClient().execute({
    sql: `${SQL_DASAR[jenis]}
           WHERE tgl_terbit >= ?::date AND tgl_terbit < ?::date
           ORDER BY tgl_terbit DESC, id DESC LIMIT ${BATAS_BARIS}`,
    args: [`${tahun}-01-01`, `${tahun + 1}-01-01`],
  });
  return rows.map((r) => ({
    id: String(r.id),
    wilker: String(r.wilker),
    nama: String(r.nama),
    nomor: String(r.nomor),
    bendera: String(r.bendera),
    gt: r.gt == null ? null : Number(r.gt),
    tgl: String(r.tgl ?? ''),
    bayar: Number(r.bayar) || 0,
    catatan: String(r.catatan),
    berlaku: r.berlaku == null ? null : String(r.berlaku),
  }));
}