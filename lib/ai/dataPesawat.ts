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

async function namaWilker(kodeWilker: string | undefined): Promise<string> {
  if (!kodeWilker) return 'Seluruh Bandara (BKK Kelas I Samarinda)';
  const daftar = await getWilkerRef();
  return daftar.find((w) => w.kode === kodeWilker)?.nama ?? kodeWilker;
}

/**
 * kodeWilker OPSIONAL untuk pesawat (beda dari vektor yang mewajibkan) --
 * "Semua Bandara" tetap valid, mengikuti pola cop/phqc/breakdown lain.
 * metrik menentukan kolom mana yang dikirim ke prompt AI.
 */
export async function ambilDataAnalisisPesawat(
  periodeKey: string,
  kodeWilker: string | undefined,
  metrik: MetrikPesawat = 'crew-penumpang'
): Promise<DataAnalisis> {
  if (!METRIK_PESAWAT_SIAP.includes(metrik as any)) {
    throw new Error(
      `Metrik "${metrik}" untuk Analisis/Prediksi AI pesawat belum didukung backend -- perlu bentuk data getKotaPesawatBulanan/getMaskapaiPesawatBulanan dulu sebelum bisa disambungkan.`
    );
  }
  const metrikSiap = metrik as 'crew-penumpang' | 'sertifikat' | 'crew';

  const labelWilayah = await namaWilker(kodeWilker);
  const isMingguan = /^\d{4}-W\d{1,2}$/.test(periodeKey);
  const kunci = KUNCI_PER_METRIK[metrikSiap];
  const labelMetrik = LABEL_PER_METRIK[metrikSiap];

  if (isMingguan) {
    const p = parsePeriodeMingguan(periodeKey);
    const sebelumnya = periodeMingguanSebelumnya(p);

    // getRingkasanPesawatMingguan mengambil satu tahun penuh sekaligus --
    // kalau periode sebelumnya jatuh di tahun berbeda (mis. minggu 1 ->
    // minggu 52 tahun lalu), perlu 2 pemanggilan terpisah.
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

  const p = parsePeriodeBulanan(periodeKey);
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