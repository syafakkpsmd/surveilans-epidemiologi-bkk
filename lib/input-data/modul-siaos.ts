// lib/input-data/modul-siaos.ts
// Modul input SIAOS (Izin Angkut Orang Sakit): form satu per satu + unggah Excel.
// Berkas ekspor Sinkarkes ("Rekap Izin Lalu Lintas Orang Sakit") dibaca APA ADANYA: judul laporan dan baris ringkasan
// di atas tabel dilewati, judul kolom dicari otomatis (spasi berlebih/huruf kecil tidak masalah), umur "55 tahun"
// dipecah jadi usia 55 + satuan Tahun, dan tanggal model apa pun dibaca lewat parseTanggal (pakaiParseTanggal).
// MURNI (tanpa database / exceljs), aman dipakai komponen 'use client'. Didaftarkan lewat MODUL_KLINIK (modul-klinik.ts).
//
// Tabel `siaos` sudah dipakai dasbor SIAOS. Makna kolom mengikuti dasbor itu:
//   maskapai terisi = Pesawat, pelayaran terisi = Kapal; pelabuhan = "Pelabuhan Tujuan"; perlu_kursi_dorong = Tidak/Pintu/Tempat Duduk.
// Kolom ekspor Sinkarkes yang TIDAK punya kolom di tabel (Telepon, Alamat, Jenis Penyakit, No Penerbangan, Tanggal Diagnosis,
// pendamping, keluarga, penerbit, dst.) diabaikan; judulnya dicantumkan di pratinjau unggahan.
import type { JenisWilker } from '@/lib/wilayah-kerja';
import type { KolomModul, ModulInput } from './modul';

const JENIS_LENGKAP: JenisWilker[] = ['Pelabuhan', 'Bandara', 'Kantor'];
/** Judul kolom wilayah pada ekspor Sinkarkes. "Pelabuhan" sengaja TIDAK dipakai di sini: pada SIAOS itu pelabuhan tujuan. */
const ALIAS_WILKER = ['Wilayah Kerja', 'Wilker', 'Nama KKP', 'Nama Balai Karkes', 'KKP Induk/Wilker', 'KKP Induk'];

const T = (nama: string, label: string, alias?: string[], extra: Partial<KolomModul> = {}): KolomModul => ({ nama, label, tipe: 'teks', alias, ...extra });

const SATUAN: Record<string, string> = { tahun: 'Tahun', thn: 'Tahun', th: 'Tahun', bulan: 'Bulan', bln: 'Bulan', bl: 'Bulan', hari: 'Hari', hr: 'Hari' };

/** "55 tahun" -> { usia: 55, satuan: 'Tahun' }; "1 hari" -> Hari; "2 tahun 3 bulan" -> bagian pertama yang bukan nol.
 *  Angka polos ("55") dan bentuk yang tidak dikenal -> null (dibiarkan untuk validasi biasa). */
export function pecahUsia(v: unknown): { usia: number; satuan: string } | null {
  if (typeof v !== 'string') return null;
  const bagian = [...v.toLowerCase().matchAll(/(\d+)\s*(tahun|thn|th|bulan|bln|bl|hari|hr)\b/g)];
  if (!bagian.length) return null;
  const pilih = bagian.find((b) => Number(b[1]) > 0) ?? bagian[0];
  return { usia: Number(pilih[1]), satuan: SATUAN[pilih[2]] };
}

const kosongTeks = (v: unknown) => v == null || String(v).trim() === '';

/** Rencana Perjalanan (Pelayaran/Maskapai) di ekspor Sinkarkes adalah petunjuk moda yang benar, sedangkan nama alat angkut kadang
 *  terisi di kolom yang salah (mis. nama kapal di kolom maskapai). Dasbor menghitung "maskapai terisi" sebagai Pesawat, jadi
 *  nama dipindah ke kolom yang sesuai moda. Tidak ada nama yang dikarang: bila nama kosong, tetap kosong. */
export function siapkanBarisSiaos(mentah: Record<string, unknown>): Record<string, unknown> {
  let hasil = mentah;
  const p = pecahUsia(mentah.usia);
  if (p) {
    hasil = { ...hasil, usia: p.usia, satuan_usia: kosongTeks(mentah.satuan_usia) ? p.satuan : mentah.satuan_usia };
  }
  const moda = String(mentah.rencana_perjalanan ?? '').trim().toLowerCase();
  if (moda === 'pelayaran' && kosongTeks(hasil.pelayaran) && !kosongTeks(hasil.maskapai)) {
    hasil = { ...hasil, pelayaran: hasil.maskapai, maskapai: null };
  } else if (moda === 'maskapai' && kosongTeks(hasil.maskapai) && !kosongTeks(hasil.pelayaran)) {
    hasil = { ...hasil, maskapai: hasil.pelayaran, pelayaran: null };
  }
  return hasil;
}

const siaos: ModulInput = {
  kunci: 'siaos',
  label: 'SIAOS (Izin Angkut Orang Sakit)',
  tabel: 'siaos',
  kolomTanggal: 'tanggal',
  kolomWilayah: 'wilayah_kerja',
  kolomKunci: 'nama',
  // satu surat bisa memuat beberapa pasien, dan satu pasien bisa punya beberapa surat: nomor surat ikut menjadi kunci
  kolomKunciTambahan: ['no_surat'],
  namaKunci: 'nama pasien',
  pakaiParseTanggal: true,
  wilayahDenganSpasi: true,
  kunciWilker: 'siaos', // wilayah yang boleh = yang dicentang admin untuk SIAOS (sama dengan dasbor)
  jenisWilayahBoleh: JENIS_LENGKAP,
  peranBoleh: ['admin', 'petugas'],
  siapkanBaris: siapkanBarisSiaos,
  kolomHasilSiapkan: { usia: ['satuan_usia'], rencana_perjalanan: ['maskapai', 'pelayaran'] },
  // dibaca hanya untuk siapkanBaris; tidak disimpan (tabel siaos tidak punya kolomnya)
  kolomBantu: { rencana_perjalanan: ['Rencana Perjalanan'] },
  kolomDaftar: ['tanggal', 'wilayah_kerja', 'nama', 'no_surat', 'usia', 'satuan_usia', 'diagnosa', 'maskapai', 'pelayaran', 'pelabuhan'],
  kolom: [
    { nama: 'tanggal', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tgl', 'Tanggal Surat', 'Tanggal Izin', 'Diterbitkan Tanggal'], kelompok: 'Izin' },
    { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
    // Sinkarkes menulis nomor surat dengan spasi tak beraturan ("/ 2026", "9 /9"); spasi dibuang agar nomor yang sama selalu sama
    T('no_surat', 'No. Surat', ['No Surat', 'Nomor Surat'], { maks: 255, tanpaSpasi: true }),
    T('nama', 'Nama', ['Nama Pasien', 'Nama Lengkap'], { wajib: true, kelompok: 'Pasien' }),
    { nama: 'usia', label: 'Usia', tipe: 'bilangan', alias: ['Umur'], batasNilai: [0, 120] },
    T('satuan_usia', 'Satuan Usia', ['Satuan Umur'], { maks: 20 }),
    T('jenis_kelamin', 'Jenis Kelamin', ['Sex', 'JK', 'L/P'], { maks: 20 }),
    T('diagnosa', 'Diagnosa', ['Diagnosis'], { maks: 255 }),
    T('kondisi_lanjut_perjalanan', 'Kondisi Lanjut Perjalanan', ['Kondisi Pasien', 'Kondisi Pasien Dapat Melanjutkan Perjalanan'], { maks: 100 }),
    T('maskapai', 'Maskapai', undefined, { kelompok: 'Perjalanan' }),
    T('pelayaran', 'Pelayaran', ['Kapal', 'Nama Kapal']),
    T('pelabuhan', 'Pelabuhan Tujuan', ['Pelabuhan', 'KKP Tempat Tujuan', 'KKP Tujuan', 'Tempat Tujuan']),
    T('butuh_bantuan_medis', 'Butuh Bantuan Medis', ['Membutuhkan bantuan pendamping dibidang medis', 'Membutuhkan bantuan pendamping di bidang medis', 'Butuh Pendamping Medis'], { maks: 100, kelompok: 'Kebutuhan pasien' }),
    T('ambulance', 'Ambulance', ['Membutuhkan bantuan ambulan', 'Membutuhkan bantuan ambulans', 'Ambulan', 'Ambulans'], { maks: 100 }),
    T('perlu_kursi_dorong', 'Perlu Kursi Dorong', ['Memerlukan roda/kereta dorong/Tandu', 'Perlu Kursi Roda', 'Kursi Roda'], { maks: 100 }),
    T('perlu_bantuan_makanan_medikasi', 'Perlu Bantuan Makanan/Medikasi', ['Memerlukan bantuan makanan,medikasi', 'Memerlukan bantuan makanan, medikasi', 'Bantuan Makanan/Medikasi'], { maks: 100 }),
  ],
};

export const MODUL_SIAOS: Record<string, ModulInput> = { siaos };