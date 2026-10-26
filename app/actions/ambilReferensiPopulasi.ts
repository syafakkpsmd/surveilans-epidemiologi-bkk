"use server";

import { getDbClient } from "@/lib/db/client";

export async function ambilPrefillPopulasiKapal(wilayahKerja: string) {
  if (!wilayahKerja) return null;
  const { rows } = await getDbClient().execute({
    sql: `SELECT * FROM referensi_populasi_wilker
           WHERE jenis_wilker = 'Pelabuhan' AND wilayah_kerja = ? LIMIT 1`,
    args: [wilayahKerja],
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