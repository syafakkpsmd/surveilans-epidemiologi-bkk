// lib/input-data/modul.ts
// Konfigurasi modul input data + unggah Excel. MURNI (tanpa database / exceljs) sehingga aman
// dipakai komponen 'use client'. Menambah modul baru = menambah satu entri di MODUL.
import { WILAYAH_KERJA, kodeDariTeks, type KodeWilker } from '@/lib/wilayah-kerja';

export type TipeKolom = 'teks' | 'bilangan' | 'desimal' | 'tanggal' | 'tanggalwaktu' | 'waktu' | 'rba' | 'wilker';

export interface KolomModul {
  /** Nama kolom di tabel. */
  nama: string;
  /** Judul kolom pada template Excel dan form. */
  label: string;
  tipe: TipeKolom;
  wajib?: boolean;
  /** Penulisan lain judul kolom yang diterima saat membaca Excel (selain label dan nama kolom). */
  alias?: string[];
  /** Diisi MANUAL oleh petugas setelah data masuk (dropdown di daftar). Unggahan tidak menimpanya dengan kosong. */
  manual?: boolean;
  /** Pilihan awal dropdown (digabung dengan nilai yang sudah ada di data). Kosong = teks bebas. */
  pilihan?: string[];
  /** Hanya tampil di daftar/form bila true; kolom arsip dari Sinkarkes disimpan tetapi tidak ditampilkan. */
  arsip?: boolean;
  /** Panjang maksimum teks (default 255; harus sesuai kolom di database). */
  maks?: number;
}

export interface ModulInput {
  kunci: string;
  label: string;
  tabel: string;
  /** Kolom tanggal yang menentukan TAHUN/BULAN data. */
  kolomTanggal: string;
  /** Kolom wilayah kerja. */
  kolomWilayah: string;
  /** Kolom nama kapal (bagian kunci pencocokan baris). */
  kolomKunci: string;
  /** Kolom pembeda tambahan pada kunci pencocokan (mis. nomor barcode/QR), bila satu kapal bisa punya beberapa dokumen sehari. */
  kolomKunciTambahan?: string[];
  /** Wilayah kerja yang boleh pada modul ini. */
  wilayahBoleh: KodeWilker[];
  kolom: KolomModul[];
  /** Kolom yang ditampilkan di daftar data (kolom manual selalu ditambahkan di belakang). */
  kolomDaftar: string[];
  /** Peran yang boleh menambah/mengunggah/mengisi. Hapus selalu khusus admin. */
  peranBoleh: ('admin' | 'petugas' | 'petugas_klinik')[];
  /** Isi negara_kedatangan dari master pelabuhan (hanya COP). */
  negaraDariMaster?: boolean;
}

const WILKER_KAPAL: KodeWilker[] = ['WK01', 'WK02', 'WK03', 'WK04', 'WK05', 'WK06'];
const SEMUA_WILKER: KodeWilker[] = [...WILKER_KAPAL, 'WK07'];
/** Judul kolom wilayah yang diterima pada ekspor Sinkarkes (isinya nama wilayah kerja). */
const ALIAS_WILKER = ['Wilayah Kerja', 'Wilker', 'Pelabuhan', 'Nama KKP', 'KKP', 'Nama Balai Karkes', 'KKP Induk/Wilker', 'KKP Induk'];

export const PILIHAN_RBA = ['Hijau', 'Kuning', 'Merah'];
/** Label tampilan; nilai tersimpan tetap Hijau/Kuning/Merah (dipakai view dan dasbor). */
export const LABEL_RBA: Record<string, string> = { Hijau: 'Rendah (Hijau)', Kuning: 'Sedang (Kuning)', Merah: 'Tinggi (Merah)' };

const T = (nama: string, label: string, alias?: string[], extra: Partial<KolomModul> = {}): KolomModul => ({ nama, label, tipe: 'teks', alias, ...extra });

export const MODUL: Record<string, ModulInput> = {
  cop: {
    kunci: 'cop',
    label: 'COP (kedatangan kapal)',
    tabel: 'kegiatan_cop',
    kolomTanggal: 'tgl_kedatangan',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_kapal',
    wilayahBoleh: WILKER_KAPAL,
    peranBoleh: ['admin', 'petugas'],
    negaraDariMaster: true,
    kolomDaftar: ['tgl_kedatangan', 'wilayah_kerja', 'nama_kapal', 'bendera_kapal', 'pelabuhan_kedatangan', 'negara_kedatangan', 'jml_abk_wna', 'jml_abk_wni'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Induk/Wilker', tipe: 'wilker', wajib: true, alias: ['Wilayah Kerja', 'Wilker', 'Pelabuhan'] },
      T('nama_kapal', 'Nama Kapal', undefined, { wajib: true }),
      T('bendera_kapal', 'Bendera Kapal', ['Bendera']),
      { nama: 'berat_kapal', label: 'Berat', tipe: 'desimal', alias: ['GT', 'Berat Kapal'] },
      T('pelabuhan_kedatangan', 'Pelabuhan Kedatangan'),
      T('negara_kedatangan', 'Negara Kedatangan', ['Negara Asal', 'Negara']),
      { nama: 'tgl_kedatangan', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tgl Kedatangan', 'Tanggal Kedatangan'] },
      T('pelabuhan_berikutnya', 'Pelabuhan Berikutnya'),
      T('kondisi_pelabuhan', 'Kondisi Pelabuhan/Negara'),
      T('bebas_darurat', 'Bebas Darurat'),
      { nama: 'jml_abk_wna', label: 'Jml. ABK WNA', tipe: 'bilangan', alias: ['Jumlah ABK WNA', 'ABK WNA'] },
      { nama: 'jml_abk_wni', label: 'Jml. ABK WNI', tipe: 'bilangan', alias: ['Jumlah ABK WNI', 'ABK WNI'] },
      { nama: 'jml_penumpang_wna', label: 'Jml. Penumpang WNA', tipe: 'bilangan', alias: ['Jumlah Penumpang WNA', 'Penumpang WNA'] },
      { nama: 'jml_penumpang_wni', label: 'Jml. Penumpang WNI', tipe: 'bilangan', alias: ['Jumlah Penumpang WNI', 'Penumpang WNI'] },
      { nama: 'tgl_terbit', label: 'Tanggal Terbit', tipe: 'tanggal', arsip: true },
      { nama: 'jam_terbit', label: 'Jam Terbit', tipe: 'waktu', arsip: true },
      T('nama_petugas', 'Nama Petugas', undefined, { arsip: true }),
      { nama: 'tgl_published', label: 'Tanggal Published', tipe: 'tanggalwaktu', arsip: true },
      T('qr_code', 'QR Code', undefined, { arsip: true, maks: 100 }),
      T('nama_wajib_bayar', 'Nama Wajib Bayar', undefined, { arsip: true }),
      { nama: 'jumlah_bayar', label: 'Jumlah Bayar', tipe: 'desimal', arsip: true },
      // ---- diisi manual petugas ----
      { nama: 'rba', label: 'RBA', tipe: 'rba', manual: true, pilihan: PILIHAN_RBA, alias: ['Risk Based Assessment'] },
      T('faktor_risiko', 'Faktor Risiko', undefined, { manual: true, pilihan: ['Tidak Ditemukan'] }),
      T('daerah_terjangkit', 'Daerah Terjangkit', undefined, { manual: true, pilihan: ['Ya', 'Tidak'] }),
      T('kelengkapan_dokumen', 'Kelengkapan Dokumen', undefined, { manual: true, pilihan: ['Lengkap', 'Tidak Lengkap'] }),
      T('orang_sakit', 'Orang Sakit', undefined, { manual: true, pilihan: ['Tidak Ada', 'Ada'] }),
      T('keberadaan_vektor', 'Keberadaan Vektor', undefined, { manual: true, pilihan: ['Ada', 'Tidak Ada'] }),
      T('sanitasi', 'Sanitasi', undefined, { manual: true, pilihan: ['Baik', 'Tidak Baik'] }),
    ],
  },
  phqc: {
    kunci: 'phqc',
    label: 'PHQC (keberangkatan kapal)',
    tabel: 'kegiatan_phqc',
    kolomTanggal: 'tgl_keberangkatan',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_kapal',
    wilayahBoleh: WILKER_KAPAL,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tgl_keberangkatan', 'wilayah_kerja', 'nama_kapal', 'bendera', 'pelabuhan_kedatangan', 'pelabuhan_tujuan', 'jml_abk_wna', 'jml_abk_wni', 'jml_penumpang_wna', 'jml_penumpang_wni'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Induk/Wilker', tipe: 'wilker', wajib: true, alias: ['Wilayah Kerja', 'Wilker', 'Pelabuhan'] },
      T('nama_balai', 'Nama Balai Karkes', undefined, { arsip: true }),
      T('no_imo', 'No Registrasi/IMO No', ['IMO', 'No IMO'], { arsip: true, maks: 50 }),
      T('nama_kapal', 'Nama Kapal', undefined, { wajib: true }),
      T('jenis_kapal', 'Jenis Kapal', undefined, { arsip: true, maks: 100 }),
      T('bendera', 'Bendera Kapal', ['Bendera']),
      { nama: 'berat_kapal', label: 'Berat', tipe: 'desimal', alias: ['GT', 'Berat Kapal'], arsip: true },
      T('pelabuhan_kedatangan', 'Pelabuhan Kedatangan'),
      T('pelabuhan_tujuan', 'Pelabuhan Berikutnya', ['Pelabuhan Tujuan']),
      // Tanggal keberangkatan = tanggal terbit PHQC (PHQC diterbitkan saat kapal berangkat). Lihat catatan di docs.
      { nama: 'tgl_keberangkatan', label: 'Tanggal Terbit', tipe: 'tanggal', wajib: true, alias: ['Tgl Keberangkatan', 'Tanggal Keberangkatan', 'Tanggal'] },
      { nama: 'jam_terbit', label: 'Jam Terbit', tipe: 'waktu', arsip: true },
      { nama: 'jml_abk_wna', label: 'Jml. ABK WNA', tipe: 'bilangan', alias: ['Jumlah ABK WNA', 'ABK WNA'] },
      { nama: 'jml_abk_wni', label: 'Jml. ABK WNI', tipe: 'bilangan', alias: ['Jumlah ABK WNI', 'ABK WNI'] },
      { nama: 'jml_penumpang_wna', label: 'Jml. Penumpang WNA', tipe: 'bilangan', alias: ['Jumlah Penumpang WNA', 'Penumpang WNA'] },
      { nama: 'jml_penumpang_wni', label: 'Jml. Penumpang WNI', tipe: 'bilangan', alias: ['Jumlah Penumpang WNI', 'Penumpang WNI'] },
      T('nama_penerbit', 'Nama Penerbit', undefined, { arsip: true }),
      { nama: 'berlaku_sampai', label: 'Berlaku Sampai Tanggal', tipe: 'tanggal', arsip: true },
      T('nama_petugas', 'Nama Petugas', undefined, { arsip: true }),
      { nama: 'keterangan', label: 'Keterangan', tipe: 'teks', arsip: true, maks: 5000 },
      { nama: 'tgl_published', label: 'Tanggal Published', tipe: 'tanggalwaktu', arsip: true },
      T('qr_code', 'QR Code', undefined, { arsip: true, maks: 100 }),
      T('kode_billing', 'Kode Billing', undefined, { arsip: true, maks: 100 }),
      T('nama_wajib_bayar', 'Nama Wajib Bayar', undefined, { arsip: true }),
      T('ntpn', 'NTPN', undefined, { arsip: true, maks: 100 }),
      T('ntb', 'NTB', undefined, { arsip: true, maks: 100 }),
      { nama: 'jam_bayar', label: 'Jam Bayar', tipe: 'tanggalwaktu', arsip: true },
      { nama: 'jumlah_bayar', label: 'Jumlah Bayar', tipe: 'desimal', arsip: true },
      // ---- diisi manual petugas ----
      { nama: 'rba', label: 'RBA', tipe: 'rba', manual: true, pilihan: PILIHAN_RBA, alias: ['Risk Based Assessment'] },
      T('tujuan_berlayar', 'Tujuan Berlayar', undefined, { manual: true, pilihan: ['Dalam Negeri', 'Luar Negeri'] }),
    ],
  },

  // ------------------------------------------------------------------------------------------
  // Dokumen/sertifikat kapal dan air dari Sinkarkes. Tanggal terbit menentukan tahun dan bulan data.
  // Tabel: schema/mariadb/07_modul_sertifikat.sql. Kolom wilayah menerima juga judul "Nama KKP",
  // "Nama Balai Karkes", dan "KKP Induk/Wilker" (isinya nama wilayah kerja, mis. "Pelabuhan Laut Sangatta").
  // ------------------------------------------------------------------------------------------
  sscec: {
    kunci: 'sscec',
    label: 'SSCEC',
    tabel: 'sertifikat_sscec',
    kolomTanggal: 'tgl_terbit',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_kapal',
    kolomKunciTambahan: ['nomor_barcode'],
    wilayahBoleh: SEMUA_WILKER,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tgl_terbit', 'wilayah_kerja', 'nama_kapal', 'nomor_barcode', 'berat_gt', 'bendera', 'nama_wajib_bayar', 'tgl_bayar', 'jumlah_bayar'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Induk/Wilker', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
      T('nama_kapal', 'Nama Kapal', undefined, { wajib: true }),
      T('nomor_barcode', 'Nomor Barcode', ['No Barcode', 'Barcode'], { maks: 100 }),
      { nama: 'berat_gt', label: 'Berat (GT)', tipe: 'desimal', alias: ['Berat', 'GT', 'Berat GT'] },
      T('bendera', 'Bendera', ['Bendera Kapal']),
      T('palka', 'Pada waktu diperiksa, palka-palka', ['Palka', 'Palka-palka'], { maks: 500 }),
      T('berat_palka', 'Berat Palka'),
      { nama: 'tgl_periksa', label: 'Tanggal Pemeriksaan', tipe: 'tanggal', alias: ['Tanggal', 'Tgl Pemeriksaan'] },
      T('pencatat_pemeriksaan', 'Mencatat Pemeriksaan', ['Pencatat Pemeriksaan']),
      { nama: 'tgl_terbit', label: 'Tanggal Terbit', tipe: 'tanggal', wajib: true, alias: ['Tgl Terbit', 'Diterbitkan Tanggal'] },
      T('nama_wajib_bayar', 'Nama Wajib Bayar', ['Wajib Bayar']),
      { nama: 'tgl_bayar', label: 'Tanggal Bayar', tipe: 'tanggal', alias: ['Tgl Bayar'] },
      { nama: 'jumlah_bayar', label: 'Jumlah Bayar', tipe: 'desimal', alias: ['Jumlah', 'PNBP'] },
    ],
  },
  p3k: {
    kunci: 'p3k',
    label: 'P3K Kapal',
    tabel: 'sertifikat_p3k',
    kolomTanggal: 'tgl_terbit',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_kapal',
    kolomKunciTambahan: ['qr_code'],
    wilayahBoleh: SEMUA_WILKER,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tgl_terbit', 'wilayah_kerja', 'nama_kapal', 'bendera', 'berat', 'petugas_pemeriksa', 'nip', 'nama_wajib_bayar', 'jumlah_bayar'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Induk/Wilker', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
      T('nama_kapal', 'Nama Kapal', undefined, { wajib: true }),
      T('bendera', 'Bendera Kapal', ['Bendera']),
      { nama: 'berat', label: 'Berat', tipe: 'desimal', alias: ['Berat (GT)', 'GT'] },
      { nama: 'tgl_terbit', label: 'Diterbitkan Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tanggal Terbit', 'Tgl Terbit'] },
      { nama: 'tgl_published', label: 'Tanggal Published', tipe: 'tanggalwaktu', alias: ['Tgl Published'] },
      T('petugas_pemeriksa', 'Petugas Pemeriksa', ['Pemeriksa']),
      T('nip', 'NIP', undefined, { maks: 50 }),
      T('qr_code', 'QR Code', ['QRCode', 'Kode QR'], { maks: 100 }),
      T('nama_wajib_bayar', 'Nama Wajib Bayar', ['Wajib Bayar']),
      { nama: 'jumlah_bayar', label: 'Jumlah Bayar', tipe: 'desimal', alias: ['Jumlah', 'PNBP'] },
    ],
  },
  air: {
    kunci: 'air',
    label: 'Sertifikat Air',
    tabel: 'sertifikat_air',
    kolomTanggal: 'tgl_terbit',
    kolomWilayah: 'wilayah_kerja',
    // Di laporan Sinkarkes tidak ada kolom nama kapal; nama kapal ada di Sample ID.
    kolomKunci: 'sample_id',
    kolomKunciTambahan: ['nama_perusahaan', 'sebagai'],
    wilayahBoleh: SEMUA_WILKER,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tgl_terbit', 'wilayah_kerja', 'nama_perusahaan', 'sample_id', 'lokasi_pengambilan', 'jenis_penampungan', 'tgl_pengambilan', 'tgl_analisis', 'kesimpulan', 'sebagai', 'berlaku_sampai', 'jumlah_bayar'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Induk/Wilker', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
      T('nama_perusahaan', 'Nama Perusahaan', ['Perusahaan'], { wajib: true }),
      T('lokasi_pengambilan', 'Lokasi Pengambilan', undefined, { maks: 500 }),
      T('jenis_penampungan', 'Jenis penampungan'),
      T('penampungan_lainnya', 'Lainnya'),
      T('volume_sampel', 'Volume Sampel', undefined, { maks: 100 }),
      { nama: 'tgl_pengambilan', label: 'Tanggal pengambilan', tipe: 'tanggal', alias: ['Tgl Pengambilan'] },
      { nama: 'tgl_analisis', label: 'Tanggal Analisis', tipe: 'tanggal', alias: ['Tgl Analisis'] },
      { nama: 'jam_analisis', label: 'Jam Analisis', tipe: 'waktu' },
      T('sample_id', 'Sample ID', ['ID Sampel', 'Sampel ID']),
      T('kesimpulan', 'Kesimpulan', ['Hasil'], { maks: 1000 }),
      T('sebagai', 'Sebagai'),
      T('tempat_terbit', 'Tempat terbit'),
      { nama: 'tgl_terbit', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tanggal Terbit', 'Tgl Terbit', 'Diterbitkan Tanggal'] },
      { nama: 'berlaku_sampai', label: 'Berlaku sampai', tipe: 'tanggal', alias: ['Berlaku Sampai Dengan', 'Masa Berlaku'] },
      { nama: 'jumlah_bayar', label: 'Jumlah Bayar', tipe: 'desimal', alias: ['Jumlah', 'PNBP'] },
    ],
  },
  buku_kesehatan: {
    kunci: 'buku_kesehatan',
    label: 'Buku Kesehatan',
    tabel: 'buku_kesehatan',
    kolomTanggal: 'tgl_terbit',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_kapal',
    kolomKunciTambahan: ['qr_code'],
    wilayahBoleh: SEMUA_WILKER,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tgl_terbit', 'wilayah_kerja', 'nama_kapal', 'bendera', 'berat', 'pemilik', 'e_healthbook', 'nama_wajib_bayar', 'jumlah_bayar'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Induk/Wilker', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
      T('qr_code', 'QR Code', ['QRCode', 'Kode QR'], { maks: 100 }),
      T('e_healthbook', 'e-Healthbook', ['eHealthbook', 'Nomor e-Healthbook'], { maks: 100 }),
      T('nama_kapal', 'Nama Kapal', undefined, { wajib: true }),
      T('bendera', 'Bendera Kapal', ['Bendera']),
      { nama: 'berat', label: 'Berat', tipe: 'desimal', alias: ['Berat (GT)', 'GT'] },
      T('pemilik', 'Pemilik', ['Nama Pemilik']),
      { nama: 'tgl_terbit', label: 'Diterbitkan Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tanggal Terbit', 'Tgl Terbit'] },
      T('nama_wajib_bayar', 'Nama Wajib Bayar', ['Wajib Bayar']),
      { nama: 'jumlah_bayar', label: 'Jumlah Bayar', tipe: 'desimal', alias: ['Jumlah', 'PNBP'] },
    ],
  },
};

export const DAFTAR_MODUL = Object.values(MODUL);

export function dapatkanModul(kunci: string): ModulInput | undefined {
  return Object.prototype.hasOwnProperty.call(MODUL, kunci) ? MODUL[kunci] : undefined;
}

/** Bentuk penyimpanan wilayah di tabel kegiatan_* saat ini: nama pendek tanpa spasi ("TanjungSantan").
 *  Dibakukan menjadi kode WK pada langkah B-2 (lihat docs/MIGRASI_MARIADB.md). */
export function wilayahTersimpan(kode: KodeWilker): string {
  const w = WILAYAH_KERJA.find((x) => x.kode === kode);
  return (w?.namaPendek ?? kode).replace(/\s+/g, '');
}

/** Kebalikannya, untuk filter di daftar; teks tak dikenal -> null. */
export function kodeDariTersimpan(teks: string | null | undefined): KodeWilker | null {
  return kodeDariTeks(teks);
}

/** Normalisasi judul kolom Excel: huruf kecil, hanya huruf/angka. "Tgl. Kedatangan " -> "tglkedatangan". */
export function kunciJudul(teks: string): string {
  return teks.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
