// lib/posko/queries.ts
// Mengumpulkan data Posko Nataru / Idul Fitri dari semua sumber (SERVER ONLY):
//  - Turso   : posko_periode, posko_penyakit_harian, posko_klb_harian, posko_ptm_harian
//  - Turso   : kunjungan_poliklinik, data_penumpang_kapal (kapal penumpang)
//  - Supabase: v_kegiatan_pesawat_rekap (pesawat)
import { tabelTidakAda } from '@/lib/db/errors';
import { cache } from 'react';
import { getDbClient } from '@/lib/db/client';
import { createDbClient } from '@/lib/db/server';
import { adalahGalatKolomBelumAda } from './perintahInput';
import {
  DAFTAR_PENYAKIT,
  DAFTAR_PTM,
  WILAYAH_POSKO,
  normalisasiWilayah,
  type BarisHarianPosko,
  type BarisPenyakitPosko,
  type BarisPtmPosko,
  type DataPosko,
  type JenisPosko,
  type PeriodePosko,
  type WilayahPosko,
} from './konstanta';

const BATAS_HARI = 120; // pengaman: periode posko tidak mungkin selebar ini

export function hariIniWita(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function rentangTanggal(mulai: string, akhir: string): string[] {
  const hasil: string[] = [];
  const penunjuk = new Date(`${mulai}T00:00:00Z`);
  const batas = new Date(`${akhir}T00:00:00Z`);
  while (penunjuk <= batas && hasil.length < BATAS_HARI) {
    hasil.push(penunjuk.toISOString().slice(0, 10));
    penunjuk.setUTCDate(penunjuk.getUTCDate() + 1);
  }
  return hasil;
}

type BarisMentah = Record<string, any>;

async function jalankan(sql: string, args: (string | number)[], label: string, catatan: string[]): Promise<BarisMentah[]> {
  try {
    const hasil = await getDbClient().execute({ sql, args });
    return hasil.rows as unknown as BarisMentah[];
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    catatan.push(
      tabelTidakAda(pesan) ? `Tabel ${label} belum dibuat di database.` : `${label} gagal dimuat: ${pesan}`
    );
    return [];
  }
}

const angka = (v: unknown) => Number(v) || 0;

function barisKosong(tanggal: string, wilayah: WilayahPosko): BarisHarianPosko {
  return {
    tanggal, wilayah, poliklinik: 0,
    kapalDatang: 0, kapalBerangkat: 0, pesawatDatang: 0, pesawatBerangkat: 0,
    abkDatang: 0, abkBerangkat: 0, penumpangKapalDatang: 0, penumpangKapalBerangkat: 0,
    crewDatang: 0, crewBerangkat: 0, penumpangPesawatDatang: 0, penumpangPesawatBerangkat: 0,
    jumlahKlb: 0,
  };
}

// ---------------------------------------------------------------- SQL (dialek SQLite/Turso)
export const SQL_POLIKLINIK =
  `SELECT date(tanggal_pemeriksaan) AS tgl, wilayah_kerja AS wilker, COUNT(*) AS jumlah
   FROM kunjungan_poliklinik
   WHERE date(tanggal_pemeriksaan) BETWEEN ? AND ?
   GROUP BY tgl, wilker`;

export const SQL_KAPAL_DATANG =
  `SELECT date(tanggal_tiba) AS tgl, wilker, COUNT(*) AS kapal,
          COALESCE(SUM(abk_datang), 0) AS abk, COALESCE(SUM(penumpang_datang), 0) AS penumpang
   FROM data_penumpang_kapal
   WHERE date(tanggal_tiba) BETWEEN ? AND ?
   GROUP BY tgl, wilker`;

// Keberangkatan dihitung pada tanggal_berangkat. Bila kosong, jatuh ke tanggal_tiba HANYA kalau
// ada angka ABK/penumpang berangkat (kapal belum berangkat tidak dihitung sebagai berangkat).
export const SQL_KAPAL_BERANGKAT =
  `WITH b AS (
     SELECT wilker, abk_berangkat, penumpang_berangkat,
            COALESCE(
              tanggal_berangkat,
              CASE WHEN COALESCE(abk_berangkat, 0) + COALESCE(penumpang_berangkat, 0) > 0
                   THEN tanggal_tiba END
            ) AS tgl
     FROM data_penumpang_kapal
   )
   SELECT tgl, wilker, COUNT(*) AS kapal,
          COALESCE(SUM(abk_berangkat), 0) AS abk, COALESCE(SUM(penumpang_berangkat), 0) AS penumpang
   FROM b
   WHERE tgl BETWEEN ? AND ?
   GROUP BY tgl, wilker`;

async function ambilPesawat(mulai: string, akhir: string, catatan: string[]): Promise<BarisMentah[]> {
  const semua: BarisMentah[] = [];
  try {
    const supabase = await createDbClient();
    const UKURAN = 1000;
    for (let halaman = 0; ; halaman++) {
      const { data, error } = await supabase
        .from('v_kegiatan_pesawat_rekap')
        .select('nama_wilker, tanggal, crew_berangkat, penumpang_berangkat, crew_datang, penumpang_datang')
        .eq('status_data', 'final')
        .gte('tanggal', mulai)
        .lte('tanggal', akhir)
        .range(halaman * UKURAN, (halaman + 1) * UKURAN - 1);
      if (error) {
        catatan.push(`Data pesawat gagal dimuat: ${error.message}`);
        break;
      }
      const baris = (data ?? []) as BarisMentah[];
      semua.push(...baris);
      if (baris.length < UKURAN) break;
    }
  } catch (err) {
    catatan.push(`Data pesawat gagal dimuat: ${err instanceof Error ? err.message : String(err)}`);
  }
  return semua;
}

/**
 * Baca PTM dengan kolom jenis kelamin (jumlah_lk/jumlah_pr). Bila kolom itu belum ada di Turso
 * (belum menjalankan posko_ptm_jenis_kelamin.sql), PTM tetap terbaca tanpa rincian jenis kelamin.
 */
async function ambilPtm(kondisi: string, args: (string | number)[], catatan: string[]): Promise<BarisMentah[]> {
  const kolomBaru = 'tanggal, wilayah_kerja, jenis_ptm, jumlah_kasus, jumlah_lk, jumlah_pr';
  const kolomLama = 'tanggal, wilayah_kerja, jenis_ptm, jumlah_kasus';
  const dasar = `FROM posko_ptm_harian WHERE posko = ? AND tahun = ? AND ${kondisi}`;
  try {
    const hasil = await getDbClient().execute({ sql: `SELECT ${kolomBaru} ${dasar}`, args });
    return hasil.rows as unknown as BarisMentah[];
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    if (!adalahGalatKolomBelumAda(pesan)) {
      catatan.push(
        tabelTidakAda(pesan) ? 'Tabel posko_ptm_harian belum dibuat di database.' : `posko_ptm_harian gagal dimuat: ${pesan}`
      );
      return [];
    }
    catatan.push('Kolom jenis kelamin PTM belum ada di Turso. Jalankan posko_ptm_jenis_kelamin.sql agar PTM bisa dirinci laki-laki/perempuan.');
    return jalankan(`SELECT ${kolomLama} ${dasar}`, args, 'posko_ptm_harian', catatan);
  }
}

// ---------------------------------------------------------------- periode
export async function ambilDaftarPeriode(posko: JenisPosko, catatan: string[]): Promise<PeriodePosko[]> {
  const baris = await jalankan(
    'SELECT posko, tahun, nama, tanggal_mulai, tanggal_selesai FROM posko_periode WHERE posko = ? ORDER BY tahun DESC',
    [posko], 'posko_periode', catatan
  );
  return baris.map((p) => ({
    posko,
    tahun: angka(p.tahun),
    nama: String(p.nama ?? ''),
    tanggalMulai: String(p.tanggal_mulai),
    tanggalSelesai: String(p.tanggal_selesai),
  }));
}

/** Periode terpilih (sesuai ?tahun=, atau yang terbaru) + daftar semua periode. */
export const ambilPeriodePosko = cache(async (posko: JenisPosko, tahun?: number) => {
  const catatan: string[] = [];
  const daftarPeriode = await ambilDaftarPeriode(posko, catatan);
  const periode = (tahun ? daftarPeriode.find((d) => d.tahun === tahun) : undefined) ?? daftarPeriode[0] ?? null;
  if (!periode && catatan.length === 0) catatan.push('Periode posko belum diatur.');
  return { periode, daftarPeriode, catatan };
});

// ---------------------------------------------------------------- fungsi utama
export const ambilDataPosko = cache(async (posko: JenisPosko, tahun?: number): Promise<DataPosko> => {
  const hasilPeriode = await ambilPeriodePosko(posko, tahun);
  const catatan: string[] = [...hasilPeriode.catatan];
  const { periode, daftarPeriode } = hasilPeriode;
  const kosong: DataPosko = {
    posko, hariIni: hariIniWita(), periode: null, daftarPeriode, tanggalAkhirTampil: null,
    harian: [], penyakit: [], ptm: [], catatan,
  };
  if (!periode) return kosong;

  const hariIni = hariIniWita();
  if (hariIni < periode.tanggalMulai) {
    catatan.push(`Posko belum dimulai (mulai ${periode.tanggalMulai}).`);
    return { ...kosong, periode };
  }
  const akhir = hariIni < periode.tanggalSelesai ? hariIni : periode.tanggalSelesai;
  const mulai = periode.tanggalMulai;

  const [rPenyakit, rKlb, rPtm, rPoli, rDatang, rBerangkat, rPesawat] = await Promise.all([
    jalankan(
      `SELECT tanggal, wilayah_kerja, jenis_penyakit, kasus_lk_lt5, kasus_lk_ge5, kasus_pr_lt5, kasus_pr_ge5,
              mati_lk_lt5, mati_lk_ge5, mati_pr_lt5, mati_pr_ge5
       FROM posko_penyakit_harian WHERE posko = ? AND tahun = ? AND tanggal BETWEEN ? AND ?`,
      [posko, periode.tahun, mulai, akhir], 'posko_penyakit_harian', catatan
    ),
    jalankan(
      'SELECT tanggal, wilayah_kerja, jumlah_klb FROM posko_klb_harian WHERE posko = ? AND tahun = ? AND tanggal BETWEEN ? AND ?',
      [posko, periode.tahun, mulai, akhir], 'posko_klb_harian', catatan
    ),
    ambilPtm('tanggal BETWEEN ? AND ?', [posko, periode.tahun, mulai, akhir], catatan),
    jalankan(SQL_POLIKLINIK, [mulai, akhir], 'kunjungan_poliklinik', catatan),
    jalankan(SQL_KAPAL_DATANG, [mulai, akhir], 'data_penumpang_kapal', catatan),
    jalankan(SQL_KAPAL_BERANGKAT, [mulai, akhir], 'data_penumpang_kapal', catatan),
    ambilPesawat(mulai, akhir, catatan),
  ]);

  // kerangka: setiap tanggal x setiap wilayah selalu ada (nol bila tidak ada data)
  const tanggalTampil = rentangTanggal(mulai, akhir);
  const peta = new Map<string, BarisHarianPosko>();
  for (const tgl of tanggalTampil) {
    for (const w of WILAYAH_POSKO) peta.set(`${tgl}|${w}`, barisKosong(tgl, w));
  }
  const cari = (tgl: unknown, wilayahMentah: unknown): BarisHarianPosko | undefined => {
    const w = normalisasiWilayah(String(wilayahMentah ?? ''));
    return w ? peta.get(`${String(tgl).slice(0, 10)}|${w}`) : undefined;
  };

  rPoli.forEach((r) => { const b = cari(r.tgl, r.wilker); if (b) b.poliklinik += angka(r.jumlah); });
  rDatang.forEach((r) => {
    const b = cari(r.tgl, r.wilker);
    if (!b) return;
    b.kapalDatang += angka(r.kapal);
    b.abkDatang += angka(r.abk);
    b.penumpangKapalDatang += angka(r.penumpang);
  });
  rBerangkat.forEach((r) => {
    const b = cari(r.tgl, r.wilker);
    if (!b) return;
    b.kapalBerangkat += angka(r.kapal);
    b.abkBerangkat += angka(r.abk);
    b.penumpangKapalBerangkat += angka(r.penumpang);
  });
  // Pesawat: 1 baris view = 1 pergerakan pesawat (tiba + berangkat), sama dengan hitungan modul Pesawat.
  rPesawat.forEach((r) => {
    const b = cari(r.tanggal, r.nama_wilker);
    if (!b) return;
    b.pesawatDatang += 1;
    b.pesawatBerangkat += 1;
    b.crewDatang += angka(r.crew_datang);
    b.crewBerangkat += angka(r.crew_berangkat);
    b.penumpangPesawatDatang += angka(r.penumpang_datang);
    b.penumpangPesawatBerangkat += angka(r.penumpang_berangkat);
  });
  rKlb.forEach((r) => { const b = cari(r.tanggal, r.wilayah_kerja); if (b) b.jumlahKlb += angka(r.jumlah_klb); });

  const penyakit: BarisPenyakitPosko[] = [];
  const jenisPenyakitSah = new Set<string>(DAFTAR_PENYAKIT);
  rPenyakit.forEach((r) => {
    const w = normalisasiWilayah(String(r.wilayah_kerja));
    const jenis = String(r.jenis_penyakit);
    if (!w || !jenisPenyakitSah.has(jenis)) return;
    penyakit.push({
      tanggal: String(r.tanggal).slice(0, 10), wilayah: w, jenis,
      kasusLkLt5: angka(r.kasus_lk_lt5), kasusLkGe5: angka(r.kasus_lk_ge5),
      kasusPrLt5: angka(r.kasus_pr_lt5), kasusPrGe5: angka(r.kasus_pr_ge5),
      matiLkLt5: angka(r.mati_lk_lt5), matiLkGe5: angka(r.mati_lk_ge5),
      matiPrLt5: angka(r.mati_pr_lt5), matiPrGe5: angka(r.mati_pr_ge5),
    });
  });

  const ptm: BarisPtmPosko[] = [];
  const jenisPtmSah = new Set<string>(DAFTAR_PTM);
  rPtm.forEach((r) => {
    const w = normalisasiWilayah(String(r.wilayah_kerja));
    const jenis = String(r.jenis_ptm);
    if (!w || !jenisPtmSah.has(jenis)) return;
    const lk = angka(r.jumlah_lk);
    const pr = angka(r.jumlah_pr);
    ptm.push({
      tanggal: String(r.tanggal).slice(0, 10), wilayah: w, jenis,
      jumlah: angka(r.jumlah_kasus), jumlahLk: lk, jumlahPr: pr,
    });
  });

  return {
    posko,
    hariIni,
    periode,
    daftarPeriode,
    tanggalAkhirTampil: akhir,
    harian: Array.from(peta.values()),
    penyakit,
    ptm,
    catatan,
  };
});

// ---------------------------------------------------------------- data input harian (untuk prefill form)
export type InputHarianPosko = {
  adaData: boolean;
  /** jenis penyakit -> [kasusLkLt5, kasusLkGe5, kasusPrLt5, kasusPrGe5, matiLkLt5, matiLkGe5, matiPrLt5, matiPrGe5] */
  penyakit: Record<string, number[]>;
  klbJumlah: number | null;
  klbKeterangan: string;
  ptm: Record<string, { lk: number; pr: number }>;
  /** true bila ada data PTM lama tanpa rincian jenis kelamin (total ditaruh di kolom laki-laki saat diedit) */
  ptmPerluRincian: boolean;
  catatan: string[];
};

export async function ambilInputHarianPosko(
  posko: JenisPosko,
  tahun: number,
  tanggal: string,
  wilayah: WilayahPosko
): Promise<InputHarianPosko> {
  const catatan: string[] = [];
  const args = [posko, tahun, tanggal, wilayah];
  const [rPenyakit, rKlb, rPtm] = await Promise.all([
    jalankan(
      `SELECT jenis_penyakit, kasus_lk_lt5, kasus_lk_ge5, kasus_pr_lt5, kasus_pr_ge5,
              mati_lk_lt5, mati_lk_ge5, mati_pr_lt5, mati_pr_ge5
       FROM posko_penyakit_harian WHERE posko = ? AND tahun = ? AND tanggal = ? AND wilayah_kerja = ?`,
      args, 'posko_penyakit_harian', catatan
    ),
    jalankan(
      'SELECT jumlah_klb, keterangan FROM posko_klb_harian WHERE posko = ? AND tahun = ? AND tanggal = ? AND wilayah_kerja = ?',
      args, 'posko_klb_harian', catatan
    ),
    ambilPtm('tanggal = ? AND wilayah_kerja = ?', args, catatan),
  ]);

  const penyakit: Record<string, number[]> = {};
  rPenyakit.forEach((r) => {
    penyakit[String(r.jenis_penyakit)] = [
      angka(r.kasus_lk_lt5), angka(r.kasus_lk_ge5), angka(r.kasus_pr_lt5), angka(r.kasus_pr_ge5),
      angka(r.mati_lk_lt5), angka(r.mati_lk_ge5), angka(r.mati_pr_lt5), angka(r.mati_pr_ge5),
    ];
  });
  const ptm: Record<string, { lk: number; pr: number }> = {};
  let ptmPerluRincian = false;
  rPtm.forEach((r) => {
    const lk = angka(r.jumlah_lk);
    const pr = angka(r.jumlah_pr);
    if (lk + pr === 0 && angka(r.jumlah_kasus) > 0) {
      // data lama tanpa rincian: total ditaruh di laki-laki supaya tidak hilang saat diedit
      ptmPerluRincian = true;
      ptm[String(r.jenis_ptm)] = { lk: angka(r.jumlah_kasus), pr: 0 };
    } else {
      ptm[String(r.jenis_ptm)] = { lk, pr };
    }
  });

  return {
    adaData: rPenyakit.length > 0 || rKlb.length > 0 || rPtm.length > 0,
    penyakit,
    klbJumlah: rKlb.length > 0 ? angka(rKlb[0].jumlah_klb) : null,
    klbKeterangan: rKlb.length > 0 ? String(rKlb[0].keterangan ?? '') : '',
    ptm,
    ptmPerluRincian,
    catatan,
  };
}
