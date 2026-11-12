"use server";

import { getDbClient } from "@/lib/db/client";
import { variasiDariNilai } from "@/lib/wilayah-kerja/varian";
import { klausaWilayahSql } from "@/lib/wilayah-kerja";

export async function ambilPrefillPopulasiKapal(wilayahKerja: string) {
  if (!wilayahKerja) return null;
  const varian = await variasiDariNilai(wilayahKerja);
  const { rows } = await getDbClient().execute({
    sql: `SELECT * FROM referensi_populasi_wilker
           WHERE jenis_wilker = 'Pelabuhan'
             AND ${klausaWilayahSql()} IN (${varian.map(() => "?").join(", ")}) LIMIT 1`,
    args: varian,
  });
  return rows[0] ?? null;
}

export async function ambilPrefillPopulasiPesawat(kodeWilker: string) {
  if (!kodeWilker) return null;
  const { rows } = await getDbClient().execute({
    sql: `SELECT * FROM referensi_populasi_wilker
           WHERE jenis_wilker = 'Bandara' AND kode_wilker = ? LIMIT 1`,
    args: [kodeWilker],
  });
  return rows[0] ?? null;
}