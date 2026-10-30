// lib/vektor/skema-input.ts
//
// SATU definisi kolom per jenis data vektor, dipakai bersama oleh:
//   - form input manual (dibuat otomatis dari definisi ini),
//   - impor Excel (pemetaan header, validasi, konversi),
//   - server action penyimpanan (validasi ulang di server).
// Murni (tanpa impor database), aman dipakai komponen 'use client'.
//
// Kolom HASIL HITUNG (HI, CI, BI, ABJ, TSI, Indeks Pinjal, MBR/MHD, Hasil Pengamatan, Fly Index,
// Kepadatan Kecoa) SENGAJA tidak ada di sini: trigger `trg_hitung_*` di MariaDB mengisinya saat INSERT.

export type JenisVektor = 'aedes' | 'anopheles-dewasa' | 'anopheles-larva' | 'lalat' | 'kecoa' | 'tikus';

export type TipeKolom = 'tanggal' | 'wilker' | 'pilihan' | 'teks' | 'teks-panjang' | 'bulat' | 'desimal';

export interface PilihanKolom {
  nilai: string;
  /** penulisan lain yang dianggap sama (huruf besar/kecil & aksen diabaikan) */
  alias?: string[];
}

export interface KolomInput {
  /** nama kolom di database */
  kunci: string;
  label: string;
  tipe: TipeKolom;
  wajib?: boolean;
  /** nama kolom lain yang dikenali di header Excel (kunci dan label sudah otomatis dikenali) */
  alias?: string[];
  pilihan?: PilihanKolom[];
  min?: number;
  maks?: number;
  maksPanjang?: number;
  satuan?: string;
  bantuan?: string;
  bawaan?: string;
  /** hanya untuk 'bulat': desimal tidak boleh */
}

export interface DefinisiVektor {
  jenis: JenisVektor;
  judul: string;
  tabel: 'vektor_dbd' | 'vektor_anopheles' | 'vektor_diare' | 'vektor_tikus';
  /** kolom tanggal utama */
  kolomTanggal: 'tgl_survei' | 'tgl_kegiatan';
  /** nilai yang selalu diisi (mis. tipe_pengamatan = 'dewasa') */
  nilaiTetap: Record<string, string>;
  kolom: KolomInput[];
  /** kolom DB penentu "baris yang sama" (dibandingkan null-aman) */
  kunciDuplikat: string[];
  /**
   * true bila kunciDuplikat adalah kunci alami yang unik (tanggal+wilayah+...), sehingga "perbarui"
   * (ganti baris lama) aman. false bila kuncinya memuat angka hasil: baris dengan angka berbeda dianggap
   * data baru, jadi mode perbarui tidak berarti dan selalu diperlakukan sebagai "lewati".
   */
  dukungPerbarui: boolean;
  /** tabel punya kolom input_oleh */
  adaInputOleh: boolean;
  /** contoh isi untuk template Excel (urutan sama dengan `kolom`) */
  contoh: (string | number)[];
}

const TGL_ALIAS = ['tanggal', 'tgl', 'tanggal pengamatan', 'tgl pengamatan', 'tanggal pemeriksaan', 'tgl pemeriksaan', 'date', 'tanggal kegiatan', 'tgl kegiatan', 'tanggal survei', 'tgl survei'];
const WILKER_ALIAS = ['wilker', 'kode wilker', 'wilayah', 'wilayah kerja bkk', 'lokasi wilker', 'pelabuhan', 'bandara', 'unit kerja', 'wk'];
const ZONA: PilihanKolom[] = [
  { nilai: 'Perimeter', alias: ['peri', 'perimeter area'] },
  { nilai: 'Buffer', alias: ['buf', 'buffer area', 'penyangga'] },
];
const NEGATIF_POSITIF: PilihanKolom[] = [
  { nilai: 'Negatif', alias: ['neg', '-', 'negative', 'tidak ditemukan'] },
  { nilai: 'Positif', alias: ['pos', '+', 'positive', 'ditemukan'] },
  { nilai: 'Pending', alias: ['proses', 'menunggu', 'belum ada hasil', 'belum'] },
];

const wilker = (): KolomInput => ({ kunci: 'kode_wilker', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: WILKER_ALIAS, bantuan: 'Nama atau kode (WK01-WK07), mis. Samarinda / Pelabuhan Samarinda / WK01' });
const suhu = (): KolomInput => ({ kunci: 'suhu_c', label: 'Suhu (°C)', tipe: 'desimal', min: 0, maks: 60, satuan: '°C', alias: ['suhu', 'temperatur', 'suhu c'] });
const lembap = (): KolomInput => ({ kunci: 'kelembapan_pct', label: 'Kelembapan (%)', tipe: 'desimal', min: 0, maks: 100, satuan: '%', alias: ['kelembapan', 'kelembaban', 'rh', 'kelembapan udara'] });
const cuaca = (): KolomInput => ({ kunci: 'cuaca', label: 'Cuaca', tipe: 'teks', maksPanjang: 255, alias: ['kondisi cuaca'] });
const hujan = (maks: number): KolomInput => ({ kunci: 'curah_hujan_mm', label: 'Curah Hujan (mm)', tipe: 'desimal', min: 0, maks, satuan: 'mm', alias: ['curah hujan', 'ch', 'hujan'] });

export const DEFINISI_VEKTOR: Record<JenisVektor, DefinisiVektor> = {
  // ------------------------------------------------------------------ Aedes / DBD
  aedes: {
    jenis: 'aedes',
    judul: 'Aedes / DBD (Jentik)',
    tabel: 'vektor_dbd',
    kolomTanggal: 'tgl_survei',
    nilaiTetap: {},
    kunciDuplikat: ['tgl_survei', 'kode_wilker', 'zona', 'sub_lokasi', 'jml_rumah_diperiksa', 'jml_positif_jentik'],
    dukungPerbarui: false,
    adaInputOleh: false,
    kolom: [
      { kunci: 'tgl_survei', label: 'Tanggal Survei', tipe: 'tanggal', wajib: true, alias: TGL_ALIAS },
      wilker(),
      { kunci: 'zona', label: 'Zona', tipe: 'pilihan', pilihan: ZONA, alias: ['area'] },
      { kunci: 'sub_lokasi', label: 'Sub Lokasi', tipe: 'pilihan', alias: ['sublokasi', 'lokasi'], bantuan: 'Hanya untuk Samarinda',
        pilihan: [{ nilai: 'Pelabuhan Umum', alias: ['umum', 'pelabuhan samarinda'] }, { nilai: 'TPK Palaran', alias: ['palaran', 'tpk'] }] },
      { kunci: 'jml_rumah_diperiksa', label: 'Jumlah Rumah/Bangunan Diperiksa', tipe: 'bulat', wajib: true, min: 0, maks: 100000, alias: ['rumah diperiksa', 'jml rumah', 'jumlah rumah', 'jumlah rumah diperiksa', 'jumlah bangunan diperiksa', 'bangunan diperiksa', 'jml bangunan'] },
      { kunci: 'jml_positif_jentik', label: 'Jumlah Positif Jentik', tipe: 'bulat', wajib: true, min: 0, maks: 100000, alias: ['positif jentik', 'rumah positif jentik', 'jumlah rumah positif', 'bangunan positif', 'jml positif', 'jumlah positif'] },
      { kunci: 'container_diperiksa', label: 'Jumlah Kontainer Diperiksa', tipe: 'bulat', min: 0, maks: 1000000, alias: ['kontainer diperiksa', 'container diperiksa', 'jumlah container diperiksa', 'jml container'] },
      { kunci: 'container_positif', label: 'Jumlah Kontainer Positif', tipe: 'bulat', min: 0, maks: 1000000, alias: ['kontainer positif', 'container positif', 'jumlah container positif'] },
      hujan(999999),
      { kunci: 'larvasida_gram', label: 'Larvasida (gram)', tipe: 'desimal', min: 0, maks: 999999, satuan: 'gram', alias: ['larvasida', 'abate', 'bubuk abate'] },
      { kunci: 'luas_wilayah_fogging_ha', label: 'Luas Fogging (ha)', tipe: 'desimal', min: 0, maks: 99999, satuan: 'ha', alias: ['luas fogging', 'luas wilayah fogging', 'luas fogging ha'] },
      { kunci: 'jml_insektisida_fogging_ml', label: 'Insektisida Fogging (ml)', tipe: 'desimal', min: 0, maks: 99999, satuan: 'ml', alias: ['insektisida fogging', 'insektisida', 'jumlah insektisida fogging'] },
      { kunci: 'tindakan_pengendalian', label: 'Tindakan Pengendalian', tipe: 'teks-panjang', maksPanjang: 2000, alias: ['tindakan', 'pengendalian'] },
    ],
    contoh: ['12/10/2026', 'Samarinda', 'Perimeter', '', 100, 8, 150, 10, 5.5, 200, 2.5, 150, 'PSN dan larvasida'],
  },

  // ------------------------------------------------------------------ Anopheles dewasa
  'anopheles-dewasa': {
    jenis: 'anopheles-dewasa',
    judul: 'Anopheles — Nyamuk Dewasa',
    tabel: 'vektor_anopheles',
    kolomTanggal: 'tgl_survei',
    nilaiTetap: { tipe_pengamatan: 'dewasa' },
    kunciDuplikat: ['tgl_survei', 'kode_wilker', 'zona', 'tipe_pengamatan'],
    dukungPerbarui: true,
    adaInputOleh: false,
    kolom: [
      { kunci: 'tgl_survei', label: 'Tanggal Survei', tipe: 'tanggal', wajib: true, alias: TGL_ALIAS },
      wilker(),
      { kunci: 'zona', label: 'Zona', tipe: 'pilihan', pilihan: ZONA, alias: ['area'] },
      { kunci: 'metode_tangkap', label: 'Metode Penangkapan', tipe: 'teks', maksPanjang: 255, alias: ['metode', 'metode tangkap', 'cara tangkap'], bantuan: 'mis. Umpan Orang, Umpan Hewan, Light Trap' },
      { kunci: 'jml_nyamuk', label: 'Jumlah Nyamuk', tipe: 'bulat', wajib: true, min: 0, maks: 1000000, alias: ['jumlah nyamuk tertangkap', 'nyamuk tertangkap', 'jml nyamuk'] },
      { kunci: 'jml_jam_tangkap', label: 'Jam Penangkapan', tipe: 'desimal', wajib: true, min: 0.01, maks: 99, satuan: 'jam', alias: ['jumlah jam tangkap', 'jam tangkap', 'lama tangkap', 'durasi tangkap', 'jml jam tangkap', 'jam'], bantuan: 'Harus lebih dari 0 agar MBR terhitung' },
      { kunci: 'spesies', label: 'Spesies', tipe: 'teks', maksPanjang: 255, alias: ['jenis nyamuk', 'spesies anopheles'] },
      { kunci: 'fase_bulan', label: 'Fase Bulan', tipe: 'teks', maksPanjang: 100, alias: ['bulan', 'fase'] },
      suhu(),
      lembap(),
      cuaca(),
    ],
    contoh: ['12/10/2026', 'Sangatta', 'Perimeter', 'Umpan Orang', 24, 12, 'An. barbirostris', 'Purnama', 28, 80, 'Cerah'],
  },

  // ------------------------------------------------------------------ Anopheles larva
  'anopheles-larva': {
    jenis: 'anopheles-larva',
    judul: 'Anopheles — Larva',
    tabel: 'vektor_anopheles',
    kolomTanggal: 'tgl_survei',
    nilaiTetap: { tipe_pengamatan: 'larva' },
    kunciDuplikat: ['tgl_survei', 'kode_wilker', 'zona', 'tipe_pengamatan'],
    dukungPerbarui: true,
    adaInputOleh: false,
    kolom: [
      { kunci: 'tgl_survei', label: 'Tanggal Survei', tipe: 'tanggal', wajib: true, alias: TGL_ALIAS },
      wilker(),
      { kunci: 'zona', label: 'Zona', tipe: 'pilihan', pilihan: ZONA, alias: ['area'] },
      { kunci: 'jumlah_cidukan', label: 'Jumlah Cidukan', tipe: 'bulat', min: 0, maks: 1000000, alias: ['cidukan', 'jml cidukan'] },
      { kunci: 'jumlah_larva', label: 'Jumlah Larva', tipe: 'bulat', min: 0, maks: 1000000, alias: ['larva', 'jml larva', 'jumlah larva anopheles'] },
      { kunci: 'jumlah_jenis_larva', label: 'Jumlah Jenis Larva', tipe: 'bulat', min: 0, maks: 1000, alias: ['jenis larva', 'jml jenis larva'] },
      { kunci: 'spesies_larva', label: 'Spesies Larva', tipe: 'teks', maksPanjang: 255, alias: ['spesies', 'jenis spesies larva'] },
      { kunci: 'macam_tempat_perindukan', label: 'Macam Tempat Perindukan', tipe: 'teks', maksPanjang: 255, alias: ['tempat perindukan', 'macam tpp', 'jenis tempat perindukan'] },
      { kunci: 'keadaan_tempat_perindukan', label: 'Keadaan Tempat Perindukan', tipe: 'teks-panjang', maksPanjang: 2000, alias: ['keadaan tpp', 'kondisi tempat perindukan'] },
      suhu(),
      lembap(),
      cuaca(),
    ],
    contoh: ['12/10/2026', 'Sangatta', 'Buffer', 20, 35, 2, 'An. sundaicus', 'Genangan air payau', 'Air keruh, banyak lumut', 29, 82, 'Berawan'],
  },

  // ------------------------------------------------------------------ Lalat
  lalat: buatDiare('lalat'),
  kecoa: buatDiare('kecoa'),

  // ------------------------------------------------------------------ Tikus & pinjal
  tikus: {
    jenis: 'tikus',
    judul: 'Tikus & Pinjal',
    tabel: 'vektor_tikus',
    kolomTanggal: 'tgl_survei',
    nilaiTetap: {},
    kunciDuplikat: ['tgl_survei', 'kode_wilker', 'area_survei', 'jenis_trap'],
    dukungPerbarui: true,
    adaInputOleh: true,
    kolom: [
      { kunci: 'tgl_survei', label: 'Tanggal Survei', tipe: 'tanggal', wajib: true, alias: TGL_ALIAS },
      wilker(),
      { kunci: 'area_survei', label: 'Area Survei', tipe: 'teks', maksPanjang: 255, alias: ['area', 'lokasi survei', 'lokasi'] },
      { kunci: 'jenis_trap', label: 'Jenis Trap', tipe: 'teks', maksPanjang: 100, alias: ['trap', 'jenis perangkap', 'perangkap'], bantuan: 'mis. Single trap, Cage trap' },
      { kunci: 'jml_trap_dipasang', label: 'Jumlah Trap Dipasang', tipe: 'bulat', wajib: true, min: 0, maks: 1000000, alias: ['trap dipasang', 'jml trap dipasang', 'jumlah trap', 'jumlah perangkap dipasang'] },
      { kunci: 'jml_trap_tertangkap', label: 'Jumlah Trap Tertangkap', tipe: 'bulat', wajib: true, min: 0, maks: 1000000, alias: ['trap tertangkap', 'jml trap tertangkap', 'tikus tertangkap', 'jumlah tikus tertangkap', 'jumlah tikus'] },
      { kunci: 'rt', label: 'Rattus tanezumi (RT)', tipe: 'bulat', min: 0, maks: 1000000, alias: ['rt', 'rattus tanezumi', 'r tanezumi', 'r. tanezumi'] },
      { kunci: 'rn', label: 'Rattus norvegicus (RN)', tipe: 'bulat', min: 0, maks: 1000000, alias: ['rn', 'rattus norvegicus', 'r norvegicus', 'r. norvegicus'] },
      { kunci: 'mm', label: 'Mus musculus (MM)', tipe: 'bulat', min: 0, maks: 1000000, alias: ['mm', 'mus musculus', 'm musculus', 'm. musculus'] },
      { kunci: 'jenis_lainnya', label: 'Spesies Lainnya', tipe: 'bulat', min: 0, maks: 1000000, alias: ['lainnya', 'jenis lainnya', 'tikus lainnya'] },
      { kunci: 'spesies_dominan', label: 'Spesies Dominan', tipe: 'teks', maksPanjang: 255, alias: ['dominan', 'spesies tikus dominan'] },
      { kunci: 'jml_pinjal_ditemukan', label: 'Jumlah Pinjal Ditemukan', tipe: 'bulat', min: 0, maks: 1000000, alias: ['pinjal', 'jml pinjal', 'jumlah pinjal', 'pinjal ditemukan'] },
      { kunci: 'uji_lab', label: 'Uji Laboratorium', tipe: 'pilihan', bawaan: 'Tidak', alias: ['uji lab', 'dilakukan uji lab'],
        pilihan: [{ nilai: 'Ya', alias: ['y', 'yes', 'ada', 'dilakukan'] }, { nilai: 'Tidak', alias: ['t', 'n', 'no', 'tidak ada', 'tdk', 'tidak dilakukan'] }] },
      { kunci: 'hasil_leptospira', label: 'Hasil Leptospira', tipe: 'pilihan', pilihan: NEGATIF_POSITIF, alias: ['leptospira', 'lepto'] },
      { kunci: 'jumlah_positif_leptospira', label: 'Jumlah Positif Leptospira', tipe: 'bulat', min: 0, maks: 1000000, alias: ['positif leptospira', 'positif lepto'] },
      { kunci: 'hasil_pes', label: 'Hasil Pes', tipe: 'pilihan', pilihan: NEGATIF_POSITIF, alias: ['pes', 'hasil pest'] },
      { kunci: 'jumlah_positif_pes', label: 'Jumlah Positif Pes', tipe: 'bulat', min: 0, maks: 1000000, alias: ['positif pes'] },
      { kunci: 'hasil_hantavirus', label: 'Hasil Hantavirus', tipe: 'pilihan', pilihan: NEGATIF_POSITIF, alias: ['hantavirus', 'hanta'] },
      { kunci: 'jumlah_positif_hantavirus', label: 'Jumlah Positif Hantavirus', tipe: 'bulat', min: 0, maks: 1000000, alias: ['positif hantavirus', 'positif hanta'] },
      { kunci: 'keterangan', label: 'Keterangan', tipe: 'teks-panjang', maksPanjang: 2000, alias: ['catatan'] },
    ],
    contoh: ['12/10/2026', 'Samarinda', 'Gudang A', 'Single trap', 50, 6, 3, 2, 1, 0, 'Rattus tanezumi', 12, 'Tidak', '', '', '', '', '', '', ''],
  },
};

function buatDiare(jenis: 'lalat' | 'kecoa'): DefinisiVektor {
  const lalat = jenis === 'lalat';
  return {
    jenis,
    judul: lalat ? 'Lalat (Fly Index)' : 'Kecoa (Kepadatan)',
    tabel: 'vektor_diare',
    kolomTanggal: 'tgl_kegiatan',
    nilaiTetap: { jenis_kegiatan: jenis },
    kunciDuplikat: ['tgl_kegiatan', 'kode_wilker', 'jenis_kegiatan', 'lokasi', 'nilai_hasil_pengamatan'],
    dukungPerbarui: false,
    adaInputOleh: true,
    kolom: [
      { kunci: 'tgl_kegiatan', label: 'Tanggal Kegiatan', tipe: 'tanggal', wajib: true, alias: TGL_ALIAS },
      wilker(),
      { kunci: 'lokasi', label: 'Lokasi', tipe: 'teks', maksPanjang: 255, alias: ['lokasi pengamatan', 'tempat', 'lokasi kegiatan'] },
      lalat
        ? { kunci: 'nilai_hasil_pengamatan', label: 'Fly Index', tipe: 'desimal', wajib: true, min: 0, maks: 9999, alias: ['fly index', 'indeks lalat', 'nilai', 'hasil pengamatan', 'nilai hasil pengamatan', 'rata rata lalat'], bantuan: 'Rata-rata per grill; di bawah 2 = Memenuhi Syarat' }
        : { kunci: 'nilai_hasil_pengamatan', label: 'Kepadatan Kecoa (ekor/m²)', tipe: 'desimal', wajib: true, min: 0, maks: 9999, satuan: 'ekor/m²', alias: ['kepadatan kecoa', 'kepadatan', 'nilai', 'hasil pengamatan', 'nilai hasil pengamatan', 'ekor per m2'], bantuan: 'Di bawah 2 = Memenuhi Syarat' },
      { kunci: 'tindakan_pengendalian', label: 'Tindakan Pengendalian', tipe: 'teks-panjang', maksPanjang: 2000, alias: ['tindakan', 'pengendalian'] },
      { kunci: 'insektisida_terpakai_ml', label: 'Insektisida Terpakai (ml)', tipe: 'desimal', min: 0, maks: 999999, satuan: 'ml', alias: ['insektisida', 'insektisida terpakai', 'jumlah insektisida'] },
      { kunci: 'luas_area_semprot_m2', label: 'Luas Area Semprot (m²)', tipe: 'desimal', min: 0, maks: 999999, satuan: 'm²', alias: ['luas area semprot', 'luas semprot', 'luas area penyemprotan'] },
      suhu(),
      lembap(),
      cuaca(),
      hujan(99999),
      { kunci: 'keterangan', label: 'Keterangan', tipe: 'teks-panjang', maksPanjang: 2000, alias: ['catatan'] },
    ],
    contoh: ['12/10/2026', 'Samarinda', 'Terminal penumpang', lalat ? 1.5 : 1.2, 'Penyemprotan residual', 200, 150, 29, 80, 'Cerah', 0, ''],
  };
}

export const DAFTAR_JENIS_VEKTOR: JenisVektor[] = ['aedes', 'anopheles-dewasa', 'anopheles-larva', 'lalat', 'kecoa', 'tikus'];

/** Jenis awal berdasarkan alamat halaman yang sedang dibuka. */
export function jenisDariPath(path: string): JenisVektor {
  if (path.includes('/anopheles/larva')) return 'anopheles-larva';
  if (path.includes('/anopheles')) return 'anopheles-dewasa';
  if (path.includes('/diare-lalat')) return 'lalat';
  if (path.includes('/diare-kecoa')) return 'kecoa';
  if (path.includes('/tikus')) return 'tikus';
  return 'aedes';
}
