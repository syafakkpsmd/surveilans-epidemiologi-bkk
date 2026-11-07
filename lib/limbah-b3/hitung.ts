// lib/limbah-b3/hitung.ts  (FILE BARU)
// Penilaian dan agregasi pemeriksaan limbah B3. MURNI: dipakai server (halaman) dan klien (filter di dasbor).
//
// Definisi (ditampilkan juga di dasbor):
//   skor satu pemeriksaan = butir "Ya" / (butir "Ya" + butir "Tidak") x 100.  "N/A" dan butir kosong TIDAK dihitung.
//   skor rata-rata       = rata-rata skor tiap pemeriksaan (tiap pemeriksaan berbobot sama), pemeriksaan tanpa butir terisi dilewati.
//   kepatuhan seksi/butir = gabungan semua pemeriksaan: "Ya" / ("Ya" + "Tidak").
import { BUTIR, SEKSI, namaKolomButir } from './butir';

export interface BarisB3 {
  id: string;
  wilayah_kerja: string;
  nama_klinik: string;
  tanggal_pemeriksaan: string; // 'YYYY-MM-DD'
  jenis_layanan: string | null;
  temuan_utama: string | null;
  rekomendasi: string | null;
  batas_waktu_tindak_lanjut: string | null;
  status_tindak_lanjut: string | null;
  [item: string]: string | number | null; // item_01..item_33
}

export const NAMA_BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const bulanDari = (tgl: string): number => Number(String(tgl).slice(5, 7)) || 0; // tanpa Date: bebas geser zona waktu

export interface Skor { ya: number; tidak: number; na: number; kosong: number; skor: number | null }

function hitungNilai(nilai: (string | number | null | undefined)[]): Skor {
  let ya = 0, tidak = 0, na = 0, kosong = 0;
  for (const v of nilai) {
    if (v === 'Ya') ya++; else if (v === 'Tidak') tidak++; else if (v === 'N/A') na++; else kosong++;
  }
  return { ya, tidak, na, kosong, skor: ya + tidak > 0 ? (ya / (ya + tidak)) * 100 : null };
}

export const skorBaris = (b: BarisB3): Skor => hitungNilai(BUTIR.map((x) => b[namaKolomButir(x.no)]));

/** Butir yang dijawab "Tidak" pada pemeriksaan ini (untuk daftar temuan). */
export const butirTidak = (b: BarisB3): number[] => BUTIR.filter((x) => b[namaKolomButir(x.no)] === 'Tidak').map((x) => x.no);

export const adaTemuan = (b: BarisB3): boolean => butirTidak(b).length > 0;
export const tindakLanjutSelesai = (b: BarisB3): boolean => (b.status_tindak_lanjut ?? '').trim().toLowerCase() === 'selesai';

/** Perlu tindak lanjut = ada butir "Tidak" dan statusnya belum "Selesai". */
export const tindakLanjutTerbuka = (b: BarisB3): boolean => adaTemuan(b) && !tindakLanjutSelesai(b);

export const terlambat = (b: BarisB3, hariIni: string): boolean =>
  tindakLanjutTerbuka(b) && !!b.batas_waktu_tindak_lanjut && b.batas_waktu_tindak_lanjut < hariIni; // string ISO bisa dibandingkan langsung

export interface Ringkasan {
  jumlahPemeriksaan: number; klinikDiperiksa: number; skorRata: number | null;
  totalTidak: number; tindakLanjutTerbuka: number; terlambat: number;
}

export function hitungRingkasan(rows: BarisB3[], hariIni: string): Ringkasan {
  const skor = rows.map((r) => skorBaris(r));
  const bernilai = skor.filter((s) => s.skor !== null);
  return {
    jumlahPemeriksaan: rows.length,
    klinikDiperiksa: new Set(rows.map((r) => `${r.wilayah_kerja}|${r.nama_klinik.toLowerCase().trim()}`)).size,
    skorRata: bernilai.length ? bernilai.reduce((a, s) => a + (s.skor as number), 0) / bernilai.length : null,
    totalTidak: skor.reduce((a, s) => a + s.tidak, 0),
    tindakLanjutTerbuka: rows.filter(tindakLanjutTerbuka).length,
    terlambat: rows.filter((r) => terlambat(r, hariIni)).length,
  };
}

export interface TitikBulan { name: string; label: string; urutan: number; jumlah_pemeriksaan: number; skor_rata: number }

/** Satu titik per bulan yang ada datanya (urut). Bentuk name/label/urutan sama dengan data chart dasbor lain. */
export function trenBulanan(rows: BarisB3[]): TitikBulan[] {
  const peta = new Map<number, BarisB3[]>();
  for (const r of rows) {
    const b = bulanDari(r.tanggal_pemeriksaan);
    if (b >= 1 && b <= 12) peta.set(b, [...(peta.get(b) ?? []), r]);
  }
  return [...peta.entries()].sort((a, b) => a[0] - b[0]).map(([b, rs]) => {
    const s = rs.map(skorBaris).filter((x) => x.skor !== null);
    const nama = NAMA_BULAN_PENDEK[b - 1];
    return {
      name: nama, label: nama, urutan: b, jumlah_pemeriksaan: rs.length,
      skor_rata: s.length ? Math.round((s.reduce((a, x) => a + (x.skor as number), 0) / s.length) * 10) / 10 : 0,
    };
  });
}

export interface TitikSeksi { name: string; label: string; huruf: string; kepatuhan: number; ya: number; tidak: number }

export function kepatuhanPerSeksi(rows: BarisB3[]): TitikSeksi[] {
  return SEKSI.map((s) => {
    const nilai: (string | number | null)[] = [];
    for (const r of rows) for (const b of BUTIR) if (b.seksi === s.huruf) nilai.push(r[namaKolomButir(b.no)]);
    const h = hitungNilai(nilai);
    const nama = `${s.huruf}. ${s.nama}`;
    return { name: nama, label: nama, huruf: s.huruf, kepatuhan: h.skor === null ? 0 : Math.round(h.skor * 10) / 10, ya: h.ya, tidak: h.tidak };
  });
}

export interface ButirBermasalah { no: number; teks: string; seksi: string; tidak: number; dinilai: number }

/** Butir yang paling sering "Tidak", urut menurun. */
export function butirPalingSeringTidak(rows: BarisB3[], batas = 10): ButirBermasalah[] {
  return BUTIR.map((b) => {
    const nilai = rows.map((r) => r[namaKolomButir(b.no)]);
    const tidak = nilai.filter((v) => v === 'Tidak').length;
    const dinilai = nilai.filter((v) => v === 'Ya' || v === 'Tidak').length;
    return { no: b.no, teks: b.teks, seksi: b.seksi, tidak, dinilai };
  }).filter((x) => x.tidak > 0).sort((a, b) => b.tidak - a.tidak || a.no - b.no).slice(0, batas);
}
