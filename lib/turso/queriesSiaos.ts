import { getTursoClient } from "@/lib/turso/client";

export type SiaosRow = {
  id: number;
  wilayah_kerja: string;
  no: number | null;
  tanggal: string | null;
  no_surat: string | null;
  nama: string | null;
  pelayaran: string | null;
  maskapai: string | null;
  pelabuhan: string | null;
  jenis_kelamin: string | null;
  usia: number | null;
  satuan_usia: string | null;
  diagnosa: string | null;
  butuh_bantuan_medis: string | null;
  ambulance: string | null;
  kondisi_lanjut_perjalanan: string | null;
  perlu_kursi_dorong: string | null;
  perlu_bantuan_makanan_medikasi: string | null;
  synced_at: string | null;
};

const DAFTAR_KOLOM = `id, wilayah_kerja, no, tanggal, no_surat, nama, pelayaran, maskapai, pelabuhan,
  jenis_kelamin, usia, satuan_usia, diagnosa, butuh_bantuan_medis, ambulance,
  kondisi_lanjut_perjalanan, perlu_kursi_dorong, perlu_bantuan_makanan_medikasi, synced_at`;

// libSQL mengembalikan setiap baris sebagai instance class `Row` (bukan objek
// biasa) -- ada method-method internal di dalamnya. Next.js menolak mengirim
// itu dari Server Component ke Client Component ("Only plain objects can be
// passed..."). Jadi setiap baris harus disalin dulu jadi objek polos sebelum
// dikembalikan / diteruskan ke komponen client.
function keObjekBiasa(row: unknown): SiaosRow {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as number,
    wilayah_kerja: r.wilayah_kerja as string,
    no: r.no as number | null,
    tanggal: r.tanggal as string | null,
    no_surat: r.no_surat as string | null,
    nama: r.nama as string | null,
    pelayaran: r.pelayaran as string | null,
    maskapai: r.maskapai as string | null,
    pelabuhan: r.pelabuhan as string | null,
    jenis_kelamin: r.jenis_kelamin as string | null,
    usia: r.usia as number | null,
    satuan_usia: r.satuan_usia as string | null,
    diagnosa: r.diagnosa as string | null,
    butuh_bantuan_medis: r.butuh_bantuan_medis as string | null,
    ambulance: r.ambulance as string | null,
    kondisi_lanjut_perjalanan: r.kondisi_lanjut_perjalanan as string | null,
    perlu_kursi_dorong: r.perlu_kursi_dorong as string | null,
    perlu_bantuan_makanan_medikasi: r.perlu_bantuan_makanan_medikasi as string | null,
    synced_at: r.synced_at as string | null,
  };
}

export async function ambilDataSiaos(): Promise<SiaosRow[]> {
  const turso = getTursoClient();
  const result = await turso.execute(
    `SELECT ${DAFTAR_KOLOM} FROM siaos ORDER BY tanggal DESC`
  );
  return result.rows.map(keObjekBiasa);
}

export async function ambilDataSiaosByWilayahKerja(wilayahKerja: string): Promise<SiaosRow[]> {
  const turso = getTursoClient();
  const result = await turso.execute({
    sql: `SELECT ${DAFTAR_KOLOM} FROM siaos WHERE wilayah_kerja = ? ORDER BY tanggal DESC`,
    args: [wilayahKerja],
  });
  return result.rows.map(keObjekBiasa);
}