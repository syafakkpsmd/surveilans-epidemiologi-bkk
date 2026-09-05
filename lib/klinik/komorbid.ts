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
  if (n.includes('lainnya')) return 'lainnya';
  return null;
}