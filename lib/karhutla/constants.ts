export const BAKU_MUTU_UDARA = {
  pm25: { max: 25 },
  pm10: { max: 70 },
  suhu: { min: 18, max: 30 },
  hcho: { max: 0.1 },
  tvoc: { max: 3 },
  kelembapan: { min: 40, max: 60 },
} as const;

export type StatusEvaluasi = 'MS' | 'TMS' | 'BELUM_DIUJI' | 'TIDAK_LENGKAP';

interface DataUdara {
  pm25?: number | null; pm10?: number | null; suhu?: number | null;
  hcho?: number | null; tvoc?: number | null; kelembapan?: number | null;
}

export function hitungStatusEvaluasi(data: DataUdara): StatusEvaluasi {
  const nilai = [data.pm25, data.pm10, data.suhu, data.hcho, data.tvoc, data.kelembapan];

  if (nilai.every((v) => v === null || v === undefined)) return 'BELUM_DIUJI';
  if (nilai.some((v) => v === null || v === undefined)) return 'TIDAK_LENGKAP';

  const bm = BAKU_MUTU_UDARA;
  const lewatBatas =
    (data.pm25 != null && data.pm25 > bm.pm25.max) ||
    (data.pm10 != null && data.pm10 > bm.pm10.max) ||
    (data.suhu != null && (data.suhu < bm.suhu.min || data.suhu > bm.suhu.max)) ||
    (data.hcho != null && data.hcho > bm.hcho.max) ||
    (data.tvoc != null && data.tvoc > bm.tvoc.max) ||
    (data.kelembapan != null && (data.kelembapan < bm.kelembapan.min || data.kelembapan > bm.kelembapan.max));

  return lewatBatas ? 'TMS' : 'MS';
}

export const LABEL_STATUS: Record<StatusEvaluasi, string> = {
  MS: 'Memenuhi Syarat (MS)',
  TMS: 'Tidak Memenuhi Syarat (TMS)',
  BELUM_DIUJI: 'Belum Diuji',
  TIDAK_LENGKAP: 'Data Belum Lengkap',
};

export function buatOpsiWilayahIspa(
  daftarWilayah: { label: string; kode_wilker: string; zona: string | null; induk: string }[]
) {
  return daftarWilayah.map((w) => ({
    key: w.zona ? `${w.kode_wilker}::${w.zona}` : w.kode_wilker,
    label: w.label,
    induk: w.induk,
  }));
}

/**
 * Opsi untuk PilihWilayahMultiSelect sumber lokasi KUALITAS UDARA
 * (tabel lokasi_kualitas_udara) -- taksonomi terpisah dari wilayah ISPA
 * di atas. `key` di sini adalah `nama`, nilai persis yang disimpan di
 * kolom kualitas_udara_harian.lokasi (dipakai filter .in('lokasi', ...)).
 */
export function buatOpsiLokasiUdara(
  daftarLokasi: { nama: string; lokasi_induk: string | null; sub_lokasi: string | null }[]
) {
  return daftarLokasi.map((l) => ({
    key: l.nama,
    label: l.sub_lokasi ?? l.lokasi_induk ?? l.nama,
    induk: l.lokasi_induk,
  }));
}