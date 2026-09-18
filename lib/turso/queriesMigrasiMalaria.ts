import type { InValue } from '@libsql/client';
import { getRentangMingguEpid } from '@/lib/supabase/queriesVektorBreakdown';
import { getTursoClient } from './client';

export type RingkasanUtamaMalaria = {
  totalResponden: number;
  totalDiperiksaRdt: number;
  totalPositifRdt: number;
  angkaPositivitas: number; // persen, 1 desimal
  jumlahWilkerAktif: number;
};

export type BreakdownItem = {
  kategori: string;
  jumlah: number;
};

export type BreakdownMultiSelect = {
  kategori: string;
  jumlah: number;
  persenDariResponden: number;
};

export type RuteMigrasi = {
  rute: string;
  jumlah: number;
};

/** Satu titik data mingguan, siap dipakai TrenChartMingguan (dataKey minggu_epid = label "Mg-N"). */
export type TitikTrenGenderMinggu = {
  minggu_epid: string; // label "Mg-1", "Mg-2", dst — dipakai sebagai sumbu X
  diperiksa: number;
  positif_rdt: number;
  laki_laki: number;
  perempuan: number;
};

/** Satu titik data bulanan, siap dipakai GrafikBarBulanan (dataKey default bulanLabel). */
export type TitikTrenGenderBulan = {
  bulanLabel: string; // "Jan 2026", dst
  diperiksa: number;
  positif_rdt: number;
  laki_laki: number;
  perempuan: number;
};

type FilterPeriode = {
  tahun: number;
  kodeWilker?: string;
};

// Kolom pilihan TUNGGAL (radio / satu jawaban per baris).
const KOLOM_KATEGORI_DIIZINKAN = [
  'jenis_kelamin',
  'pekerjaan',
  'pendidikan_terakhir',
  'pernah_sakit_malaria',
  'tahu_penyakit_malaria',
  'tahu_gejala_malaria',
  'sekitar_pernah_sakit_malaria',
  'pernah_dapat_informasi_malaria',
  'punya_ternak',
  'tempat_buang_hajat',
  'pakai_baju_panjang_repellent',
  'hasil_rdt',
] as const;
export type KolomKategoriMigrasi = (typeof KOLOM_KATEGORI_DIIZINKAN)[number];

// Kolom pilihan GANDA (checkbox — nilai tersimpan gabungan dipisah koma,
// mis. "Kelambu, Reppelent"). Dihitung per-opsi, bukan sebagai satu kategori utuh.
// ASUMSI: sekitar_dekat_dengan dianggap checkbox mengikuti pola "...dekat dengan..."
// yang sama dengan 2 pertanyaan checkbox lain yang sudah terkonfirmasi dari screenshot form.
const KOLOM_MULTI_SELECT_DIIZINKAN = [
  'pakai_saat_tidur',
  'tempat_berobat',
  'sekitar_dekat_dengan',
] as const;
export type KolomMultiSelectMigrasi = (typeof KOLOM_MULTI_SELECT_DIIZINKAN)[number];

const NAMA_BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Kamus normalisasi untuk kolom yang datanya sering ditulis manual (typo,
 * beda kapitalisasi) meski seharusnya pilihan tertutup. Kunci HARUS huruf
 * kecil semua (dibandingkan setelah di-lowercase+trim). Tambahkan entri baru
 * di sini kalau nanti ketemu varian typo lain di data.
 *
 * CATATAN: "Sarjana/Diploma" sengaja TIDAK saya gabung ke "Perguruan Tinggi"
 * karena saya tidak yakin keduanya dimaksudkan sebagai jawaban yang sama —
 * kalau memang sama, tambahkan baris pemetaannya di sini.
 */
const PETA_NORMALISASI_KATEGORI: Partial<Record<KolomKategoriMigrasi, Record<string, string>>> = {
  jenis_kelamin: {
    'laki-laki': 'Laki-laki',
    'laki laki': 'Laki-laki',
    'lakilaki': 'Laki-laki',
    'l': 'Laki-laki',
    'perempuan': 'Perempuan',
    'peremuan': 'Perempuan', // typo umum: n tertukar m
    'perenpuan': 'Perempuan', // typo umum: n tertukar m
    'p': 'Perempuan',
  },
  pendidikan_terakhir: {
    'sd/sederajat': 'SD/Sederajat',
    'sd': 'SD/Sederajat',
    'sd/derajat': 'SD/Sederajat',
    'smp/sederajat': 'SMP/Sederajat',
    'smp/sederajad': 'SMP/Sederajat',
    'smp/derajat': 'SMP/Sederajat', // typo: kurang "Se"
    'smp': 'SMP/Sederajat',
    'sma/sederajat': 'SMA/Sederajat',
    'sma/derajat': 'SMA/Sederajat', // typo: kurang "Se"
    'sma': 'SMA/Sederajat',
    'perguruan tinggi': 'Perguruan Tinggi',
    'sarjana/diploma': 'Sarjana/Diploma',
  },
};

/** Menyamakan varian typo/kapitalisasi ke satu label baku, kalau kolomnya punya kamus normalisasi. */
function normalisasiKategori(kolom: KolomKategoriMigrasi, nilaiMentah: string): string {
  const nilaiTrim = nilaiMentah.trim();
  const peta = PETA_NORMALISASI_KATEGORI[kolom];
  if (!peta) return nilaiTrim;
  return peta[nilaiTrim.toLowerCase()] ?? nilaiTrim;
}

/**
 * Urutan tampil untuk kolom yang sifatnya berjenjang/ordinal — di sini urutan
 * jenjang lebih bermakna daripada urutan frekuensi. Kolom yang tidak terdaftar
 * di sini tetap diurutkan berdasar jumlah terbanyak (default).
 * ASUMSI: "Sarjana/Diploma" saya taruh setara/setelah "Perguruan Tinggi" —
 * sesuaikan urutannya kalau beda maksudnya di form kamu.
 */
const URUTAN_ORDINAL_KATEGORI: Partial<Record<KolomKategoriMigrasi, string[]>> = {
  pendidikan_terakhir: [
    'Tidak Lulus SD',
    'SD/Sederajat',
    'SMP/Sederajat',
    'SMA/Sederajat',
    'Sarjana/Diploma',
    'Perguruan Tinggi',
  ],
};

/** Mengurutkan hasil breakdown: pakai urutan ordinal kalau kolomnya terdaftar, kalau tidak urutkan berdasar jumlah terbanyak. */
function urutkanBreakdown(kolom: KolomKategoriMigrasi, data: BreakdownItem[]): BreakdownItem[] {
  const urutan = URUTAN_ORDINAL_KATEGORI[kolom];
  if (!urutan) {
    return [...data].sort((a, b) => b.jumlah - a.jumlah);
  }
  return [...data].sort((a, b) => {
    const idxA = urutan.indexOf(a.kategori);
    const idxB = urutan.indexOf(b.kategori);
    if (idxA === -1 && idxB === -1) return b.jumlah - a.jumlah; // dua-duanya di luar daftar → urut jumlah
    if (idxA === -1) return 1; // yang tidak terdaftar ditaruh di akhir
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
}

/**
 * FilterWilker (komponen bersama) mengirim KODE wilker (WK01, WK06, dst — lihat
 * @/lib/status-laporan/core.ts:DAFTAR_WILKER), tapi kolom `wilayah_kerja` di
 * migrasi_malaria berisi NAMA TEKS bebas hasil entri manual di form (kadang
 * tidak lengkap, mis. "Sangkulirang" bukan "Pelabuhan Sangkulirang"). Jadi
 * pencocokan pakai kata kunci nama tempat yang khas + LIKE, bukan '=' persis.
 */
const KODE_KE_KATA_KUNCI_WILKER: Record<string, string> = {
  WK01: 'Samarinda',
  WK02: 'Tanjung Santan',
  WK03: 'Tanjung Laut',
  WK04: 'Lhoktuan',
  WK05: 'Sangatta',
  WK06: 'Sangkulirang',
  WK07: 'APT Pranoto',
};

function buildFilterWilker(kodeWilker?: string): { klausa: string; args: InValue[] } {
  if (!kodeWilker || kodeWilker === 'Semua') {
    return { klausa: '', args: [] };
  }
  const kataKunci = KODE_KE_KATA_KUNCI_WILKER[kodeWilker];
  if (!kataKunci) {
    // Kode tidak dikenal (bukan salah satu WK01–WK07) — fallback cocokkan persis
    // supaya tidak diam-diam menampilkan semua data kalau kodenya salah/berubah.
    return { klausa: ' AND wilayah_kerja = ?', args: [kodeWilker] };
  }
  return { klausa: ' AND wilayah_kerja LIKE ?', args: [`%${kataKunci}%`] };
}

function isoTanggal(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * getRentangMingguEpid bisa saja mengembalikan Date atau string 'YYYY-MM-DD'
 * (di halaman lain hasilnya dioper langsung tanpa konversi eksplisit) — ini
 * menangani kedua kemungkinan supaya query tetap aman dipakai Turso.
 */
function keTanggalIso(nilai: Date | string): string {
  return nilai instanceof Date ? isoTanggal(nilai) : String(nilai).slice(0, 10);
}

/** Daftar wilayah kerja yang benar-benar punya data di tabel migrasi_malaria. */
export async function getDaftarWilkerMigrasi(): Promise<string[]> {
  const client = getTursoClient();
  const hasil = await client.execute(
    `SELECT DISTINCT wilayah_kerja FROM migrasi_malaria
     WHERE wilayah_kerja IS NOT NULL AND TRIM(wilayah_kerja) != ''
     ORDER BY wilayah_kerja ASC`
  );
  return hasil.rows.map((r) => String(r.wilayah_kerja));
}

/** KPI headline: total responden, cakupan RDT, angka positivitas. */
export async function getRingkasanUtamaMigrasi({
  tahun,
  kodeWilker,
}: FilterPeriode): Promise<RingkasanUtamaMalaria> {
  const client = getTursoClient();
  const { klausa, args } = buildFilterWilker(kodeWilker);

  const hasil = await client.execute({
    sql: `
      SELECT
        COUNT(*) AS total_responden,
        SUM(CASE
          WHEN hasil_rdt IS NOT NULL AND TRIM(hasil_rdt) != '' AND LOWER(hasil_rdt) NOT LIKE '%tidak%'
          THEN 1 ELSE 0 END) AS total_diperiksa_rdt,
        SUM(CASE WHEN LOWER(hasil_rdt) LIKE 'positif%' THEN 1 ELSE 0 END) AS total_positif_rdt,
        COUNT(DISTINCT wilayah_kerja) AS jumlah_wilker
      FROM migrasi_malaria
      WHERE strftime('%Y', tanggal_kegiatan) = ?${klausa}
    `,
    args: [String(tahun), ...args],
  });

  const row = hasil.rows[0];
  const totalResponden = Number(row?.total_responden ?? 0);
  const totalDiperiksaRdt = Number(row?.total_diperiksa_rdt ?? 0);
  const totalPositifRdt = Number(row?.total_positif_rdt ?? 0);

  return {
    totalResponden,
    totalDiperiksaRdt,
    totalPositifRdt,
    angkaPositivitas:
      totalDiperiksaRdt > 0 ? Number(((totalPositifRdt / totalDiperiksaRdt) * 100).toFixed(1)) : 0,
    jumlahWilkerAktif: Number(row?.jumlah_wilker ?? 0),
  };
}

/**
 * Breakdown generik untuk satu kolom kategorikal TUNGGAL (jawaban kuesioner KAP,
 * RDT, dll). Varian typo/beda kapitalisasi digabung dulu lewat
 * PETA_NORMALISASI_KATEGORI sebelum di-LIMIT, supaya "Laki-Laki" dan
 * "laki-Laki" tidak dihitung sebagai dua kategori terpisah di chart.
 */
export async function getBreakdownKategoriMigrasi({
  tahun,
  kodeWilker,
  kolom,
  limit = 8,
}: FilterPeriode & { kolom: KolomKategoriMigrasi; limit?: number }): Promise<BreakdownItem[]> {
  if (!KOLOM_KATEGORI_DIIZINKAN.includes(kolom)) {
    throw new Error(`Kolom "${kolom}" tidak diizinkan untuk breakdown.`);
  }
  const client = getTursoClient();
  const { klausa, args } = buildFilterWilker(kodeWilker);

  const hasil = await client.execute({
    sql: `
      SELECT ${kolom} AS kategori, COUNT(*) AS jumlah
      FROM migrasi_malaria
      WHERE strftime('%Y', tanggal_kegiatan) = ?${klausa}
        AND ${kolom} IS NOT NULL AND TRIM(${kolom}) != ''
      GROUP BY kategori
    `,
    args: [String(tahun), ...args],
  });

  const gabungan = new Map<string, number>();
  for (const row of hasil.rows) {
    const label = normalisasiKategori(kolom, String(row.kategori));
    gabungan.set(label, (gabungan.get(label) ?? 0) + Number(row.jumlah));
  }

  const gabunganArray: BreakdownItem[] = Array.from(gabungan.entries()).map(([kategori, jumlah]) => ({
    kategori,
    jumlah,
  }));

  return urutkanBreakdown(kolom, gabunganArray).slice(0, limit);
}

/**
 * Breakdown untuk kolom CHECKBOX (multi-pilihan). Nilai mentah dipisah dengan
 * koma lalu dihitung per-opsi. persenDariResponden dihitung dari jumlah
 * responden yang menjawab pertanyaan ini (bukan dari total seluruh pilihan),
 * karena satu responden bisa masuk beberapa kategori sekaligus.
 */
export async function getBreakdownMultiSelectMigrasi({
  tahun,
  kodeWilker,
  kolom,
}: FilterPeriode & { kolom: KolomMultiSelectMigrasi }): Promise<BreakdownMultiSelect[]> {
  if (!KOLOM_MULTI_SELECT_DIIZINKAN.includes(kolom)) {
    throw new Error(`Kolom "${kolom}" tidak diizinkan untuk breakdown multi-pilihan.`);
  }
  const client = getTursoClient();
  const { klausa, args } = buildFilterWilker(kodeWilker);

  const hasil = await client.execute({
    sql: `
      SELECT ${kolom} AS nilai
      FROM migrasi_malaria
      WHERE strftime('%Y', tanggal_kegiatan) = ?${klausa}
        AND ${kolom} IS NOT NULL AND TRIM(${kolom}) != ''
    `,
    args: [String(tahun), ...args],
  });

  const totalResponden = hasil.rows.length;
  const hitung = new Map<string, number>();
  for (const row of hasil.rows) {
    const opsiTerpilih = String(row.nilai)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const opsi of opsiTerpilih) {
      hitung.set(opsi, (hitung.get(opsi) ?? 0) + 1);
    }
  }

  return Array.from(hitung.entries())
    .map(([kategori, jumlah]) => ({
      kategori,
      jumlah,
      persenDariResponden: totalResponden > 0 ? Number(((jumlah / totalResponden) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

/** 10 rute migrasi (asal → tujuan) dengan responden terbanyak. */
export async function getRuteMigrasiTeratas({
  tahun,
  kodeWilker,
  limit = 10,
}: FilterPeriode & { limit?: number }): Promise<RuteMigrasi[]> {
  const client = getTursoClient();
  const { klausa, args } = buildFilterWilker(kodeWilker);

  const hasil = await client.execute({
    sql: `
      SELECT (TRIM(alamat_asal) || ' → ' || TRIM(alamat_tujuan)) AS rute, COUNT(*) AS jumlah
      FROM migrasi_malaria
      WHERE strftime('%Y', tanggal_kegiatan) = ?${klausa}
        AND alamat_asal IS NOT NULL AND TRIM(alamat_asal) != ''
        AND alamat_tujuan IS NOT NULL AND TRIM(alamat_tujuan) != ''
      GROUP BY rute
      ORDER BY jumlah DESC
      LIMIT ?
    `,
    args: [String(tahun), ...args, limit],
  });

  return hasil.rows.map((r) => ({ rute: String(r.rute), jumlah: Number(r.jumlah) }));
}

/** Distribusi kelompok usia responden (untuk profil demografi migrasi). */
export async function getDistribusiUsiaMigrasi({
  tahun,
  kodeWilker,
}: FilterPeriode): Promise<BreakdownItem[]> {
  const client = getTursoClient();
  const { klausa, args } = buildFilterWilker(kodeWilker);

  const hasil = await client.execute({
    sql: `
      SELECT
        CASE
          WHEN umur IS NULL OR TRIM(umur) = '' THEN 'Tidak diketahui'
          WHEN CAST(umur AS INTEGER) < 15 THEN '< 15 tahun'
          WHEN CAST(umur AS INTEGER) BETWEEN 15 AND 24 THEN '15–24 tahun'
          WHEN CAST(umur AS INTEGER) BETWEEN 25 AND 44 THEN '25–44 tahun'
          WHEN CAST(umur AS INTEGER) BETWEEN 45 AND 64 THEN '45–64 tahun'
          ELSE '≥ 65 tahun'
        END AS kategori,
        COUNT(*) AS jumlah
      FROM migrasi_malaria
      WHERE strftime('%Y', tanggal_kegiatan) = ?${klausa}
      GROUP BY kategori
      ORDER BY
        CASE kategori
          WHEN '< 15 tahun' THEN 1
          WHEN '15–24 tahun' THEN 2
          WHEN '25–44 tahun' THEN 3
          WHEN '45–64 tahun' THEN 4
          WHEN '≥ 65 tahun' THEN 5
          ELSE 6
        END
    `,
    args: [String(tahun), ...args],
  });

  return hasil.rows.map((r) => ({ kategori: String(r.kategori), jumlah: Number(r.jumlah) }));
}

/**
 * Tren MINGGUAN diperiksa/positif RDT/jenis kelamin, untuk chart
 * GrafikTrenMultiVariabel + picker FilterRentangMinggu (param mgDari/mgSampai,
 * nomor minggu 1–52 dalam tahun `tahun`).
 *
 * Rentang tanggal tiap minggu dihitung lewat getRentangMingguEpid (dari
 * @/lib/supabase/queriesVektorBreakdown) — fungsi yang sama dipakai modul
 * vektor lain — supaya definisi "minggu epid" konsisten di seluruh aplikasi,
 * BUKAN reimplementasi sendiri. Satu query agregat dijalankan per minggu
 * (paralel via Promise.all) karena getRentangMingguEpid searah
 * (minggu → rentang tanggal), tidak ada fungsi baliknya (tanggal → minggu)
 * untuk bucketing satu query gabungan.
 * ASUMSI nilai jenis_kelamin: diawali "L" untuk Laki-laki, "P" untuk Perempuan.
 */
export async function getTrenMingguanRdtGender({
  tahun,
  mgDari,
  mgSampai,
  kodeWilker,
}: {
  tahun: number;
  mgDari: number;
  mgSampai: number;
  kodeWilker?: string;
}): Promise<TitikTrenGenderMinggu[]> {
  const client = getTursoClient();
  const { klausa, args: argsWilker } = buildFilterWilker(kodeWilker);

  const daftarMinggu: number[] = [];
  for (let mg = mgDari; mg <= mgSampai; mg++) daftarMinggu.push(mg);

  return Promise.all(
    daftarMinggu.map(async (mg) => {
      const { mulai, selesai } = getRentangMingguEpid(tahun, mg);
      const hasil = await client.execute({
        sql: `
          SELECT
            COUNT(*) AS diperiksa,
            SUM(CASE WHEN LOWER(hasil_rdt) LIKE 'positif%' THEN 1 ELSE 0 END) AS positif_rdt,
            SUM(CASE WHEN LOWER(jenis_kelamin) LIKE 'l%' THEN 1 ELSE 0 END) AS laki_laki,
            SUM(CASE WHEN LOWER(jenis_kelamin) LIKE 'p%' THEN 1 ELSE 0 END) AS perempuan
          FROM migrasi_malaria
          WHERE tanggal_kegiatan BETWEEN ? AND ?${klausa}
        `,
        args: [keTanggalIso(mulai), keTanggalIso(selesai), ...argsWilker],
      });
      const row = hasil.rows[0];
      return {
        minggu_epid: `Mg-${mg}`,
        diperiksa: Number(row?.diperiksa ?? 0),
        positif_rdt: Number(row?.positif_rdt ?? 0),
        laki_laki: Number(row?.laki_laki ?? 0),
        perempuan: Number(row?.perempuan ?? 0),
      };
    })
  );
}

/**
 * Tren BULANAN diperiksa/positif RDT/jenis kelamin dalam tahun `tahun`,
 * untuk GrafikBarBulanan + picker FilterRentangBulan (param bulanDari/bulanSampai
 * format "tahun-bulan"; di sini cukup nomor bulan 1–12 karena tahunnya sama
 * dengan filter tahun global). Bulan kalender tidak ambigu, jadi cukup satu
 * query agregat (tidak perlu per-bulan seperti mingguan).
 */
export async function getTrenBulananRdtGender({
  tahun,
  bulanDari,
  bulanSampai,
  kodeWilker,
}: {
  tahun: number;
  bulanDari: number;
  bulanSampai: number;
  kodeWilker?: string;
}): Promise<TitikTrenGenderBulan[]> {
  const client = getTursoClient();
  const { klausa, args } = buildFilterWilker(kodeWilker);
  const bulanDariStr = String(bulanDari).padStart(2, '0');
  const bulanSampaiStr = String(bulanSampai).padStart(2, '0');

  const hasil = await client.execute({
    sql: `
      SELECT
        strftime('%m', tanggal_kegiatan) AS bulan,
        COUNT(*) AS diperiksa,
        SUM(CASE WHEN LOWER(hasil_rdt) LIKE 'positif%' THEN 1 ELSE 0 END) AS positif_rdt,
        SUM(CASE WHEN LOWER(jenis_kelamin) LIKE 'l%' THEN 1 ELSE 0 END) AS laki_laki,
        SUM(CASE WHEN LOWER(jenis_kelamin) LIKE 'p%' THEN 1 ELSE 0 END) AS perempuan
      FROM migrasi_malaria
      WHERE strftime('%Y', tanggal_kegiatan) = ?
        AND strftime('%m', tanggal_kegiatan) BETWEEN ? AND ?${klausa}
      GROUP BY bulan
      ORDER BY bulan ASC
    `,
    args: [String(tahun), bulanDariStr, bulanSampaiStr, ...args],
  });

  const peta = new Map(hasil.rows.map((r) => [String(r.bulan), r]));
  const daftar: TitikTrenGenderBulan[] = [];
  for (let b = bulanDari; b <= bulanSampai; b++) {
    const kunci = String(b).padStart(2, '0');
    const row = peta.get(kunci);
    daftar.push({
      bulanLabel: `${NAMA_BULAN_SINGKAT[b - 1]} ${tahun}`,
      diperiksa: Number(row?.diperiksa ?? 0),
      positif_rdt: Number(row?.positif_rdt ?? 0),
      laki_laki: Number(row?.laki_laki ?? 0),
      perempuan: Number(row?.perempuan ?? 0),
    });
  }
  return daftar;
}

/** Jumlah responden per Nama Kapal/Pesawat dalam rentang bulan yang sama dengan tren bulanan. */
export async function getBreakdownKapalPesawat({
  tahun,
  bulanDari,
  bulanSampai,
  kodeWilker,
  limit = 10,
}: {
  tahun: number;
  bulanDari: number;
  bulanSampai: number;
  kodeWilker?: string;
  limit?: number;
}): Promise<BreakdownItem[]> {
  const client = getTursoClient();
  const { klausa, args } = buildFilterWilker(kodeWilker);
  const bulanDariStr = String(bulanDari).padStart(2, '0');
  const bulanSampaiStr = String(bulanSampai).padStart(2, '0');

  const hasil = await client.execute({
    sql: `
      SELECT nama_kapal_pesawat AS kategori, COUNT(*) AS jumlah
      FROM migrasi_malaria
      WHERE strftime('%Y', tanggal_kegiatan) = ?
        AND strftime('%m', tanggal_kegiatan) BETWEEN ? AND ?${klausa}
        AND nama_kapal_pesawat IS NOT NULL AND TRIM(nama_kapal_pesawat) != ''
      GROUP BY kategori
      ORDER BY jumlah DESC
      LIMIT ?
    `,
    args: [String(tahun), bulanDariStr, bulanSampaiStr, ...args, limit],
  });

  return hasil.rows.map((r) => ({ kategori: String(r.kategori), jumlah: Number(r.jumlah) }));
}