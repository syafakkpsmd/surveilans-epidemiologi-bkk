// ================================================================
// lib/db/queries/queriesMasterTabel.ts
//
// Query pendukung khusus untuk modul "Master Tabel" (rekap gabungan
// Sanitasi, Vektor & Media Lingkungan per wilayah kerja x bulan).
// Dataset Sanitasi (TTU/PAB/TPP) dan Rat Guard dipakai langsung dari
// fungsi yang sudah ada di lib/db/queries/umum.ts.
//
// Isi file ini:
//  - getMasterVektorDbdAktivitasBulanan   (sudah ada)
//  - getMasterVektorDiareBulananPerWilker (sudah ada)
//  - getMasterMediaTanahBulanan           (BARU)
//  - getMasterLimbahB3Bulanan             (BARU)
//  - getMasterUdaraRuangBulanan           (BARU)
//  - getMasterAnophelesBulanan            (BARU: larva & dewasa)
//
// ⚠ Tiga fungsi BARU memakai SQL langsung lewat getDbClient()
// (sama seperti umum.ts). Nama tabel/kolom dikumpulkan di blok
// "KONFIGURASI NAMA TABEL" di bawah: kalau di databasemu berbeda,
// cukup ubah di sana.
// ================================================================

import { createDbClient } from '@/lib/db/server';
import { getDbClient } from '@/lib/db/client';
import { KOLOM_BUTIR, AMBANG_SKOR } from '@/lib/limbah-b3/butir';

async function ambilBaris(sql: string, args: (string | number)[] = []): Promise<Record<string, any>[]> {
  const { rows } = await getDbClient().execute({ sql, args });
  return rows as Record<string, any>[];
}

// ----------------------------------------------------------------
// KONFIGURASI NAMA TABEL (⚠ verifikasi dengan skema databasemu)
// ----------------------------------------------------------------
const TANAH = {
  tabel: 'tanah_pemeriksaan',    // tabel header pemeriksaan (satu baris = satu pemeriksaan)
  tanggal: 'tanggal_periksa',
  wilayah: 'wilayah',            // bisa kode (WK01) atau nama; keduanya dipetakan di MasterTabelClient
  kesimpulan: 'kesimpulan',      // 'memenuhi' | 'tidak_memenuhi' | 'perlu_lab'
};

const UDARA = {
  tabel: 'kualitas_udara_harian', // tabel gabungan Karhutla + Udara Dalam Ruang
  tanggal: 'tanggal',
  lokasi: 'lokasi',
  wilayah: 'wilayah_kerja',       // bisa NULL di baris lama -> diisi dari awalan Lokasi (lihat query)
  status: 'status_evaluasi',      // 'MS' | 'TMS' | 'TIDAK_LENGKAP' | 'BELUM_DIUJI'
};

const rentangTahun = (tahun: number): [string, string] => [`${tahun}-01-01`, `${tahun}-12-31`];

// ================================================================
// VEKTOR DBD (tidak berubah)
// ================================================================
export type BarisAktivitasDbd = {
  kode_wilker: string;
  zona: string;
  bulan: number;
  rumah_diperiksa: number;
  rumah_positif: number;
  container_diperiksa: number;
  container_positif: number;
  larvasida_gram: number;
  luas_fogging_ha: number;
  insektisida_fogging_ml: number;
};

export async function getMasterVektorDbdAktivitasBulanan(
  tahun: number,
  kodeWilker?: string
): Promise<BarisAktivitasDbd[]> {
  const supabase = await createDbClient();
  let query = supabase
    .from('vektor_dbd')
    .select(
      'tgl_survei, kode_wilker, zona, jml_rumah_diperiksa, jml_positif_jentik, container_diperiksa, container_positif, larvasida_gram, luas_wilayah_fogging_ha, jml_insektisida_fogging_ml'
    )
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`)
    .order('tgl_survei');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil aktivitas DBD master tabel: ${error.message}`);

  const kelompok = new Map<string, BarisAktivitasDbd>();

  for (const row of data ?? []) {
    const d = new Date(row.tgl_survei);
    const bulan = d.getUTCMonth() + 1;
    const zona = row.zona || 'Tanpa Zona';
    const kode = row.kode_wilker || '—';
    const key = `${kode}|${zona}|${bulan}`;

    if (!kelompok.has(key)) {
      kelompok.set(key, {
        kode_wilker: kode,
        zona,
        bulan,
        rumah_diperiksa: 0,
        rumah_positif: 0,
        container_diperiksa: 0,
        container_positif: 0,
        larvasida_gram: 0,
        luas_fogging_ha: 0,
        insektisida_fogging_ml: 0,
      });
    }

    const g = kelompok.get(key)!;
    g.rumah_diperiksa += Number(row.jml_rumah_diperiksa) || 0;
    g.rumah_positif += Number(row.jml_positif_jentik) || 0;
    g.container_diperiksa += Number(row.container_diperiksa) || 0;
    g.container_positif += Number(row.container_positif) || 0;
    g.larvasida_gram += Number(row.larvasida_gram) || 0;
    g.luas_fogging_ha += Number(row.luas_wilayah_fogging_ha) || 0;
    g.insektisida_fogging_ml += Number(row.jml_insektisida_fogging_ml) || 0;
  }

  return Array.from(kelompok.values());
}

// ================================================================
// VEKTOR DIARE (tidak berubah)
// ================================================================
export type BarisDiareWilker = {
  kode_wilker: string;
  bulan: number;
  jml_pengamatan: number;
  jml_memenuhi_syarat: number;
  jml_tidak_memenuhi_syarat: number;
  indeks_rerata: number; // fly_index_rerata (lalat) ATAU kepadatan_kecoa_rerata (kecoa)
};

export async function getMasterVektorDiareBulananPerWilker(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  kodeWilker?: string
): Promise<BarisDiareWilker[]> {
  const supabase = await createDbClient();
  const kolomIndeks = jenis === 'lalat' ? 'fly_index_rerata' : 'kepadatan_kecoa_rerata';

  let query = (supabase as any)
    .from('view_vektor_diare_bulanan')
    .select(`kode_wilker, bulan, jml_pengamatan, jml_memenuhi_syarat, ${kolomIndeks}`)
    .eq('tahun', tahun)
    .eq('jenis_kegiatan', jenis)
    .order('bulan');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil rekap Diare (${jenis}) per wilker: ${error.message}`);

  return (data ?? []).map((r: any) => {
    const pengamatan = Number(r.jml_pengamatan) || 0;
    const memenuhi = Number(r.jml_memenuhi_syarat) || 0;
    return {
      kode_wilker: r.kode_wilker || '—',
      bulan: Number(r.bulan) || 0,
      jml_pengamatan: pengamatan,
      jml_memenuhi_syarat: memenuhi,
      jml_tidak_memenuhi_syarat: Math.max(pengamatan - memenuhi, 0),
      indeks_rerata: Number(r[kolomIndeks]) || 0,
    };
  });
}

// ================================================================
// BARU — MEDIA TANAH
// Satu baris header = satu pemeriksaan. Status dibaca dari kolom
// kesimpulan (memenuhi / tidak_memenuhi / perlu_lab).
// ================================================================
export type BarisMediaTanah = {
  wilayah_kerja: string;
  bulan: number;
  jumlah_diperiksa: number;
  jumlah_ms: number;
  jumlah_tms: number;
  jumlah_perlu_lab: number;
};

export async function getMasterMediaTanahBulanan(tahun: number): Promise<BarisMediaTanah[]> {
  const [awal, akhir] = rentangTahun(tahun);
  const rows = await ambilBaris(
    `SELECT ${TANAH.wilayah} AS wilayah_kerja,
            EXTRACT(MONTH FROM ${TANAH.tanggal})::int AS bulan,
            COUNT(*)::int AS jumlah_diperiksa,
            COUNT(*) FILTER (WHERE ${TANAH.kesimpulan} = 'memenuhi')::int AS jumlah_ms,
            COUNT(*) FILTER (WHERE ${TANAH.kesimpulan} = 'tidak_memenuhi')::int AS jumlah_tms,
            COUNT(*) FILTER (WHERE ${TANAH.kesimpulan} = 'perlu_lab')::int AS jumlah_perlu_lab
       FROM ${TANAH.tabel}
      WHERE ${TANAH.tanggal} >= ? AND ${TANAH.tanggal} <= ?
      GROUP BY 1, 2
      ORDER BY 2`,
    [awal, akhir]
  );

  return rows.map((r) => ({
    wilayah_kerja: String(r.wilayah_kerja ?? '—'),
    bulan: Number(r.bulan) || 0,
    jumlah_diperiksa: Number(r.jumlah_diperiksa) || 0,
    jumlah_ms: Number(r.jumlah_ms) || 0,
    jumlah_tms: Number(r.jumlah_tms) || 0,
    jumlah_perlu_lab: Number(r.jumlah_perlu_lab) || 0,
  }));
}

// ================================================================
// BARU — LIMBAH B3 KLINIK
// Belum ada aturan MS/TMS resmi. Dipakai skor kepatuhan
// (% butir "Ya" dari butir yang dinilai Ya/Tidak) dengan ambang
// pewarnaan yang SAMA seperti dasbor Limbah B3 (AMBANG_SKOR):
//   Baik >= 80, Cukup 60-79, Kurang < 60.
// ================================================================
export type BarisLimbahB3 = {
  wilayah_kerja: string;
  bulan: number;
  jumlah_diperiksa: number;
  jumlah_baik: number;
  jumlah_cukup: number;
  jumlah_kurang: number;
  skor_rerata: number; // rata-rata skor (%), hanya pemeriksaan yang punya butir dinilai
};

export async function getMasterLimbahB3Bulanan(tahun: number): Promise<BarisLimbahB3[]> {
  const [awal, akhir] = rentangTahun(tahun);
  const rows = await ambilBaris(
    `SELECT wilayah_kerja,
            EXTRACT(MONTH FROM tanggal_pemeriksaan)::int AS bulan,
            ${KOLOM_BUTIR.join(', ')}
       FROM limbah_b3
      WHERE tanggal_pemeriksaan >= ? AND tanggal_pemeriksaan <= ?`,
    [awal, akhir]
  );

  type Akum = BarisLimbahB3 & { _jumlahSkor: number; _nSkor: number };
  const kelompok = new Map<string, Akum>();

  for (const r of rows) {
    const wilayah = String(r.wilayah_kerja ?? '—');
    const bulan = Number(r.bulan) || 0;
    const key = `${wilayah}|${bulan}`;

    if (!kelompok.has(key)) {
      kelompok.set(key, {
        wilayah_kerja: wilayah,
        bulan,
        jumlah_diperiksa: 0,
        jumlah_baik: 0,
        jumlah_cukup: 0,
        jumlah_kurang: 0,
        skor_rerata: 0,
        _jumlahSkor: 0,
        _nSkor: 0,
      });
    }
    const g = kelompok.get(key)!;
    g.jumlah_diperiksa += 1;

    let ya = 0;
    let tidak = 0;
    for (const kol of KOLOM_BUTIR) {
      if (r[kol] === 'Ya') ya++;
      else if (r[kol] === 'Tidak') tidak++;
    }
    const dinilai = ya + tidak;
    if (dinilai === 0) continue; // belum ada butir yang dinilai: dihitung diperiksa saja

    const skor = (ya / dinilai) * 100;
    g._jumlahSkor += skor;
    g._nSkor += 1;
    if (skor >= AMBANG_SKOR.baik) g.jumlah_baik += 1;
    else if (skor >= AMBANG_SKOR.cukup) g.jumlah_cukup += 1;
    else g.jumlah_kurang += 1;
  }

  return Array.from(kelompok.values()).map(({ _jumlahSkor, _nSkor, ...baris }) => ({
    ...baris,
    skor_rerata: _nSkor > 0 ? Number((_jumlahSkor / _nSkor).toFixed(1)) : 0,
  }));
}

// ================================================================
// BARU — UDARA DALAM RUANG (tabel gabungan dengan Karhutla)
// Status MS/TMS memakai kolom status_evaluasi yang sudah dihitung
// aplikasi. Baris lama yang wilayah_kerja-nya masih NULL dipetakan
// dari awalan kolom lokasi ("Samarinda (Pelabuhan Umum)" ->
// "Samarinda") lewat wilker_ref.nama_pendek, sama seperti migrasi 10.
// ================================================================
export type BarisUdaraRuang = {
  wilayah_kerja: string;
  bulan: number;
  jumlah_diperiksa: number;
  jumlah_ms: number;
  jumlah_tms: number;
  jumlah_tidak_lengkap: number;
};

export async function getMasterUdaraRuangBulanan(tahun: number): Promise<BarisUdaraRuang[]> {
  const [awal, akhir] = rentangTahun(tahun);
  const rows = await ambilBaris(
    `SELECT COALESCE(NULLIF(t.${UDARA.wilayah}, ''),
                     (SELECT w.nama_pendek FROM wilker_ref w
                       WHERE lower(t.${UDARA.lokasi}) LIKE lower(w.nama_pendek) || '%'
                       ORDER BY length(w.nama_pendek) DESC LIMIT 1),
                     '—') AS wilayah_kerja,
            EXTRACT(MONTH FROM t.${UDARA.tanggal})::int AS bulan,
            COUNT(*)::int AS jumlah_diperiksa,
            COUNT(*) FILTER (WHERE t.${UDARA.status} = 'MS')::int AS jumlah_ms,
            COUNT(*) FILTER (WHERE t.${UDARA.status} = 'TMS')::int AS jumlah_tms,
            COUNT(*) FILTER (WHERE t.${UDARA.status} = 'TIDAK_LENGKAP')::int AS jumlah_tidak_lengkap
       FROM ${UDARA.tabel} t
      WHERE t.${UDARA.tanggal} >= ? AND t.${UDARA.tanggal} <= ?
      GROUP BY 1, 2
      ORDER BY 2`,
    [awal, akhir]
  );

  return rows.map((r) => ({
    wilayah_kerja: String(r.wilayah_kerja ?? '—'),
    bulan: Number(r.bulan) || 0,
    jumlah_diperiksa: Number(r.jumlah_diperiksa) || 0,
    jumlah_ms: Number(r.jumlah_ms) || 0,
    jumlah_tms: Number(r.jumlah_tms) || 0,
    jumlah_tidak_lengkap: Number(r.jumlah_tidak_lengkap) || 0,
  }));
}

// ================================================================
// BARU — ANOPHELES (tabel vektor_anopheles, kolom tipe_pengamatan = 'larva' | 'dewasa')
// Satu baris hasil = satu wilayah kerja x satu bulan (zona Buffer + Perimeter digabung).
// Larva : jumlah survei, cidukan, larva, survei positif (larva > 0), kepadatan = larva / cidukan.
// Dewasa: jumlah survei, nyamuk, MBR & MHD (rata-rata survei), total jam tangkap.
// ================================================================
export type BarisAnopheles = {
  kode_wilker: string;
  bulan: number;
  jumlah_survei: number;
  // larva
  jumlah_cidukan?: number;
  jumlah_larva?: number;
  survei_positif?: number;
  kepadatan?: number;
  // dewasa
  jumlah_nyamuk?: number;
  mbr?: number;
  mhd?: number;
  jam_tangkap?: number;
};

export async function getMasterAnophelesBulanan(
  tahun: number,
  tipe: 'larva' | 'dewasa'
): Promise<BarisAnopheles[]> {
  const [awal, akhir] = rentangTahun(tahun);

  if (tipe === 'larva') {
    const rows = await ambilBaris(
      `SELECT kode_wilker,
              EXTRACT(MONTH FROM tgl_survei)::int AS bulan,
              COUNT(*)::int AS jumlah_survei,
              COALESCE(SUM(jumlah_cidukan), 0)::int AS jumlah_cidukan,
              COALESCE(SUM(jumlah_larva), 0)::int AS jumlah_larva,
              COUNT(*) FILTER (WHERE COALESCE(jumlah_larva, 0) > 0)::int AS survei_positif
         FROM vektor_anopheles
        WHERE tipe_pengamatan = 'larva' AND tgl_survei >= ? AND tgl_survei <= ?
        GROUP BY 1, 2
        ORDER BY 2`,
      [awal, akhir]
    );
    return rows.map((r) => {
      const cid = Number(r.jumlah_cidukan) || 0;
      const lar = Number(r.jumlah_larva) || 0;
      return {
        kode_wilker: String(r.kode_wilker ?? '—'),
        bulan: Number(r.bulan) || 0,
        jumlah_survei: Number(r.jumlah_survei) || 0,
        jumlah_cidukan: cid,
        jumlah_larva: lar,
        survei_positif: Number(r.survei_positif) || 0,
        kepadatan: cid > 0 ? Number((lar / cid).toFixed(2)) : 0,
      };
    });
  }

  const rows = await ambilBaris(
    `SELECT kode_wilker,
            EXTRACT(MONTH FROM tgl_survei)::int AS bulan,
            COUNT(*)::int AS jumlah_survei,
            COALESCE(SUM(jml_nyamuk), 0)::int AS jumlah_nyamuk,
            COALESCE(AVG(mbr), 0) AS mbr,
            COALESCE(AVG(mhd), 0) AS mhd,
            COALESCE(SUM(jml_jam_tangkap), 0) AS jam_tangkap
       FROM vektor_anopheles
      WHERE tipe_pengamatan = 'dewasa' AND tgl_survei >= ? AND tgl_survei <= ?
      GROUP BY 1, 2
      ORDER BY 2`,
    [awal, akhir]
  );
  return rows.map((r) => ({
    kode_wilker: String(r.kode_wilker ?? '—'),
    bulan: Number(r.bulan) || 0,
    jumlah_survei: Number(r.jumlah_survei) || 0,
    jumlah_nyamuk: Number(r.jumlah_nyamuk) || 0,
    mbr: Number(Number(r.mbr).toFixed(2)) || 0,
    mhd: Number(Number(r.mhd).toFixed(2)) || 0,
    jam_tangkap: Number(Number(r.jam_tangkap).toFixed(1)) || 0,
  }));
}
