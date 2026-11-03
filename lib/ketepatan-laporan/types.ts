/**
 * lib/ketepatan-laporan/types.ts
 * Tipe data modul "Dashboard Ketepatan dan Kelengkapan Laporan Surveilans".
 */

export type JenisLaporan = 'MINGGUAN' | 'BULANAN';

/**
 * ON_TIME   : sudah dikirim, submittedAt <= deadline
 * LATE      : sudah dikirim, submittedAt  > deadline
 * MISSING   : belum dikirim DAN deadline sudah lewat
 * UPCOMING  : belum dikirim DAN deadline belum lewat (periode belum berjalan
 *             atau masih dalam masa tunggu laporan)
 */
export type StatusLaporan = 'ON_TIME' | 'LATE' | 'MISSING' | 'UPCOMING';

/** Tingkat kinerja untuk pewarnaan. NETRAL = belum ada periode yang bisa dinilai. */
export type Tingkat = 'HIJAU' | 'KUNING' | 'MERAH' | 'NETRAL';

export type JenisFaskes = 'Pelabuhan' | 'Bandara' | 'Puskesmas' | 'Klinik Binaan';

export interface UnitFaskes {
  id: string;
  nama: string;
  /** Wilayah kerja BKK tempat unit berada (mis. "Samarinda", "APT Pranoto"). */
  wilayah: string;
  jenis: JenisFaskes;
}

/** Satu laporan yang masuk. Bentuk inilah yang perlu dihasilkan query data asli. */
export interface LaporanMasuk {
  unitId: string;
  jenis: JenisLaporan;
  tahun: number;
  /** 1-52 untuk MINGGUAN (minggu epidemiologi), 1-12 untuk BULANAN. */
  periode: number;
  /** ISO 8601, mis. "2026-09-29T14:20:00+08:00". */
  submittedAt: string;
}

export interface PeriodeJadwal {
  periode: number;
  labelPendek: string; // "W38" / "Sep"
  labelPanjang: string; // "Minggu 38 (20-26 Sep 2026)" / "September 2026"
  /** Laporan dianggap masuk periode ini paling cepat setelah akhirPeriode. */
  akhirPeriode: Date;
  deadline: Date;
}

export interface SelEvaluasi {
  periode: number;
  labelPendek: string;
  labelPanjang: string;
  status: StatusLaporan;
  submittedAt: Date | null;
  deadline: Date;
  /**
   * LATE: berapa lama terlambat; MISSING: berapa lama sudah lewat deadline;
   * ON_TIME: berapa lama sebelum deadline; UPCOMING: null.
   */
  selisihMs: number | null;
}

export interface HitungStatus {
  onTime: number;
  late: number;
  missing: number;
  upcoming: number;
}

export interface Ringkasan extends HitungStatus {
  /** Periode yang sudah jatuh tempo (ON_TIME + LATE + MISSING). */
  diEvaluasi: number;
  /** Persen 0-100 (1 desimal), null bila belum ada periode yang bisa dinilai. */
  kelengkapan: number | null;
  ketepatan: number | null;
}

export interface BarisEvaluasi {
  unit: UnitFaskes;
  sel: SelEvaluasi[];
  ringkasan: Ringkasan;
}

export interface RingkasanAgregat extends Ringkasan {
  totalUnit: number;
  /** Unit yang sudah mengirim minimal satu laporan pada tahun itu. */
  unitPernahLapor: number;
}

export interface HasilEvaluasi {
  jadwal: PeriodeJadwal[];
  baris: BarisEvaluasi[];
  agregat: RingkasanAgregat;
  /** Jumlah periode yang deadline-nya sudah lewat. */
  periodeJatuhTempo: number;
  /** Periode pertama yang deadline-nya belum lewat (null bila semua sudah lewat). */
  periodeBerjalan: number | null;
}
