// lib/vektor/cuaca-otomatis.ts
//
// SERVER-ONLY. Pengganti pengisian cuaca otomatis yang dulu berjalan di Google Apps Script (Code.gs).
// Melengkapi kolom cuaca yang masih KOSONG pada tabel vektor; kolom yang sudah terisi TIDAK pernah ditimpa
// (isian manual petugas aman). Sumber data: Open-Meteo (tanpa API key).
//
//   vektor_anopheles : fase_bulan (dihitung lokal), suhu_c, kelembapan_pct, cuaca
//   vektor_diare     : suhu_c, kelembapan_pct, cuaca, curah_hujan_mm
//   vektor_dbd       : curah_hujan_mm
//
// Koordinat diambil dari wilker_ref (lat, lng). Dijalankan berkala oleh /api/cron/cuaca-vektor.
import type { DbClient } from '../db/client';

/** Zona waktu instansi (hari kegiatan dihitung menurut zona ini). Isi ZONA_WAKTU di .env bila bukan WITA: Asia/Jakarta (WIB), Asia/Jayapura (WIT). */
const ZONA = process.env.ZONA_WAKTU || 'Asia/Makassar';
/** Curah hujan = total N hari terakhir sampai tanggal kegiatan (sama dengan getCurahHujanWilker di GAS). */
export const HARI_AKUMULASI_HUJAN = 7;
/** Data arsip Open-Meteo tertunda beberapa hari; tanggal yang lebih baru dari batas ini diambil dari endpoint forecast. */
const HARI_TUNDA_ARSIP = 6;
const MAKS_PASANGAN_PER_JALAN = 400;

/* ───────────── tanggal ───────────── */
const MS_HARI = 86_400_000;
const utc = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const tambahHari = (s: string, n: number) => iso(utc(s) + n * MS_HARI);
const selisihHari = (a: string, b: string) => Math.round((utc(a) - utc(b)) / MS_HARI);
export const hariIniWita = () => new Date().toLocaleDateString('sv-SE', { timeZone: ZONA });

/* ───────────── rumus ───────────── */

/** Fase bulan (8 nilai baku aplikasi). Rumus sama dengan _hitungFaseBulan di GAS. */
export function hitungFaseBulan(tgl: string): string {
  const siklus = 29.53058867;
  const hari = (utc(tgl) - Date.UTC(2000, 0, 6)) / MS_HARI; // Bulan Baru acuan 2000-01-06
  const p = ((hari % siklus) + siklus) % siklus;
  if (p < 1.85) return 'Baru';
  if (p < 7.38) return 'Sabit Awal';
  if (p < 9.22) return 'Seperempat Awal';
  if (p < 14.77) return 'Cembung Awal';
  if (p < 16.61) return 'Purnama';
  if (p < 22.15) return 'Cembung Akhir';
  if (p < 23.99) return 'Seperempat Akhir';
  if (p < 29.53) return 'Sabit Akhir';
  return 'Baru';
}

/** Kode cuaca WMO (Open-Meteo) -> 7 nilai baku: Cerah, Berawan, Gerimis, Hujan Ringan/Sedang/Lebat, Hujan Petir. */
export function namaCuaca(kode: number | null | undefined): string | null {
  if (kode === null || kode === undefined || Number.isNaN(kode)) return null;
  if (kode <= 1) return 'Cerah';
  if (kode <= 3 || kode === 45 || kode === 48) return 'Berawan';
  if (kode >= 51 && kode <= 57) return 'Gerimis';
  if (kode === 61 || kode === 66 || kode === 80) return 'Hujan Ringan';
  if (kode === 63 || kode === 67 || kode === 81) return 'Hujan Sedang';
  if (kode === 65 || kode === 82) return 'Hujan Lebat';
  if (kode >= 95) return 'Hujan Petir';
  return null; // salju dll. tidak relevan di wilayah ini
}

/* ───────────── Open-Meteo ───────────── */
export interface Harian { suhu: number | null; lembap: number | null; kode: number | null; hujan: number | null }
type PetaHarian = Map<string, Harian>;

const DAILY = 'temperature_2m_mean,relative_humidity_2m_mean,weathercode,precipitation_sum';

async function ambilJson(url: string): Promise<Record<string, unknown>> {
  let galat: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: 'no-store' });
      const j = (await r.json()) as Record<string, unknown>;
      if (!r.ok || j.error) throw new Error(String(j.reason ?? `HTTP ${r.status}`));
      return j;
    } catch (e) {
      galat = e;
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
  throw galat instanceof Error ? galat : new Error(String(galat));
}

function masukkan(peta: PetaHarian, json: Record<string, unknown>) {
  const d = (json.daily ?? {}) as Record<string, (number | string | null)[]>;
  const waktu = (d.time ?? []) as string[];
  const num = (a: (number | string | null)[] | undefined, i: number) => {
    const v = a?.[i];
    return typeof v === 'number' ? v : null;
  };
  waktu.forEach((t, i) => {
    peta.set(t, {
      suhu: num(d.temperature_2m_mean, i),
      lembap: num(d.relative_humidity_2m_mean, i),
      kode: num(d.weathercode, i),
      hujan: num(d.precipitation_sum, i),
    });
  });
}

/** Data harian [mulai, akhir] (YYYY-MM-DD, WITA): arsip untuk tanggal lama, forecast+past_days untuk tanggal terbaru. */
export async function ambilHarian(lat: number, lng: number, mulai: string, akhir: string, hariIni: string): Promise<PetaHarian> {
  const peta: PetaHarian = new Map();
  const batasArsip = tambahHari(hariIni, -HARI_TUNDA_ARSIP);
  const dasar = `latitude=${lat}&longitude=${lng}&daily=${DAILY}&timezone=${encodeURIComponent(ZONA)}`;

  if (mulai <= batasArsip) {
    const a = akhir < batasArsip ? akhir : batasArsip;
    masukkan(peta, await ambilJson(`https://archive-api.open-meteo.com/v1/archive?${dasar}&start_date=${mulai}&end_date=${a}`));
  }
  if (akhir > batasArsip) {
    const awal = mulai > batasArsip ? mulai : tambahHari(batasArsip, 1);
    const pastDays = Math.min(92, Math.max(0, selisihHari(hariIni, awal)));
    masukkan(peta, await ambilJson(`https://api.open-meteo.com/v1/forecast?${dasar}&past_days=${pastDays}&forecast_days=1`));
  }
  return peta;
}

/** Total curah hujan HARI_AKUMULASI_HUJAN hari sampai `tgl`. Null bila tidak ada satu pun data. */
export function hujanAkumulasi(peta: PetaHarian, tgl: string): number | null {
  let total = 0;
  let ada = false;
  for (let i = 0; i < HARI_AKUMULASI_HUJAN; i++) {
    const h = peta.get(tambahHari(tgl, -i))?.hujan;
    if (typeof h === 'number') { total += h; ada = true; }
  }
  return ada ? Math.round(total * 10) / 10 : null;
}

/* ───────────── proses basis data ───────────── */
interface Spek {
  tabel: 'vektor_anopheles' | 'vektor_diare' | 'vektor_dbd';
  kolomTgl: 'tgl_survei' | 'tgl_kegiatan';
  fase: boolean;
  cuaca: boolean; // suhu_c, kelembapan_pct, cuaca
  hujan: boolean; // curah_hujan_mm
}
const SPEK: Spek[] = [
  { tabel: 'vektor_anopheles', kolomTgl: 'tgl_survei', fase: true, cuaca: true, hujan: false },
  { tabel: 'vektor_diare', kolomTgl: 'tgl_kegiatan', fase: false, cuaca: true, hujan: true },
  { tabel: 'vektor_dbd', kolomTgl: 'tgl_survei', fase: false, cuaca: false, hujan: true },
];
const kosongTeks = (k: string) => `(${k} IS NULL OR btrim(${k}) = '')`;

function syaratKosong(s: Spek): string {
  const p: string[] = [];
  if (s.fase) p.push(kosongTeks('fase_bulan'));
  if (s.cuaca) p.push('suhu_c IS NULL', 'kelembapan_pct IS NULL', kosongTeks('cuaca'));
  if (s.hujan) p.push('curah_hujan_mm IS NULL');
  return p.join(' OR ');
}

export interface HasilLengkapi {
  hariIni: string;
  pasangDiperiksa: number;
  baris: Record<string, number>;
  dilewati: string[]; // wilayah tanpa koordinat / galat API
}

export async function lengkapiCuacaVektor(db: DbClient): Promise<HasilLengkapi> {
  const hariIni = hariIniWita();
  const hasil: HasilLengkapi = { hariIni, pasangDiperiksa: 0, baris: {}, dilewati: [] };

  const wk = await db.execute('SELECT kode, lat, lng FROM wilker_ref WHERE lat IS NOT NULL AND lng IS NOT NULL');
  const koordinat = new Map<string, { lat: number; lng: number }>();
  for (const r of wk.rows) koordinat.set(String(r.kode), { lat: Number(r.lat), lng: Number(r.lng) });

  // 1. kumpulkan pasangan (wilayah, tanggal) yang masih punya kolom kosong
  const perWilker = new Map<string, Map<string, Spek[]>>(); // kode -> tgl -> spek
  for (const s of SPEK) {
    const rs = await db.execute({
      sql: `SELECT kode_wilker, to_char(${s.kolomTgl}, 'YYYY-MM-DD') AS tgl
              FROM ${s.tabel}
             WHERE ${s.kolomTgl} IS NOT NULL AND ${s.kolomTgl} <= ?::date AND kode_wilker IS NOT NULL
               AND (${syaratKosong(s)})
             GROUP BY 1, 2 ORDER BY 2 DESC LIMIT ?`,
      args: [hariIni, MAKS_PASANGAN_PER_JALAN],
    });
    for (const r of rs.rows) {
      const kode = String(r.kode_wilker);
      const tgl = String(r.tgl);
      if (!perWilker.has(kode)) perWilker.set(kode, new Map());
      const m = perWilker.get(kode)!;
      m.set(tgl, [...(m.get(tgl) ?? []), s]);
      hasil.pasangDiperiksa++;
    }
  }

  // 2. per wilayah: satu rangkaian permintaan, lalu isi hanya kolom yang kosong
  for (const [kode, tanggal] of perWilker) {
    const kd = koordinat.get(kode);
    const daftar = [...tanggal.keys()].sort();
    const butuhApi = [...tanggal.values()].some((ss) => ss.some((s) => s.cuaca || s.hujan));

    let peta: PetaHarian = new Map();
    if (butuhApi) {
      if (!kd) { hasil.dilewati.push(`${kode}: koordinat (lat/lng) di wilker_ref kosong`); }
      else {
        try { peta = await ambilHarian(kd.lat, kd.lng, tambahHari(daftar[0], -(HARI_AKUMULASI_HUJAN - 1)), daftar[daftar.length - 1], hariIni); }
        catch (e) { hasil.dilewati.push(`${kode}: ${e instanceof Error ? e.message : String(e)}`); }
      }
    }

    for (const [tgl, spesifik] of tanggal) {
      const h = peta.get(tgl);
      const nilaiCuaca = h ? namaCuaca(h.kode) : null;
      for (const s of spesifik) {
        const set: string[] = [];
        const args: (string | number | null)[] = [];
        const isi = (kolom: string, nilai: string | number | null, teks = false) => {
          if (nilai === null) return;
          set.push(`${kolom} = COALESCE(${teks ? `NULLIF(btrim(${kolom}), '')` : kolom}, ?)`);
          args.push(nilai);
        };
        if (s.fase) isi('fase_bulan', hitungFaseBulan(tgl), true);
        if (s.cuaca && h) {
          isi('suhu_c', h.suhu === null ? null : Math.round(h.suhu * 10) / 10);
          isi('kelembapan_pct', h.lembap === null ? null : Math.round(h.lembap));
          isi('cuaca', nilaiCuaca, true);
        }
        if (s.hujan && h) isi('curah_hujan_mm', hujanAkumulasi(peta, tgl));
        if (!set.length) continue;
        const r = await db.execute({
          sql: `UPDATE ${s.tabel} SET ${set.join(', ')} WHERE kode_wilker = ? AND ${s.kolomTgl} = ?::date AND (${syaratKosong(s)})`,
          args: [...args, kode, tgl],
        });
        hasil.baris[s.tabel] = (hasil.baris[s.tabel] ?? 0) + r.rowsAffected;
      }
    }
  }
  return hasil;
}
