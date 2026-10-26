// Peta akses = terjemahan pg_policies Supabase (diambil 26 Okt 2026) ke aturan server.
// Level: publik = siapa saja (termasuk anon) | login = pengguna login berstatus aktif
//        petugas = admin/petugas | staf = admin/petugas/petugas_klinik (aksesAI, aksesPosko)
//        klinik = admin/petugas_klinik (aksesKlinik) | admin = role admin
//        server = tidak boleh dari klien (hanya kode server, tanpa gateway)
// Operasi yang tidak tercantum = "server". [LONGGAR] = sengaja MENIRU perilaku lama
// yang terbuka; [KETATKAN] = sengaja berbeda dari lama (lihat docs/PETA_AKSES_RLS.md).
export type Level = "publik" | "login" | "staf" | "petugas" | "klinik" | "admin" | "server";
export type Op = "select" | "insert" | "update" | "delete";

const P: Level = "publik", L: Level = "login", T: Level = "petugas", A: Level = "admin";
const bacaPublik = { select: P } as const;

export const AKSES: Record<string, Partial<Record<Op, Level>>> = {
  // A. baca publik saja
  hotspot_nasa_kaltim: bacaPublik, ispu_stasiun_harian: bacaPublik, klinik_binaan: bacaPublik,
  malaria_migrasi: bacaPublik, referensi_parameter_penyakit: bacaPublik, skdr_jenis_penyakit: bacaPublik,
  vektor_anopheles: bacaPublik, vektor_dbd: bacaPublik, vektor_diare: bacaPublik, vektor_tikus: bacaPublik,
  // B. tulis admin
  fasilitas_foto: { select: P, insert: A, update: A, delete: A },
  fasilitas_pelabuhan: { select: P, insert: A, update: A, delete: A },
  // C. tulis admin/petugas
  peraturan: { select: P, insert: T, update: T, delete: T },
  referensi_populasi_wilker: { select: P, insert: T, update: T, delete: T },
  simulasi_wabah_kapal: { select: P, insert: T, update: T },
  simulasi_wabah_pesawat: { select: P, insert: T, update: T },
  // D. input publik, ubah/hapus admin/petugas
  ispa_harian: { select: P, insert: P, update: T, delete: T },
  kualitas_udara_harian: { select: P, insert: P, update: T, delete: T },
  // E. terbuka penuh (insert+update publik) [LONGGAR]
  kegiatan_cop: { select: P, insert: P, update: P },
  kegiatan_phqc: { select: P, insert: P, update: P },
  kegiatan_pesawat: { select: P, insert: P, update: P },
  laporan_penyakit_nasional: { select: P, insert: P, update: P },
  laporan_penyakit_emerging: { select: P, insert: P, update: P },
  skdr_mingguan: { select: P, insert: P, update: P },
  // F. insert publik saja [LONGGAR]
  pab: { select: P, insert: P }, tpp: { select: P, insert: P }, ttu: { select: P, insert: P },
  rat_guard: { select: P, insert: P }, pengawasan_klinik: { select: P, insert: P },
  pengawasan_klinik_dokumen: { select: P, insert: P }, statistik_kunjungan: { select: P, insert: P },
  kunjungan_tamu: { insert: P }, // tidak ada policy SELECT di lama -> baca hanya dari server
  // G. tulis oleh pengguna login
  buletin: { select: P, insert: L, update: L, delete: L },
  foto_kegiatan: { select: P, insert: L, update: L /* [KETATKAN] lama: publik */, delete: L },
  jenis_kegiatan_foto: { select: P, insert: L, update: L /* [KETATKAN] lama: publik */ },
  lokasi_kualitas_udara: { select: P, insert: L, update: L, delete: L },
  wilayah_ispa: { select: P, insert: L, delete: L },
  riwayat_analisis_ai: { select: P, insert: L },
  // profiles, pengaturan_ai, pengaturan_klinik, wilker_ref, wilker_nama_alias: sengaja tidak ada (server saja)
};