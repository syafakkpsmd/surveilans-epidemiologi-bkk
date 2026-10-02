/**
 * lib/ketepatan-laporan/evaluasi.ts
 *
 * Logika murni (tanpa React/database): jadwal periode, penentuan status sel,
 * perhitungan Kelengkapan & Ketepatan, dan klasifikasi warna.
 *
 * Aturan hitung:
 *  - Hanya periode yang SUDAH JATUH TEMPO yang dinilai (ON_TIME + LATE +
 *    MISSING). UPCOMING tidak masuk pembilang maupun penyebut, jadi capaian
 *    YTD tidak "turun" gara-gara periode yang belum waktunya.
 *  - Kelengkapan = (ON_TIME + LATE) / periode dinilai
 *  - Ketepatan   = ON_TIME / periode dinilai
 *  - Agregat (semua faskes) = JUMLAH hitungan lalu dibagi, BUKAN rata-rata
 *    persentase per faskes.
 *  - Persen dibulatkan 1 desimal SEBELUM diklasifikasi, supaya angka yang
 *    tampil dan warnanya selalu konsisten (89,96 tampil 90,0 dan hijau).
 */

import type {
  BarisEvaluasi,
  HasilEvaluasi,
  HitungStatus,
  JenisLaporan,
  LaporanMasuk,
  PeriodeJadwal,
  Ringkasan,
  RingkasanAgregat,
  SelEvaluasi,
  StatusLaporan,
  Tingkat,
  UnitFaskes,
} from './types';
import {
  NAMA_BULAN_PENDEK,
  akhirBulanan,
  akhirMingguan,
  deadlineBulanan,
  deadlineMingguan,
  labelRentangMinggu,
  namaBulanPanjang,
} from './waktu';

export const JUMLAH_PERIODE: Record<JenisLaporan, number> = { MINGGUAN: 52, BULANAN: 12 };

/** Standar kinerja minimal. */
export const STANDAR = {
  kelengkapan: { hijau: 90, kuning: 80 }, // >=90 hijau, 80-89 kuning, <80 merah
  ketepatan: { hijau: 80 }, // >=80 hijau, selain itu merah
} as const;

// ------------------------------------------------------------------ Jadwal

export function buatJadwal(jenis: JenisLaporan, tahun: number): PeriodeJadwal[] {
  return Array.from({ length: JUMLAH_PERIODE[jenis] }, (_, i) => {
    const p = i + 1;
    return jenis === 'MINGGUAN'
      ? {
          periode: p,
          labelPendek: `W${p}`,
          labelPanjang: `Minggu ${p} (${labelRentangMinggu(tahun, p)})`,
          akhirPeriode: akhirMingguan(tahun, p),
          deadline: deadlineMingguan(tahun, p),
        }
      : {
          periode: p,
          labelPendek: NAMA_BULAN_PENDEK[i],
          labelPanjang: `${namaBulanPanjang(p)} ${tahun}`,
          akhirPeriode: akhirBulanan(tahun, p),
          deadline: deadlineBulanan(tahun, p),
        };
  });
}

// ------------------------------------------------------------------ Status

/** Fungsi inti: status satu sel berdasarkan submittedAt, deadline, dan waktu sekarang. */
export function tentukanStatus(submittedAt: Date | null, deadline: Date, now: Date): StatusLaporan {
  if (submittedAt) return submittedAt.getTime() <= deadline.getTime() ? 'ON_TIME' : 'LATE';
  return now.getTime() > deadline.getTime() ? 'MISSING' : 'UPCOMING';
}

function hitungSelisih(status: StatusLaporan, submittedAt: Date | null, deadline: Date, now: Date): number | null {
  switch (status) {
    case 'ON_TIME':
      return submittedAt ? deadline.getTime() - submittedAt.getTime() : null;
    case 'LATE':
      return submittedAt ? submittedAt.getTime() - deadline.getTime() : null;
    case 'MISSING':
      return now.getTime() - deadline.getTime();
    default:
      return null;
  }
}

// ------------------------------------------------------------- Persentase

const bulatkan1 = (x: number) => Math.round(x * 10) / 10;

export function hitungStatusKosong(): HitungStatus {
  return { onTime: 0, late: 0, missing: 0, upcoming: 0 };
}

export function tambahHitung(a: HitungStatus, b: HitungStatus): HitungStatus {
  return {
    onTime: a.onTime + b.onTime,
    late: a.late + b.late,
    missing: a.missing + b.missing,
    upcoming: a.upcoming + b.upcoming,
  };
}

export function hitungDariStatus(daftar: readonly StatusLaporan[]): HitungStatus {
  const h = hitungStatusKosong();
  for (const s of daftar) {
    if (s === 'ON_TIME') h.onTime++;
    else if (s === 'LATE') h.late++;
    else if (s === 'MISSING') h.missing++;
    else h.upcoming++;
  }
  return h;
}

/** Hitungan status -> Kelengkapan & Ketepatan (null bila belum ada periode dinilai). */
export function hitungRingkasan(h: HitungStatus): Ringkasan {
  const diEvaluasi = h.onTime + h.late + h.missing;
  return {
    ...h,
    diEvaluasi,
    kelengkapan: diEvaluasi > 0 ? bulatkan1(((h.onTime + h.late) / diEvaluasi) * 100) : null,
    ketepatan: diEvaluasi > 0 ? bulatkan1((h.onTime / diEvaluasi) * 100) : null,
  };
}

// ------------------------------------------------------------ Klasifikasi

export function klasifikasiKelengkapan(persen: number | null): Tingkat {
  if (persen === null) return 'NETRAL';
  if (persen >= STANDAR.kelengkapan.hijau) return 'HIJAU';
  if (persen >= STANDAR.kelengkapan.kuning) return 'KUNING';
  return 'MERAH';
}

export function klasifikasiKetepatan(persen: number | null): Tingkat {
  if (persen === null) return 'NETRAL';
  return persen >= STANDAR.ketepatan.hijau ? 'HIJAU' : 'MERAH';
}

/**
 * Badge gabungan kartu ringkasan:
 *  MERAH  bila Kelengkapan < 80 ATAU Ketepatan < 80
 *  KUNING bila Kelengkapan 80-89 (dan Ketepatan >= 80)
 *  HIJAU  bila Kelengkapan >= 90 DAN Ketepatan >= 80
 */
export function klasifikasiGabungan(kelengkapan: number | null, ketepatan: number | null): Tingkat {
  const a = klasifikasiKelengkapan(kelengkapan);
  const b = klasifikasiKetepatan(ketepatan);
  if (a === 'NETRAL' || b === 'NETRAL') return 'NETRAL';
  if (a === 'MERAH' || b === 'MERAH') return 'MERAH';
  if (a === 'KUNING') return 'KUNING';
  return 'HIJAU';
}

// ---------------------------------------------------------------- Evaluasi

/** Indeks laporan: kunci "unit|jenis|tahun|periode" -> waktu kirim TERAWAL. */
export function indeksLaporan(laporan: readonly LaporanMasuk[]): Map<string, Date> {
  const peta = new Map<string, Date>();
  for (const l of laporan) {
    const t = new Date(l.submittedAt);
    if (Number.isNaN(t.getTime())) continue; // abaikan timestamp rusak
    const kunci = `${l.unitId}|${l.jenis}|${l.tahun}|${l.periode}`;
    const lama = peta.get(kunci);
    if (!lama || t.getTime() < lama.getTime()) peta.set(kunci, t);
  }
  return peta;
}

export function evaluasiUnit(
  unit: UnitFaskes,
  jenis: JenisLaporan,
  tahun: number,
  jadwal: readonly PeriodeJadwal[],
  indeks: ReadonlyMap<string, Date>,
  now: Date,
): BarisEvaluasi {
  const sel: SelEvaluasi[] = jadwal.map((p) => {
    const submittedAt = indeks.get(`${unit.id}|${jenis}|${tahun}|${p.periode}`) ?? null;
    const status = tentukanStatus(submittedAt, p.deadline, now);
    return {
      periode: p.periode,
      labelPendek: p.labelPendek,
      labelPanjang: p.labelPanjang,
      status,
      submittedAt,
      deadline: p.deadline,
      selisihMs: hitungSelisih(status, submittedAt, p.deadline, now),
    };
  });
  return { unit, sel, ringkasan: hitungRingkasan(hitungDariStatus(sel.map((s) => s.status))) };
}

export function agregatkan(baris: readonly BarisEvaluasi[]): RingkasanAgregat {
  const total = baris.reduce((acc, b) => tambahHitung(acc, b.ringkasan), hitungStatusKosong());
  return {
    ...hitungRingkasan(total),
    totalUnit: baris.length,
    unitPernahLapor: baris.filter((b) => b.ringkasan.onTime + b.ringkasan.late > 0).length,
  };
}

export function evaluasiMatriks(
  units: readonly UnitFaskes[],
  jenis: JenisLaporan,
  tahun: number,
  indeks: ReadonlyMap<string, Date>,
  now: Date,
): HasilEvaluasi {
  const jadwal = buatJadwal(jenis, tahun);
  const baris = units.map((u) => evaluasiUnit(u, jenis, tahun, jadwal, indeks, now));
  const periodeJatuhTempo = jadwal.filter((p) => now.getTime() > p.deadline.getTime()).length;
  const berjalan = jadwal.find((p) => now.getTime() <= p.deadline.getTime());
  return {
    jadwal,
    baris,
    agregat: agregatkan(baris),
    periodeJatuhTempo,
    periodeBerjalan: berjalan ? berjalan.periode : null,
  };
}
