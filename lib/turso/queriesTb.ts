import { getTursoClient } from "@/lib/turso/client";

export interface BarisTb {
  wilker: string;
  no_baris: number;
  no_urut: string;
  tanggal_pelaksanaan: string;
  nama_peserta: string;
  provinsi: string;
  kabupaten_kota: string;
  nik: string;
  pekerjaan: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  no_hp: string;
  riwayat_kontak_tbc: string;
  jenis_kontak_tbc: string;
  pernah_terdiagnosa_tbc: string;
  keterangan_riwayat_tbc: string;
  kekurangan_gizi: string;
  merokok: string;
  perokok_pasif: string;
  riwayat_dm: string;
  odhiv: string;
  lansia: string;
  ibu_hamil: string;
  hasil_skrining_gejala: string;
  terduga_tbc: string;
  tindak_lanjut_pemeriksaan: string;
  fasyankes_pemeriksaan: string;
  nomor_register_sitb: string;
  tanggal_hasil_diagnosis: string;
  hasil_pemeriksaan_diagnosis: string;
  jenis_pemeriksaan_diagnosis: string;
  terkonfirmasi_tbc: string;
}

const KOLOM_TB = [
  "no_baris", "no_urut", "tanggal_pelaksanaan", "nama_peserta", "provinsi", "kabupaten_kota",
  "nik", "pekerjaan", "tanggal_lahir", "jenis_kelamin", "no_hp", "riwayat_kontak_tbc",
  "jenis_kontak_tbc", "pernah_terdiagnosa_tbc", "keterangan_riwayat_tbc", "kekurangan_gizi",
  "merokok", "perokok_pasif", "riwayat_dm", "odhiv", "lansia", "ibu_hamil",
  "hasil_skrining_gejala", "terduga_tbc", "tindak_lanjut_pemeriksaan", "fasyankes_pemeriksaan",
  "nomor_register_sitb", "tanggal_hasil_diagnosis", "hasil_pemeriksaan_diagnosis",
  "jenis_pemeriksaan_diagnosis", "terkonfirmasi_tbc",
] as const;

function tabelBelumAda(err: unknown): boolean {
  const pesan = err instanceof Error ? err.message : String(err);
  return pesan.includes("no such table");
}

/** Daftar wilayah kerja yang ada datanya, untuk isi dropdown filter. */
export async function getWilayahKerjaTb(): Promise<string[]> {
  try {
    const hasil = await getTursoClient().execute({
      sql: `SELECT DISTINCT wilayah_kerja FROM tb_data ORDER BY wilayah_kerja`,
      args: [],
    });
    return hasil.rows.map((r: any) => String(r.wilayah_kerja));
  } catch (err) {
    if (tabelBelumAda(err)) return [];
    throw err;
  }
}

export interface FilterTb {
  tahun: number;
  bulan?: number;
  wilker?: string;
}

export async function getBarisTb(filter: FilterTb): Promise<BarisTb[]> {
  const kondisi: string[] = [`strftime('%Y', tanggal_pelaksanaan) = ?`];
  const args: (string | number)[] = [String(filter.tahun)];

  if (filter.bulan) {
    kondisi.push(`strftime('%m', tanggal_pelaksanaan) = ?`);
    args.push(String(filter.bulan).padStart(2, "0"));
  }
  if (filter.wilker) {
    kondisi.push(`wilayah_kerja = ?`);
    args.push(filter.wilker);
  }

  let hasil;
  try {
    hasil = await getTursoClient().execute({
      sql: `SELECT wilayah_kerja AS wilker, ${KOLOM_TB.join(", ")}
            FROM tb_data
            WHERE ${kondisi.join(" AND ")}
            ORDER BY wilayah_kerja ASC, tanggal_pelaksanaan ASC, no_baris ASC`,
      args,
    });
  } catch (err) {
    if (tabelBelumAda(err)) return [];
    throw err;
  }

  return hasil.rows.map((r: any) => {
    const baris: any = { wilker: String(r.wilker ?? "") };
    KOLOM_TB.forEach((k) => {
      baris[k] = k === "no_baris" ? Number(r[k]) : String(r[k] ?? "");
    });
    return baris as BarisTb;
  });
}