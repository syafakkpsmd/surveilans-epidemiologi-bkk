// lib/wilayah-kerja/modul.ts
// Katalog modul yang kewajiban/ketersediaannya diatur PER WILAYAH KERJA (tabel `wilker_modul`).
// Murni (tanpa database), aman dipakai komponen 'use client'. Menambah modul baru = tambah satu baris di sini,
// lalu pakai getWilkerModul('<kunci>') di kode server; admin tinggal mencentang wilayahnya di halaman pengaturan.

export const MODUL_WILKER = [
  { kunci: 'poliklinik', label: 'Kunjungan Poliklinik' },
  { kunci: 'kier', label: 'KIER Kesehatan' },
  { kunci: 'siaos', label: 'SIAOS' },
  { kunci: 'posko', label: 'Posko' },
  { kunci: 'penumpang_kapal', label: 'Penumpang Kapal' },
  { kunci: 'skdr', label: 'SKDR' },
  { kunci: 'tb', label: 'Surveilans TB' },
  { kunci: 'hiv', label: 'Surveilans HIV' },
  { kunci: 'malaria', label: 'Migrasi Malaria' },
  { kunci: 'tpp', label: 'Sanitasi TPP (Tempat Pengolahan Pangan)' },
  { kunci: 'ttu', label: 'Sanitasi TTU (Tempat-Tempat Umum)' },
  { kunci: 'pab', label: 'Sanitasi PAB (Penyediaan Air Bersih)' },
  { kunci: 'limbah_b3', label: 'Pemeriksaan Limbah B3 Klinik' },
  { kunci: 'udara_ruang', label: 'Pemeriksaan Udara Dalam Ruang' },
  { kunci: 'vektor_sub_lokasi', label: 'Vektor Aedes/Anopheles: filter Zona & Sub-lokasi' },
  { kunci: 'rat_guard', label: 'Rat Guard' },
] as const;

export type KunciModulWilker = (typeof MODUL_WILKER)[number]['kunci'];
export const DAFTAR_KUNCI_MODUL: readonly KunciModulWilker[] = MODUL_WILKER.map((m) => m.kunci);

/** Kode wilayah yang menjalankan tiap modul. Modul tanpa wilayah = daftar kosong. */
export type PetaModulWilker = Record<KunciModulWilker, string[]>;

export function petaModulKosong(): PetaModulWilker {
  return Object.fromEntries(DAFTAR_KUNCI_MODUL.map((k) => [k, [] as string[]])) as PetaModulWilker;
}
