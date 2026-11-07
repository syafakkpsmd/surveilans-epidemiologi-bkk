// Data contoh untuk skrip uji: daftar wilayah kerja BKK Kelas I Samarinda (WK01-WK07).
// HANYA untuk pengujian. Aplikasi tidak memakai berkas ini: daftar wilayah dibaca dari tabel wilker_ref.
import { buatKamus, type JenisWilker, type Wilayah } from '../../lib/wilayah-kerja';

const w = (kode: string, nama: string, namaPendek: string, namaPeta: string, jenis: JenisWilker, urutan: number): Wilayah => ({
  kode, nama, namaPendek, namaPeta, jenis, urutan, aktif: true, lat: null, lng: null, petaLat: null, petaLng: null, zoom: 13,
  subLokasi: [], warna: null, catatan: null, alias: [],
});

export const WILAYAH_KERJA: readonly Wilayah[] = [
  w('WK01', 'Pelabuhan Samarinda', 'Samarinda', 'Samarinda', 'Pelabuhan', 1),
  w('WK02', 'Pelabuhan Tanjung Santan', 'Tanjung Santan', 'Tanjung Santan', 'Pelabuhan', 2),
  w('WK03', 'Pelabuhan Tanjung Laut', 'Tanjung Laut', 'Tanjung Laut', 'Pelabuhan', 3),
  w('WK04', 'Pelabuhan Lhoktuan', 'Lhoktuan', 'Lhoktuan', 'Pelabuhan', 4),
  w('WK05', 'Pelabuhan Sangatta', 'Sangatta', 'Sangatta', 'Pelabuhan', 5),
  w('WK06', 'Pelabuhan Sangkulirang', 'Sangkulirang', 'Sangkulirang', 'Pelabuhan', 6),
  w('WK07', 'Bandara APT Pranoto', 'APT Pranoto', 'Bandara APT Pranoto', 'Bandara', 7),
];

export const KAMUS_UJI = buatKamus(WILAYAH_KERJA);
export const NAMA_PENDEK_BY_KODE = KAMUS_UJI.namaPendekByKode;
export const NAMA_PANJANG_BY_KODE = KAMUS_UJI.namaPanjangByKode;
export const OPSI_WILKER_PETA = KAMUS_UJI.opsiPeta;
export const kodeDariTeks = KAMUS_UJI.kodeDariTeks;
export const namaDariKode = KAMUS_UJI.namaDariKode;
export const isKodeWilker = KAMUS_UJI.isKode;
