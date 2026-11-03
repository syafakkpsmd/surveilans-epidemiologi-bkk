import type { Donat } from "../types";

/** Batas kelompok usia; ubah di sini bila standar Anda berbeda. */
export const KELOMPOK_USIA = [
  { label: "0-14 th", min: 0, maks: 14 },
  { label: "15-24 th", min: 15, maks: 24 },
  { label: "25-34 th", min: 25, maks: 34 },
  { label: "35-44 th", min: 35, maks: 44 },
  { label: "45-54 th", min: 45, maks: 54 },
  { label: "55+ th", min: 55, maks: 120 },
];

export const WARNA_YA_TIDAK = { Ya: "B3362C", Tidak: "0A7A78", "Tidak diisi": "9FB3BB" };
export const WARNA_GENDER = { "Laki-laki": "3F6FB5", Perempuan: "D98C8C", "Tidak diisi": "9FB3BB" };

/** Menerima 2026-03-14 maupun 14/03/2026 (hari/bulan/tahun). */
export function tglDari(t: string | null | undefined): Date | null {
  if (!t) return null;
  const s = t.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return null;
}

export function umurPada(lahir: string | null | undefined, acuan: string | null | undefined): number | null {
  const l = tglDari(lahir);
  const a = tglDari(acuan);
  if (!l || !a) return null;
  let u = a.getFullYear() - l.getFullYear();
  if (a.getMonth() < l.getMonth() || (a.getMonth() === l.getMonth() && a.getDate() < l.getDate())) u -= 1;
  return u >= 0 && u <= 120 ? u : null;
}

export const labelUsia = (u: number | null) => (u == null ? "Tidak diisi" : (KELOMPOK_USIA.find((k) => u >= k.min && u <= k.maks)?.label ?? "Tidak diisi"));

export const labelGender = (v: string | null | undefined) => {
  const s = (v ?? "").trim().toLowerCase();
  if (s.startsWith("l")) return "Laki-laki";
  if (s.startsWith("p")) return "Perempuan";
  return "Tidak diisi";
};

export const labelYaTidak = (v: string | null | undefined) => {
  const teks = (v ?? "").trim();
  const s = teks.toLowerCase();
  if (!s || s === "-") return "Tidak diisi";
  if (["ya", "y", "iya"].includes(s)) return "Ya";
  if (["tidak", "tdk", "t", "no"].includes(s)) return "Tidak";
  return teks;
};

export const labelTeks = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim() || "Tidak diisi";

/** Hitung label menjadi donat. Huruf besar/kecil digabung; urutan dan warna opsional; maks = jumlah irisan sebelum "Lainnya". */
export function keDonat(judul: string, label: string[], opsi: { urutan?: string[]; warna?: Record<string, string>; maks?: number } = {}): Donat | null {
  const peta = new Map<string, { label: string; n: number }>();
  for (const l of label) {
    const k = l.toLowerCase();
    const x = peta.get(k);
    if (x) x.n += 1;
    else peta.set(k, { label: l, n: 1 });
  }
  let urut = Array.from(peta.values());
  const urutan = opsi.urutan;
  if (urutan) {
    const idx = (l: string) => {
      const i = urutan.indexOf(l);
      return i < 0 ? 999 : i;
    };
    urut.sort((a, b) => idx(a.label) - idx(b.label) || b.n - a.n);
  } else {
    urut.sort((a, b) => b.n - a.n);
  }
  if (opsi.maks) {
    const bukanLainnya = urut.filter((x) => x.label.toLowerCase() !== "lainnya");
    const kepala = bukanLainnya.slice(0, opsi.maks);
    const sisa = bukanLainnya.slice(opsi.maks).reduce((s, x) => s + x.n, 0) + urut.filter((x) => x.label.toLowerCase() === "lainnya").reduce((s, x) => s + x.n, 0);
    urut = sisa > 0 ? [...kepala, { label: "Lainnya", n: sisa }] : kepala;
  }
  const irisan = urut.filter((x) => x.n > 0).map((x) => ({ label: x.label, nilai: x.n, warna: opsi.warna?.[x.label] }));
  return irisan.length > 0 ? { judul, irisan } : null;
}