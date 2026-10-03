import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { BULAN } from "./periode";

// ============================================================================
// SUPABASE CLIENT HELPERS
// ============================================================================

/**
 * Mengembalikan Supabase Client berbasis Server (menggunakan cookies Next.js).
 * Dipakai di Server Components, Server Actions, dan Route Handlers.
 */
export async function getSupabaseServerClient() {
  return await createClient();
}

/**
 * Mengembalikan Supabase Client tingkat admin (Bypass RLS) menggunakan Service Role Key.
 */
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ============================================================================
// FORMATTING HELPERS (UNTUK MENGHILANGKAN ERROR FMTANGKA & FMTPERSEN)
// ============================================================================

/** Format angka dengan ribuan Indonesia (misal: 1250 -> "1.250") */
export function fmtAngka(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return "0";
  return new Intl.NumberFormat("id-ID").format(val);
}

/** Format persen (misal: 85.5 -> "85,5%") */
export function fmtPersen(val: number | null | undefined, desimal = 1): string {
  if (val == null || !Number.isFinite(val)) return "0%";
  return (
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: desimal,
      maximumFractionDigits: desimal,
    }).format(val) + "%"
  );
}

/** "TanjungSantan" -> "Tanjung Santan" */
export function namaWilker(w: string | null | undefined): string {
  return (w ?? "").replace(/([a-z])([A-Z])/g, "$1 $2").trim() || "-";
}

/**
 * Menjumlahkan satu kolom per bulan (Januari sampai bulanAkhir).
 */
export function jumlahPerBulan<T extends { bulan: number }>(
  baris: T[],
  bulanAkhir: number,
  ambil: (b: T) => number
): number[] {
  const hasil = new Array<number>(bulanAkhir).fill(0);
  for (const b of baris) {
    const i = Number(b.bulan) - 1;
    if (i >= 0 && i < bulanAkhir) hasil[i] += Number(ambil(b)) || 0;
  }
  return hasil;
}

/** Jumlah nilai suatu kolom per wilayah kerja untuk bulan <= bulanAkhir. */
export function jumlahPerWilker<T extends { bulan: number; wilayah_kerja: string | null }>(
  baris: T[],
  bulanAkhir: number,
  kolom: Record<string, (b: T) => number>
): { nama: string; nilai: Record<string, number> }[] {
  const peta = new Map<string, Record<string, number>>();
  for (const b of baris) {
    if (b.bulan < 1 || b.bulan > bulanAkhir) continue;
    const kunciWilker = b.wilayah_kerja ?? "";
    const nilai = peta.get(kunciWilker) ?? Object.fromEntries(Object.keys(kolom).map((k) => [k, 0]));
    for (const k of Object.keys(kolom)) nilai[k] += Number(kolom[k](b)) || 0;
    peta.set(kunciWilker, nilai);
  }
  const utama = Object.keys(kolom)[0];
  return Array.from(peta, ([nama, nilai]) => ({ nama: namaWilker(nama), nilai })).sort(
    (a, b) => b.nilai[utama] - a.nilai[utama]
  );
}

export const jumlah = (a: number[]): number => a.reduce((s, v) => s + v, 0);

/** Temuan otomatis dari deret bulanan. */
export function temuanDeret(nilai: number[], satuan: string): string[] {
  const out: string[] = [];
  const n = nilai.length;
  if (n === 0) return out;
  const sekarang = nilai[n - 1];
  const sebelumnya = n >= 2 ? nilai[n - 2] : 0;
  if (n >= 2 && sebelumnya > 0) {
    const p = ((sekarang - sebelumnya) / sebelumnya) * 100;
    if (Math.abs(p) >= 20) {
      out.push(
        `Jumlah ${satuan} bulan ${BULAN[n - 1]} ${p > 0 ? "naik" : "turun"} ${fmtPersen(
          Math.abs(p),
          0
        )} dari bulan sebelumnya (${fmtAngka(sebelumnya)} menjadi ${fmtAngka(sekarang)}).`
      );
    }
  }
  const maks = Math.max(...nilai);
  if (n >= 3 && maks > 0) {
    const i = nilai.indexOf(maks);
    out.push(`Bulan tertinggi adalah ${BULAN[i]} dengan ${fmtAngka(maks)} ${satuan}.`);
  }
  return out;
}

/** Temuan tentang wilayah kerja dengan jumlah terbesar. */
export function temuanWilker(rows: { nama: string; nilai: number }[], satuan: string): string[] {
  const total = jumlah(rows.map((r) => r.nilai));
  if (rows.length < 2 || total <= 0 || rows[0].nilai <= 0) return [];
  return [
    `Wilayah kerja terbanyak: ${rows[0].nama}, ${fmtAngka(rows[0].nilai)} ${satuan} (${fmtPersen(
      (rows[0].nilai / total) * 100,
      0
    )} dari total).`,
  ];
}

/** Persentase aman terhadap pembagi nol: null bila pembagi 0. */
export const persenDari = (bagian: number, total: number): number | null =>
  total > 0 ? (bagian / total) * 100 : null;

/** Alias untuk persenDari (mencegah error nama 'persen') */
export const persen = persenDari;

/** Baris tabel yang bernilai TMS terbanyak. */
export function temuanTmsTerbanyak(butir: { nama: string; nilai: number }[], maks = 3): string[] {
  const atas = butir.filter((b) => b.nilai > 0).sort((a, b) => b.nilai - a.nilai).slice(0, maks);
  if (atas.length === 0) return [];
  return [`Paling sering tidak memenuhi syarat: ${atas.map((b) => `${b.nama} (${fmtAngka(b.nilai)})`).join(", ")}.`];
}

/** Perubahan persentase bulan terakhir terhadap bulan sebelumnya dalam poin persen. */
export function temuanPoin(persenList: (number | null)[], nama: string): string[] {
  const n = persenList.length;
  if (n < 2) return [];
  const a = persenList[n - 1];
  const b = persenList[n - 2];
  if (a == null || b == null) return [];
  const d = a - b;
  if (Math.abs(d) < 5) return [];
  return [
    `${nama} bulan ${BULAN[n - 1]} ${d > 0 ? "naik" : "turun"} ${fmtPersen(Math.abs(d), 1).replace(
      "%",
      ""
    )} poin persen dari bulan sebelumnya (${fmtPersen(b)} menjadi ${fmtPersen(a)}).`,
  ];
}

/** Peta kode wilayah kerja ke nama. */
export function petaNamaWilker(
  daftar: { kode?: string | null; kode_wilker?: string | null; id?: string | null; nama?: string | null }[]
): Map<string, string> {
  const peta = new Map<string, string>();
  for (const w of daftar) {
    const kode = w.kode ?? w.kode_wilker ?? w.id;
    if (kode && w.nama) peta.set(kode, w.nama);
  }
  return peta;
}

/** Mengubah label bulan menjadi indeks 0 sampai 11. */
export function indeksBulanDariLabel(label: string, tahun: number): number | null {
  const [nama, thn] = label.trim().split(/\s+/);
  if (thn && Number(thn) !== tahun) return null;
  const awalan = (nama ?? "").slice(0, 3).toLowerCase();
  const i = (BULAN as readonly string[]).findIndex((b: string) => b.slice(0, 3).toLowerCase() === awalan);
  if (i >= 0) return i;
  return awalan === "agu" ? 7 : null;
}

/** Mentempatkan nilai per label bulan ke deret sepanjang Januari sampai bulanAkhir. */
export function deretDariLabel<T>(
  baris: T[],
  tahun: number,
  bulanAkhir: number,
  label: (b: T) => string,
  nilai: (b: T) => number | null | undefined,
  kosong: number | null
): (number | null)[] {
  const out: (number | null)[] = new Array(bulanAkhir).fill(kosong);
  for (const b of baris) {
    const i = indeksBulanDariLabel(label(b), tahun);
    if (i != null && i < bulanAkhir) out[i] = nilai(b) ?? kosong;
  }
  return out;
}

/** Angka desimal berformat Indonesia, mis. 2,35. */
export function desimal(n: number | null | undefined, digit = 2): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: digit, maximumFractionDigits: digit }).format(n);
}

/** Membaca semua baris dari query berhalaman. */
export async function ambilSemuaHalaman(
  buat: (
    dari: number,
    sampai: number
  ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
  ukuran = 1000,
  maksHalaman = 40
): Promise<unknown[]> {
  const semua: unknown[] = [];
  for (let h = 0; h < maksHalaman; h++) {
    const { data, error } = await buat(h * ukuran, h * ukuran + ukuran - 1);
    if (error) throw new Error(error.message);
    const baris = data ?? [];
    semua.push(...baris);
    if (baris.length < ukuran) return semua;
  }
  throw new Error(`Data melebihi ${maksHalaman * ukuran} baris; persempit periode atau tambah batas halaman.`);
}

/** Minggu epidemiologi ke-`minggu`. */
export function bulanDariMinggu(tahun: number, minggu: number): number {
  const jan1 = new Date(Date.UTC(tahun, 0, 1));
  const tengah = new Date(jan1);
  tengah.setUTCDate(jan1.getUTCDate() - jan1.getUTCDay() + (minggu - 1) * 7 + 3);
  const y = tengah.getUTCFullYear();
  if (y < tahun) return 1;
  if (y > tahun) return 12;
  return tengah.getUTCMonth() + 1;
}

/** Daftar minggu epidemiologi yang masuk periode Januari sampai bulanAkhir. */
export function mingguDalamPeriode(tahun: number, bulanAkhir: number): { minggu: number; bulan: number }[] {
  const out: { minggu: number; bulan: number }[] = [];
  for (let m = 1; m <= 53; m++) {
    const bulan = bulanDariMinggu(tahun, m);
    if (bulan <= bulanAkhir) out.push({ minggu: m, bulan });
  }
  return out;
}

export const CATATAN_MINGGU_KE_BULAN =
  "Data ini dicatat per minggu epidemiologi. Dalam laporan bulanan, tiap minggu dimasukkan ke bulan yang memuat sebagian besar harinya.";