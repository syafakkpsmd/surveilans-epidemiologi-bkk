/**
 * Port TypeScript dari fungsi SQL `mmwr_week(date)` di database.
 * HARUS tetap sinkron logikanya dengan versi SQL -- kalau salah satu
 * diubah, ubah juga yang satunya, supaya "minggu epidemiologi
 * berjalan" yang dihitung di Next.js selalu sama dengan yang dipakai
 * oleh view Supabase (view_mingguan_ringkasan, dst).
 *
 * Aturan (standar WHO/CDC MMWR): minggu mulai hari Minggu, minggu-1
 * tahun berjalan = minggu yang memuat setidaknya 4 hari di tahun itu
 * (ekuivalen dengan minggu yang memuat tanggal 4 Januari).
 */

export interface MingguEpidemiologi {
  tahunEpid: number;
  mingguEpid: number;
}

function cariMulaiMingguSatu(tahun: number): Date {
  const jan1 = new Date(Date.UTC(tahun, 0, 1));
  const jan1Dow = jan1.getUTCDay(); // 0 = Minggu ... 6 = Sabtu

  const mulai = new Date(jan1);
  if (jan1Dow <= 3) {
    mulai.setUTCDate(jan1.getUTCDate() - jan1Dow);
  } else {
    mulai.setUTCDate(jan1.getUTCDate() + (7 - jan1Dow));
  }
  return mulai;
}

export function hitungMingguEpidemiologi(tanggal: Date): MingguEpidemiologi {
  // Normalisasi ke tengah malam UTC dulu supaya perbandingan tanggal
  // tidak terpengaruh jam/menit/detik atau timezone lokal browser/server.
  const tanggalUtc = new Date(
    Date.UTC(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate())
  );

  let tahun = tanggalUtc.getUTCFullYear();
  let mulaiMingguSatu = cariMulaiMingguSatu(tahun);

  if (tanggalUtc.getTime() < mulaiMingguSatu.getTime()) {
    tahun -= 1;
    mulaiMingguSatu = cariMulaiMingguSatu(tahun);
  }

  const selisihHari = Math.round(
    (tanggalUtc.getTime() - mulaiMingguSatu.getTime()) / 86_400_000
  );
  const mingguEpid = Math.floor(selisihHari / 7) + 1;

  return { tahunEpid: tahun, mingguEpid };
}

/**
 * Mendapatkan minggu epidemiologi untuk hari ini (sekarang).
 * Digunakan untuk filter default di dashboard.
 */
export function getMingguEpidSaatIni(): MingguEpidemiologi {
  return hitungMingguEpidemiologi(new Date());
}
