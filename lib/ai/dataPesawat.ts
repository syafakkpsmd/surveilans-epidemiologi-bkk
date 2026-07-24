// ================================================================
// lib/ai/dataPesawat.ts
//
// Mengikuti pola lib/ai/dataVektor.ts: satu fungsi ambilDataAnalisisPesawat
// yang menerima `metrik` untuk menentukan kolom mana yang relevan dikirim
// ke prompt AI -- supaya tiap tombol Analisis/Prediksi AI di halaman
// Alat Angkut Pesawat hanya membahas data grafik itu sendiri, bukan
// semua indikator pesawat sekaligus.
//
// CATATAN CAKUPAN: metrik 'crew-penumpang', 'sertifikat', dan 'crew'
// SUDAH bisa dikerjakan penuh karena datanya (getRingkasanPesawatMingguan/
// Bulanan) sudah saya lihat lengkap. Metrik 'kota-asal', 'kota-tujuan',
// 'maskapai-kedatangan', 'maskapai-keberangkatan' BELUM bisa dikerjakan --
// fungsi sumber datanya (getKotaPesawatBulanan, getMaskapaiPesawatBulanan)
// ada di '@/lib/supabase/queries' tapi belum pernah saya lihat isinya
// (bentuk baris/kolomnya). Fungsi ini sengaja melempar error yang jelas
// untuk keempat metrik itu, bukan menebak struktur datanya.
//
// FORMAT periodeKey (SEJAK penambahan filter rentang minggu/bulan bebas
// di halaman ini -- BEDA dari modul lain seperti TPP/TTU/COP/PHQC yang
// rentangnya selalu "dari periode-1"):
//   - Titik tunggal (lama, tetap didukung, dipakai untuk tipe="prediksi"):
//       "2026-W27" (mingguan) atau "2026-7" (bulanan)
//   - Rentang eksplisit (BARU, dipakai untuk tipe="analisis" dari filter
//     FilterRentangMinggu/FilterRentangBulan di halaman):
//       "2026-W1_W9" (minggu 1 s.d. 9) atau "2026-7_9" (bulan 7 s.d. 9)
// ================================================================

import {
  getRingkasanPesawatMingguan,
  getRingkasanPesawatBulanan,
  type RingkasanMingguanPesawat,
  type RingkasanBulananPesawat,
} from '@/lib/supabase/queriesPesawat';
import { getWilkerRef } from '@/lib/supabase/queries';
import {
  parsePeriodeMingguan,
  parsePeriodeBulanan,
  periodeMingguanSebelumnya,
  periodeBulananSebelumnya,
  labelPeriodeMingguan,
  labelPeriodeBulanan,
} from './periode';
import type { DataAnalisis } from './data';

export type MetrikPesawat =
  | 'crew-penumpang'
  | 'sertifikat'
  | 'crew'
  | 'kota-asal'
  | 'kota-tujuan'
  | 'maskapai-kedatangan'
  | 'maskapai-keberangkatan';

const METRIK_PESAWAT_SIAP: readonly MetrikPesawat[] = ['crew-penumpang', 'sertifikat', 'crew'];

const KUNCI_PER_METRIK: Record<'crew-penumpang' | 'sertifikat' | 'crew', string[]> = {
  'crew-penumpang': ['crew_berangkat', 'penumpang_berangkat', 'crew_datang', 'penumpang_datang'],
  sertifikat: ['sklt_total', 'td_laik_total', 'iaos_total', 'jenazah_total', 'kier_total'],
  crew: ['crew_berangkat', 'crew_datang'],
};

const LABEL_PER_METRIK: Record<'crew-penumpang' | 'sertifikat' | 'crew', string> = {
  'crew-penumpang': 'Crew & Penumpang (Berangkat/Datang)',
  sertifikat: 'Sertifikat Kesehatan (SKLT/TD Laik/IAOS/KIER/Jenazah)',
  crew: 'Crew (Berangkat/Datang)',
};

const NAMA_BULAN_LOKAL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const POLA_RENTANG_MINGGUAN = /^(\d{4})-W(\d{1,2})_W(\d{1,2})$/;
const POLA_RENTANG_BULANAN = /^(\d{4})-(\d{1,2})_(\d{1,2})$/;

type Rentang = { tahun: number; awal: number; akhir: number };

function parseRentangMingguan(periodeKey: string): Rentang | null {
  const cocok = periodeKey.match(POLA_RENTANG_MINGGUAN);
  if (!cocok) return null;
  let awal = Number(cocok[2]);
  let akhir = Number(cocok[3]);
  if (awal > akhir) [awal, akhir] = [akhir, awal];
  return { tahun: Number(cocok[1]), awal, akhir };
}

function parseRentangBulanan(periodeKey: string): Rentang | null {
  const cocok = periodeKey.match(POLA_RENTANG_BULANAN);
  if (!cocok) return null;
  let awal = Number(cocok[2]);
  let akhir = Number(cocok[3]);
  if (awal > akhir) [awal, akhir] = [akhir, awal];
  return { tahun: Number(cocok[1]), awal, akhir };
}

function saring(ringkasan: Record<string, number>, kunci: string[]): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const k of kunci) if (k in ringkasan) hasil[k] = ringkasan[k];
  return hasil;
}

function keRecord<T extends Record<string, unknown>>(row: T | undefined, kunci: string[]): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const k of kunci) hasil[k] = row ? Number(row[k]) || 0 : 0;
  return hasil;
}

function jumlahkanKolom<T extends Record<string, unknown>>(baris: T[], kunci: string[]): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const k of kunci) {
    hasil[k] = baris.reduce((total, b) => total + (Number(b[k]) || 0), 0);
  }
  return hasil;
}

/** Ekstrak nomor bulan (1-12) dari kolom `bulan` RingkasanBulananPesawat,
 * yang formatnya "YYYY-MM" (string). */
function nomorBulan(row: RingkasanBulananPesawat): number {
  const str = String(row.bulan);
  return str.includes('-') ? parseInt(str.split('-')[1], 10) : parseInt(str, 10);
}

async function namaWilker(kodeWilker: string | undefined): Promise<string> {
  if (!kodeWilker) return 'Seluruh Bandara (BKK Kelas I Samarinda)';
  const daftar = await getWilkerRef();
  return daftar.find((w) => w.kode === kodeWilker)?.nama ?? kodeWilker;
}

/**
 * kodeWilker OPSIONAL untuk pesawat (beda dari vektor yang mewajibkan) --
 * "Semua Bandara" tetap valid, mengikuti pola cop/phqc/breakdown lain.
 * metrik menentukan kolom mana yang dikirim ke prompt AI.
 *
 * tipe="analisis" + periodeKey format rentang ("2026-W1_W9" / "2026-7_9")
 *   -> jumlahkan semua baris dalam rentang itu, dibandingkan dengan
 *      rentang berpanjang sama tepat SEBELUM rentang yang dipilih.
 * tipe="prediksi" (atau periodeKey bukan format rentang)
 *   -> pola LAMA: satu periode tunggal vs satu periode tunggal
 *      sebelumnya (dipakai untuk proyeksi ke depan, TIDAK berubah).
 */
export async function ambilDataAnalisisPesawat(
  periodeKey: string,
  kodeWilker: string | undefined,
  metrik: MetrikPesawat = 'crew-penumpang',
  tipe: 'analisis' | 'prediksi' = 'analisis'
): Promise<DataAnalisis> {
  if (!METRIK_PESAWAT_SIAP.includes(metrik as any)) {
    throw new Error(
      `Metrik "${metrik}" untuk Analisis/Prediksi AI pesawat belum didukung backend -- perlu bentuk data getKotaPesawatBulanan/getMaskapaiPesawatBulanan dulu sebelum bisa disambungkan.`
    );
  }
  const metrikSiap = metrik as 'crew-penumpang' | 'sertifikat' | 'crew';
  const labelWilayah = await namaWilker(kodeWilker);
  const kunci = KUNCI_PER_METRIK[metrikSiap];
  const labelMetrik = LABEL_PER_METRIK[metrikSiap];

  const rentangMingguan = parseRentangMingguan(periodeKey);
  const rentangBulanan = !rentangMingguan ? parseRentangBulanan(periodeKey) : null;

  // ================= ANALISIS: rentang eksplisit dari filter user =================
  if (tipe === 'analisis' && rentangMingguan) {
    const { tahun, awal, akhir } = rentangMingguan;
    const panjang = akhir - awal + 1;
    const semua = await getRingkasanPesawatMingguan({ tahun, kodeWilker });
    const barisSaatIni = semua.filter((r) => r.minggu_epid >= awal && r.minggu_epid <= akhir);

    const sebelumAkhir = awal - 1;
    const sebelumAwal = Math.max(1, awal - panjang);
    const barisSebelumnya =
      sebelumAkhir >= 1 ? semua.filter((r) => r.minggu_epid >= sebelumAwal && r.minggu_epid <= sebelumAkhir) : [];

    return {
      labelKonteks: `Alat Angkut Pesawat — ${labelMetrik} — Mingguan`,
      labelWilayah,
      labelPeriodeSaatIni: `Minggu epidemiologi ${awal} s.d. ${akhir} tahun ${tahun}`,
      labelPeriodeSebelumnya:
        sebelumAkhir >= 1
          ? `Minggu epidemiologi ${sebelumAwal} s.d. ${sebelumAkhir} tahun ${tahun}`
          : 'Belum ada data sebelum rentang ini',
      ringkasanSaatIni: saring(jumlahkanKolom(barisSaatIni, kunci), kunci),
      ringkasanSebelumnya: saring(jumlahkanKolom(barisSebelumnya, kunci), kunci),
      topKategori: [],
    };
  }

  if (tipe === 'analisis' && rentangBulanan) {
    const { tahun, awal, akhir } = rentangBulanan;
    const panjang = akhir - awal + 1;
    const semua = await getRingkasanPesawatBulanan({ tahun, kodeWilker });
    const barisSaatIni = semua.filter((r) => {
      const b = nomorBulan(r);
      return b >= awal && b <= akhir;
    });

    const sebelumAkhir = awal - 1;
    const sebelumAwal = Math.max(1, awal - panjang);
    const barisSebelumnya =
      sebelumAkhir >= 1
        ? semua.filter((r) => {
            const b = nomorBulan(r);
            return b >= sebelumAwal && b <= sebelumAkhir;
          })
        : [];

    return {
      labelKonteks: `Alat Angkut Pesawat — ${labelMetrik} — Bulanan`,
      labelWilayah,
      labelPeriodeSaatIni: `${NAMA_BULAN_LOKAL[awal - 1] ?? awal} s.d. ${NAMA_BULAN_LOKAL[akhir - 1] ?? akhir} ${tahun}`,
      labelPeriodeSebelumnya:
        sebelumAkhir >= 1
          ? `${NAMA_BULAN_LOKAL[sebelumAwal - 1] ?? sebelumAwal} s.d. ${NAMA_BULAN_LOKAL[sebelumAkhir - 1] ?? sebelumAkhir} ${tahun}`
          : 'Belum ada data sebelum rentang ini',
      ringkasanSaatIni: saring(jumlahkanKolom(barisSaatIni, kunci), kunci),
      ringkasanSebelumnya: saring(jumlahkanKolom(barisSebelumnya, kunci), kunci),
      topKategori: [],
    };
  }

  // ================= PREDIKSI (atau periodeKey bukan format rentang):
  // pola LAMA -- satu periode tunggal, TIDAK berubah. Kalau yang masuk
  // ternyata format rentang (mis. tipe="prediksi" tapi menerima
  // periodeKey rentang karena page.tsx kirim periodeKey yang sama ke
  // BoxAnalisisAI & BoxPrediksiAI), pakai ujung AKHIR rentang sebagai
  // titik acuan tunggal. =================
  let periodeTunggal = periodeKey;
  if (rentangMingguan) periodeTunggal = `${rentangMingguan.tahun}-W${rentangMingguan.akhir}`;
  else if (rentangBulanan) periodeTunggal = `${rentangBulanan.tahun}-${rentangBulanan.akhir}`;

  const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeTunggal);

  if (isMingguan) {
    const p = parsePeriodeMingguan(periodeTunggal);
    const sebelumnya = periodeMingguanSebelumnya(p);

    const [barisSaatIni, barisSebelumnya] =
      p.tahun === sebelumnya.tahun
        ? await (async () => {
            const semua = await getRingkasanPesawatMingguan({ tahun: p.tahun, kodeWilker });
            return [semua, semua];
          })()
        : await Promise.all([
            getRingkasanPesawatMingguan({ tahun: p.tahun, kodeWilker }),
            getRingkasanPesawatMingguan({ tahun: sebelumnya.tahun, kodeWilker }),
          ]);

    const rowSaatIni = barisSaatIni.find((r: RingkasanMingguanPesawat) => r.minggu_epid === p.minggu);
    const rowSebelumnya = barisSebelumnya.find((r: RingkasanMingguanPesawat) => r.minggu_epid === sebelumnya.minggu);

    return {
      labelKonteks: `Alat Angkut Pesawat — ${labelMetrik} — Mingguan`,
      labelWilayah,
      labelPeriodeSaatIni: labelPeriodeMingguan(p),
      labelPeriodeSebelumnya: labelPeriodeMingguan(sebelumnya),
      ringkasanSaatIni: saring(keRecord(rowSaatIni, kunci), kunci),
      ringkasanSebelumnya: saring(keRecord(rowSebelumnya, kunci), kunci),
      topKategori: [],
    };
  }

  const p = parsePeriodeBulanan(periodeTunggal);
  const sebelumnya = periodeBulananSebelumnya(p);
  const bulanKeySaatIni = `${p.tahun}-${String(p.bulan).padStart(2, '0')}`;
  const bulanKeySebelumnya = `${sebelumnya.tahun}-${String(sebelumnya.bulan).padStart(2, '0')}`;

  const [barisSaatIni, barisSebelumnya] =
    p.tahun === sebelumnya.tahun
      ? await (async () => {
          const semua = await getRingkasanPesawatBulanan({ tahun: p.tahun, kodeWilker });
          return [semua, semua];
        })()
      : await Promise.all([
          getRingkasanPesawatBulanan({ tahun: p.tahun, kodeWilker }),
          getRingkasanPesawatBulanan({ tahun: sebelumnya.tahun, kodeWilker }),
        ]);

  const rowSaatIni = barisSaatIni.find((r: RingkasanBulananPesawat) => r.bulan === bulanKeySaatIni);
  const rowSebelumnya = barisSebelumnya.find((r: RingkasanBulananPesawat) => r.bulan === bulanKeySebelumnya);

  return {
    labelKonteks: `Alat Angkut Pesawat — ${labelMetrik} — Bulanan`,
    labelWilayah,
    labelPeriodeSaatIni: labelPeriodeBulanan(p),
    labelPeriodeSebelumnya: labelPeriodeBulanan(sebelumnya),
    ringkasanSaatIni: saring(keRecord(rowSaatIni, kunci), kunci),
    ringkasanSebelumnya: saring(keRecord(rowSebelumnya, kunci), kunci),
    topKategori: [],
  };
}