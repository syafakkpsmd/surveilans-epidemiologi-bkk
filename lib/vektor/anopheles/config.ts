// lib/vektor/anopheles/config.ts
// Aman diimpor client maupun server.

/** Nilai kolom tipe_pengamatan di database. Cocokkan dengan hasil query verifikasi di bawah. */
export const TIPE_DB = { larva: 'larva', dewasa: 'dewasa' } as const;
export type Tipe = keyof typeof TIPE_DB;
export const TIPE: Tipe[] = ['larva', 'dewasa'];
export const LABEL_TIPE: Record<Tipe, string> = { larva: 'Larva (jentik)', dewasa: 'Nyamuk dewasa' };

export const ZONA = ['Buffer', 'Perimeter'] as const;
export type Zona = (typeof ZONA)[number];

export function bacaZona(v: unknown): Zona | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (s.startsWith('buffer')) return 'Buffer';
  if (s.startsWith('perimeter')) return 'Perimeter';
  return null;
}

export const FASE_BULAN = [
  'Baru', 'Sabit Awal', 'Seperempat Awal', 'Cembung Awal',
  'Purnama', 'Cembung Akhir', 'Seperempat Akhir', 'Sabit Akhir',
] as const;

// Daftar baku (nilai yang sudah ada di data; Cerah dan Hujan Sedang sekadar saran). Isian lain tetap boleh diketik.
export const CUACA = ['Cerah', 'Berawan', 'Gerimis', 'Hujan Ringan', 'Hujan Sedang', 'Hujan Lebat', 'Hujan Petir'];
export const MACAM_TEMPAT = ['Kubangan', 'Sungai Kecil', 'Lagoon', 'Muara Payau', 'Danau', 'Rawa-rawa'];
export const KEADAAN_TEMPAT = ['Jernih', 'Keruh', 'Terdapat tanaman'];
export const METODE_TANGKAP = ['Umpan Badan'];

/** Samakan huruf besar/kecil dengan daftar baku bila cocok; selain itu pakai teks apa adanya. */
export function samakan(v: string | null, daftar: readonly string[]): string | null {
  if (!v) return v;
  return daftar.find((d) => d.toLowerCase() === v.toLowerCase()) ?? v;
}

/** Fase bulan harus salah satu dari 8 nilai baku; "Bulan Baru" dan "Perempat Akhir" disamakan. */
export function bacaFaseBulan(v: unknown): { nilai: string | null } | { error: string } {
  const s = String(v ?? '').trim().toLowerCase()
    .replace(/^bulan\s+/, '').replace(/\bperempat\b/g, 'seperempat').replace(/\s+/g, ' ');
  if (!s) return { nilai: null };
  const m = FASE_BULAN.find((f) => f.toLowerCase() === s);
  return m ? { nilai: m } : { error: `Fase bulan "${v}" tidak dikenali` };
}