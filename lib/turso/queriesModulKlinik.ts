// lib/turso/queriesModulKlinik.ts
//
// Query generik untuk Poliklinik, KIER Kesehatan, SIAOS, SKLT (lihat modulTabelConfig.ts).
// Nama tabel & kolom diambil dari config (hardcode), BUKAN dari input user.

import { getTursoClient } from "@/lib/turso/client";
import { MODUL_KLINIK, ambilModul, type ModulKey } from "@/lib/klinik/modulTabelConfig";

/** 1 baris = objek polos: { wilker, <key kolom config>: string, ... } */
export type BarisModul = Record<string, string>;

export interface FilterModul {
  tahun: number;
  bulan?: number; // 1-12, undefined = seluruh tahun
  wilker?: string; // undefined = semua wilayah kerja (diabaikan kalau modul tanpa wilayah_kerja)
}

function tabelBelumAda(err: unknown): boolean {
  const pesan = err instanceof Error ? err.message : String(err);
  return pesan.includes("no such table");
}

/** Daftar wilayah kerja yang ada datanya untuk modul tsb (isi dropdown filter). */
export async function getWilayahKerjaModul(modul: ModulKey): Promise<string[]> {
  const cfg = MODUL_KLINIK[modul];
  if (!cfg.punyaWilayahKerja) return [];

  try {
    const hasil = await getTursoClient().execute({
      sql: `SELECT DISTINCT wilayah_kerja FROM ${cfg.tabel}
            WHERE wilayah_kerja IS NOT NULL AND wilayah_kerja != ''
            ORDER BY wilayah_kerja`,
      args: [],
    });
    return hasil.rows.map((r: any) => String(r.wilayah_kerja));
  } catch (err) {
    if (tabelBelumAda(err)) return [];
    throw err;
  }
}

/** Ambil baris sesuai filter, urut (per wilayah kerja kalau ada) lalu tanggal. */
export async function getBarisModul(modul: ModulKey, filter: FilterModul): Promise<BarisModul[]> {
  const cfg = MODUL_KLINIK[modul];

  // substr (bukan strftime) supaya tetap jalan walau ada nilai tanggal berjam
  // ("2026-07-01T08:00") -- yang penting diawali yyyy-MM-dd.
  const kondisi: string[] = [`substr(${cfg.kolomTanggal}, 1, 4) = ?`];
  const args: (string | number)[] = [String(filter.tahun)];

  if (filter.bulan) {
    kondisi.push(`substr(${cfg.kolomTanggal}, 6, 2) = ?`);
    args.push(String(filter.bulan).padStart(2, "0"));
  }
  if (filter.wilker && cfg.punyaWilayahKerja) {
    kondisi.push(`wilayah_kerja = ?`);
    args.push(filter.wilker);
  }

  // Kolom "kosong" tidak di-SELECT; kolom dengan `sumber` di-alias ke key keluarannya.
  const kolomSql = cfg.kolom
    .filter((k) => !k.kosong)
    .map((k) => `${k.sumber ?? k.key} AS ${k.key}`)
    .join(", ");
  const selectWilker = cfg.punyaWilayahKerja ? "wilayah_kerja AS wilker" : "'' AS wilker";
  const urutWilker = cfg.punyaWilayahKerja ? "wilayah_kerja ASC, " : "";

  let hasil;
  try {
    hasil = await getTursoClient().execute({
      sql: `SELECT ${selectWilker}, ${kolomSql}
            FROM ${cfg.tabel}
            WHERE ${kondisi.join(" AND ")}
            ORDER BY ${urutWilker}${cfg.kolomTanggal} ASC, rowid ASC`,
      args,
    });
  } catch (err) {
    if (tabelBelumAda(err)) return [];
    throw err;
  }

  // Salin ke objek polos (Row libSQL tidak bisa dilempar ke Client Component).
  return hasil.rows.map((r: any) => {
    const obj: BarisModul = { wilker: String(r.wilker ?? "") };
    cfg.kolom.forEach((k) => {
      obj[k.key] = k.kosong ? "" : String(r[k.key] ?? "");
    });
    return obj;
  });
}

/** Parse & validasi query param yang dipakai route preview dan export. */
export function bacaFilterModul(
  params: URLSearchParams
): { ok: true; modul: ModulKey; filter: FilterModul } | { ok: false; error: string } {
  const cfg = ambilModul(params.get("modul"));
  if (!cfg) return { ok: false, error: "Parameter modul tidak dikenal" };

  const tahun = Number(params.get("tahun"));
  if (!tahun) return { ok: false, error: "Parameter tahun wajib diisi" };

  const bulanParam = params.get("bulan");
  let bulan: number | undefined;
  if (bulanParam && bulanParam !== "semua") {
    bulan = Number(bulanParam);
    if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) {
      return { ok: false, error: "Parameter bulan harus 1-12 atau 'semua'" };
    }
  }

  const wilkerParam = params.get("wilker");
  const wilker = wilkerParam && wilkerParam !== "semua" ? wilkerParam : undefined;

  return { ok: true, modul: cfg.key, filter: { tahun, bulan, wilker } };
}