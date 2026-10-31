export const DAFTAR_KOMORBID = [
  { key: 'hipertensi', label: 'Hipertensi', warna: '#DC2626' },
  { key: 'diabetes', label: 'Diabetes', warna: '#EA580C' },
  { key: 'jantung', label: 'Penyakit Jantung', warna: '#DB2777' },
  { key: 'paru', label: 'Penyakit Paru-paru', warna: '#7C3AED' },
  { key: 'ginjal', label: 'Gangguan Ginjal', warna: '#2563EB' },
  { key: 'kanker', label: 'Kanker', warna: '#000000' },
  { key: 'asma', label: 'Asma', warna: '#0891B2' },
  { key: 'anemia', label: 'Anemia', warna: '#65A30D' },
  { key: 'alergi', label: 'Alergi', warna: '#CA8A04' },
  { key: 'leukimia', label: 'Leukimia', warna: '#9333EA' },
  { key: 'hiv_aids', label: 'HIV / AIDS', warna: '#BE185D' },
  { key: 'autoimun', label: 'Autoimun', warna: '#0D9488' },
  { key: 'hipertiroid', label: 'Hipertiroid', warna: '#F59E0B' },
  { key: 'tumor', label: 'Riwayat Tumor', warna: '#4B5563' },
  { key: 'lainnya', label: 'Lainnya', warna: '#6B7280' },
] as const;

export type KomorbidKey = typeof DAFTAR_KOMORBID[number]['key'];

export function komorbidKosong(): Record<KomorbidKey, number> {
  return Object.fromEntries(DAFTAR_KOMORBID.map((k) => [k.key, 0])) as Record<KomorbidKey, number>;
}

/** Normalisasi nilai dropdown sheet -> key kanonik. Return null kalau kosong/'-'/tidak dikenali. */
export function deteksiKomorbid(nilai: string | null | undefined): KomorbidKey | null {
  if (!nilai) return null;
  const n = nilai.trim().toLowerCase();
  if (!n || n === '-') return null;
  if (n.includes('hipertensi')) return 'hipertensi';
  if (n.includes('diabetes')) return 'diabetes';
  if (n.includes('jantung')) return 'jantung';
  if (n.includes('paru')) return 'paru';
  if (n.includes('ginjal')) return 'ginjal';
  if (n.includes('kanker')) return 'kanker';
  if (n.includes('asma')) return 'asma';
  if (n.includes('anemia')) return 'anemia';
  if (n.includes('alergi')) return 'alergi';
  if (n.includes('leukimia')) return 'leukimia';
  if (n.includes('hiv') || n.includes('aids')) return 'hiv_aids';
  if (n.includes('autoimun')) return 'autoimun';
  if (n.includes('hipertiroid')) return 'hipertiroid';
  if (n.includes('tumor')) return 'tumor';
  if (n.includes('lainnya')) return 'lainnya';
  if (TIDAK_ADA.has(n)) return null;
  return 'lainnya'; // penyakit di luar daftar dropdown tetap terhitung, sebagai "Lainnya"
}

const TIDAK_ADA = new Set(['tidak', 'tidak ada', 'tdk', 'tdk ada', 'nihil', 'none', 'no', 'n/a', '--']);

/** Semua isian komorbid satu baris: "Komorbid 1", "Komorbid 2", ... "Komorbid N" (form aplikasi bisa lebih dari 2). */
export function komorbidDariBaris(row: Record<string, unknown>): string[] {
  return Object.keys(row)
    .map((k) => ({ k, m: /^Komorbid (\d+)$/.exec(k) }))
    .filter((x): x is { k: string; m: RegExpExecArray } => !!x.m)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]))
    .map((x) => String(row[x.k] ?? ''));
}