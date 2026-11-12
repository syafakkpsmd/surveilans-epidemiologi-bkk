// lib/input-data/modul.ts
// Konfigurasi modul input data + unggah Excel. MURNI (tanpa database / exceljs) sehingga aman
// dipakai komponen 'use client'. Menambah modul baru = menambah satu entri di MODUL.
import type { JenisWilker, KamusWilker, Wilayah } from '@/lib/wilayah-kerja';
import type { KunciModulWilker } from '@/lib/wilayah-kerja/modul';
import { BUTIR, SEKSI, namaKolomButir } from '@/lib/limbah-b3/butir';
import { PARAMETER, NAMA_KELOMPOK, kolomDb } from '@/lib/udara-ruang/parameter';
import { statusEvaluasi } from '@/lib/udara-ruang/hitung';
import { KOLOM_LAMA, TABEL_UDARA } from '@/lib/udara-ruang/skema';
import { MODUL_KLINIK } from './modul-klinik';
import { MODUL_SKLT } from './modul-sklt';
import { MODUL_KIER } from './modul-kier';
import { MODUL_IZIN_JENAZAH } from './modul-izin-jenazah';
import { MODUL_OMKABA } from './modul-omkaba';

/** 'ya_tidak' = butir formulir pemeriksaan: Ya / Tidak / N/A (kosong = belum dinilai). */
export type TipeKolom = 'teks' | 'bilangan' | 'desimal' | 'tanggal' | 'tanggalwaktu' | 'waktu' | 'rba' | 'wilker' | 'ya_tidak';

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
  /** Kolom 'teks': buang SEMUA spasi (mis. nomor surat Sinkarkes). */
  tanpaSpasi?: boolean;
  /** Teks panjang yang ditampilkan di FORM (mis. kalimat pertanyaan butir); judul kolom Excel tetap `label` yang ringkas. */
  deskripsi?: string;
  /** Judul kelompok di form: muncul sebagai subjudul setiap kali kelompok berganti. */
  kelompok?: string;
  /** Kolom 'desimal'/'bilangan': rentang yang masuk akal [min, maks]. Di luar rentang ditolak ("periksa satuan/salah ketik"). */
  batasNilai?: [number, number];
  /** Kolom 'tanggal' berisi TANGGAL LAHIR: dibaca dengan tahun 1920 sampai tahun ini (kolom tanggal biasa: 2000 sampai tahun depan). Tanggal lahir di masa depan ditolak. */
  tanggalLahir?: boolean;
  /** Kolom TURUNAN: nilainya dihitung dari kolom lain saat validasi (tidak ada di form/Excel). Mis. label Lokasi untuk Karhutla. */
  turunan?: (n: Record<string, string | number | null>) => string | number | null;
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
  /** Jenis wilayah kerja yang boleh pada modul ini; daftar wilayahnya diambil dari wilker_ref (yang aktif), bukan ditulis di sini. */
  jenisWilayahBoleh: JenisWilker[];
  kolom: KolomModul[];
  /** Kolom yang ditampilkan di daftar data (kolom manual selalu ditambahkan di belakang). */
  kolomDaftar: string[];
  /** Peran yang boleh menambah/mengunggah/mengisi. Hapus selalu khusus admin. */
  peranBoleh: ('admin' | 'petugas' | 'petugas_klinik')[];
  /** Isi negara_kedatangan dari master pelabuhan (hanya COP). */
  negaraDariMaster?: boolean;

  // ---- opsi untuk modul sanitasi (TPP/TTU/PAB); modul lama tidak perlu mengisinya ----
  /** Kunci di wilker_modul (lib/wilayah-kerja/modul.ts). Bila diisi, wilayah yang boleh = yang dicentang admin untuk modul ini,
   *  jadi BKK lain cukup mengubah centang di pengaturan wilayah kerja, tanpa menyentuh kode. */
  kunciWilker?: KunciModulWilker;
  /** DIISI SAAT RUNTIME oleh route (modulEfektif) dari wilker_modul. Jangan ditulis di MODUL. */
  kodeWilkerBoleh?: string[];
  /** Baca kolom tanggal Excel lewat parseTanggal + tentukanUrutanKolom (dd/mm/yyyy, serial Excel, "9 Januari 2026", dst.). */
  pakaiParseTanggal?: boolean;
  /** Simpan wilayah_kerja = nama pendek APA ADANYA ("Tanjung Santan"), sama dengan filter di dasbor. Bawaan: tanpa spasi. */
  wilayahDenganSpasi?: boolean;
  siapkanBaris?: (mentah: Record<string, unknown>) => Record<string, unknown>;
  kolomHasilSiapkan?: Record<string, string[]>;
  /** Kolom berkas yang hanya DIBACA untuk siapkanBaris (tidak disimpan, tidak ada di form/template): kunci -> judul yang dikenali. */
  kolomBantu?: Record<string, string[]>;
  /** Sebutan kolom kunci untuk teks di layar ("nama kapal" bila kosong). */
  namaKunci?: string;
  }

/** Modul kapal (COP/PHQC): hanya pelabuhan. Modul lain: pelabuhan dan bandara. */
const JENIS_KAPAL: JenisWilker[] = ['Pelabuhan'];
const JENIS_SEMUA: JenisWilker[] = ['Pelabuhan', 'Bandara'];
/** Modul sanitasi: semua jenis. Pembatas sebenarnya adalah centang wilker_modul (kunciWilker), bukan jenis. */
const JENIS_LENGKAP: JenisWilker[] = ['Pelabuhan', 'Bandara', 'Kantor'];
/** Judul kolom wilayah yang diterima pada ekspor Sinkarkes (isinya nama wilayah kerja). */
const ALIAS_WILKER = ['Wilayah Kerja', 'Wilker', 'Pelabuhan', 'Nama KKP', 'KKP', 'Nama Balai Karkes', 'KKP Induk/Wilker', 'KKP Induk'];

export const PILIHAN_RBA = ['Hijau', 'Kuning', 'Merah'];
/** Label tampilan; nilai tersimpan tetap Hijau/Kuning/Merah (dipakai view dan dasbor). */
export const LABEL_RBA: Record<string, string> = { Hijau: 'Rendah (Hijau)', Kuning: 'Sedang (Kuning)', Merah: 'Tinggi (Merah)' };

const T = (nama: string, label: string, alias?: string[], extra: Partial<KolomModul> = {}): KolomModul => ({ nama, label, tipe: 'teks', alias, ...extra });

export const MODUL: Record<string, ModulInput> = {
  ...MODUL_KLINIK, // HIV (VCT), TB (skrining), Migrasi Malaria: lib/input-data/modul-klinik.ts
  ...MODUL_SKLT, // SKLT (Surat Keterangan Laik Terbang): lib/input-data/modul-sklt.ts
  ...MODUL_KIER, // KIER Kesehatan: lib/input-data/modul-kier.ts
  ...MODUL_IZIN_JENAZAH, // Izin Jenazah: lib/input-data/modul-izin-jenazah.ts
  ...MODUL_OMKABA, // Lalu Lintas OMKABA: lib/input-data/modul-omkaba.ts
  cop: {
    kunci: 'cop',
    label: 'COP (kedatangan kapal)',
    tabel: 'kegiatan_cop',
    kolomTanggal: 'tgl_kedatangan',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_kapal',
    kolomKunciTambahan: ['qr_code'],
    jenisWilayahBoleh: JENIS_KAPAL,
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
    kolomKunciTambahan: ['qr_code'],
    jenisWilayahBoleh: JENIS_KAPAL,
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
  // Tabel: schema/postgres/07_modul_sertifikat.sql. Kolom wilayah menerima juga judul "Nama KKP",
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
    jenisWilayahBoleh: JENIS_SEMUA,
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
    jenisWilayahBoleh: JENIS_SEMUA,
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
    jenisWilayahBoleh: JENIS_SEMUA,
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
      { nama: 'tgl_terbit', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tanggal Terbit', 'Tgl Terbit', 'Diterbitkan Tanggal', 'Tanggal Inspeksi', 'Tgl Inspeksi'] },
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
    jenisWilayahBoleh: JENIS_SEMUA,
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

  // ------------------------------------------------------------------------------------------
  // Modul sanitasi. Tabel: schema/postgres/08_modul_tpp_ttu_pab.sql.
  // Judul kolom Excel diterima dalam bentuk label, nama kolom (snake_case, "hy-rise" = "hy_rise"), atau alias.
  // ------------------------------------------------------------------------------------------
  tpp: {
    kunci: 'tpp',
    label: 'TPP (Tempat Pengolahan Pangan)',
    tabel: 'tpp',
    kolomTanggal: 'tanggal_kegiatan',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_tpp',
    namaKunci: 'nama TPP',
    kunciWilker: 'tpp',
    pakaiParseTanggal: true,
    wilayahDenganSpasi: true,
    jenisWilayahBoleh: JENIS_LENGKAP,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tanggal_kegiatan', 'wilayah_kerja', 'nama_tpp', 'jumlah_sampel', 'inspeksi_kesehatan_lingkungan', 'formaldehyde', 'borax', 'metyl_yellow', 'rodamin_b', 'bakteriologis', 'hy_rise'],
    kolom: [
      { nama: 'tanggal_kegiatan', label: 'Tanggal Kegiatan', tipe: 'tanggal', wajib: true, alias: ['Tanggal', 'Tgl Kegiatan'] },
      { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
      T('nama_tpp', 'Nama TPP', ['Nama Tempat Pengolahan Pangan', 'TPP'], { wajib: true }),
      { nama: 'jumlah_sampel', label: 'Jumlah Sampel', tipe: 'bilangan', alias: ['Sampel'] },
      T('inspeksi_kesehatan_lingkungan', 'Inspeksi Kesehatan Lingkungan', ['IKL']),
      T('formaldehyde', 'Formaldehyde', ['Formalin'], { maks: 100 }),
      T('borax', 'Borax', ['Boraks'], { maks: 100 }),
      T('metyl_yellow', 'Metyl Yellow', ['Methanyl Yellow'], { maks: 100 }),
      T('rodamin_b', 'Rodamin B', ['Rhodamin B'], { maks: 100 }),
      T('bakteriologis', 'Bakteriologis', undefined, { maks: 100 }),
      T('hy_rise', 'Hy-Rise', ['Hyrise', 'Hy Rise'], { maks: 100 }),
      T('keterangan', 'Keterangan', undefined, { maks: 5000 }),
    ],
  },
  ttu: {
    kunci: 'ttu',
    label: 'TTU (Tempat-Tempat Umum)',
    tabel: 'ttu',
    kolomTanggal: 'tanggal',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_ttu',
    namaKunci: 'nama TTU',
    kunciWilker: 'ttu',
    pakaiParseTanggal: true,
    wilayahDenganSpasi: true,
    jenisWilayahBoleh: JENIS_LENGKAP,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tanggal', 'wilayah_kerja', 'nama_ttu', 'hasil'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
      // "nata_ttu" = salah ketik judul pada sheet contoh; diterima agar berkas lama tetap terbaca.
      T('nama_ttu', 'Nama TTU', ['nata_ttu', 'Nama Tempat Umum', 'TTU'], { wajib: true }),
      { nama: 'tanggal', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tgl', 'Tanggal Kegiatan'] },
      T('lingkungan_luar_halaman', 'Lingkungan Luar/Halaman', ['Lingkungan Luar Halaman']),
      T('ruang_bangunan', 'Ruang Bangunan'),
      T('penyehatan_air', 'Penyehatan Air'),
      T('penyehatan_udara_ruang', 'Penyehatan Udara Ruang'),
      T('pengelolaan_limbah', 'Pengelolaan Limbah'),
      T('pencahayaan', 'Pencahayaan'),
      T('kebisingan', 'Kebisingan'),
      T('getaran_diruang_kerja', 'Getaran di Ruang Kerja', ['Getaran', 'Getaran Ruang Kerja']),
      T('pengendalian_vektor_penyakit', 'Pengendalian Vektor Penyakit', ['Pengendalian Vektor']),
      T('instalasi', 'Instalasi'),
      T('pemeliharaan_jamban_kamar_mandi', 'Pemeliharaan Jamban & Kamar Mandi', ['Jamban dan Kamar Mandi', 'Jamban Kamar Mandi']),
      T('hasil', 'Hasil', ['Kesimpulan', 'Status']),
    ],
  },
  pab: {
    kunci: 'pab',
    label: 'PAB (Penyediaan Air Bersih)',
    tabel: 'pab',
    kolomTanggal: 'tanggal',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_ttu',
    namaKunci: 'nama PAB',
    kunciWilker: 'pab',
    pakaiParseTanggal: true,
    wilayahDenganSpasi: true,
    jenisWilayahBoleh: JENIS_LENGKAP,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tanggal', 'wilayah_kerja', 'nama_ttu', 'jumlah_pab_diperiksa', 'fisik', 'kimia', 'bakteriologis', 'status'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
      T('nama_ttu', 'Nama PAB', ['nata_ttu', 'Nama TTU', 'Nama Tempat Penyediaan Air', 'PAB'], { wajib: true }),
      { nama: 'tanggal', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tgl', 'Tanggal Kegiatan'] },
      { nama: 'jumlah_pab_diperiksa', label: 'Jumlah PAB Diperiksa', tipe: 'bilangan', alias: ['Jumlah PAB', 'Jml PAB Diperiksa'] },
      T('fisik', 'Fisik', undefined, { maks: 100 }),
      T('kimia', 'Kimia', undefined, { maks: 100 }),
      T('bakteriologis', 'Bakteriologis', undefined, { maks: 100 }),
      T('status', 'Status', ['Hasil'], { maks: 100 }),
      T('keterangan', 'Keterangan', undefined, { maks: 5000 }),
    ],
  },

  // ------------------------------------------------------------------------------------------
  // Pemeriksaan pengelolaan limbah B3 klinik. Isi formulir (33 butir, 5 seksi) ada di lib/limbah-b3/butir.ts.
  // Tabel: schema/postgres/09_modul_limbah_b3.sql. Satu baris = satu pemeriksaan satu klinik pada satu tanggal.
  // ------------------------------------------------------------------------------------------
  limbah_b3: {
    kunci: 'limbah_b3',
    label: 'Limbah B3 Klinik',
    tabel: 'limbah_b3',
    kolomTanggal: 'tanggal_pemeriksaan',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_klinik',
    namaKunci: 'nama klinik',
    kunciWilker: 'limbah_b3',
    pakaiParseTanggal: true,
    wilayahDenganSpasi: true,
    jenisWilayahBoleh: JENIS_LENGKAP,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tanggal_pemeriksaan', 'wilayah_kerja', 'nama_klinik', 'jenis_layanan', 'nama_pemeriksa', 'batas_waktu_tindak_lanjut'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER, kelompok: 'Identitas pemeriksaan' },
      T('nama_klinik', 'Nama Klinik', ['Klinik'], { wajib: true }),
      T('alamat', 'Alamat/Lokasi', ['Alamat', 'Lokasi'], { maks: 500 }),
      { nama: 'tanggal_pemeriksaan', label: 'Tanggal Pemeriksaan', tipe: 'tanggal', wajib: true, alias: ['Tanggal', 'Tgl Pemeriksaan'] },
      T('nama_penanggung_jawab', 'Nama Penanggung Jawab', ['Penanggung Jawab']),
      T('nama_pemeriksa', 'Nama Pemeriksa', ['Pemeriksa']),
      T('jenis_layanan', 'Jenis Layanan Klinik', ['Jenis Layanan']),
      // ---- 33 butir: item_01 ... item_33. Judul Excel "Butir 1" (alias: nama kolom, B1, "Butir 01", kalimat pertanyaan) ----
      ...BUTIR.map((b): KolomModul => ({
        nama: namaKolomButir(b.no),
        label: `Butir ${b.no}`,
        tipe: 'ya_tidak',
        alias: [`Butir ${String(b.no).padStart(2, '0')}`, `B${b.no}`, b.teks],
        deskripsi: `${b.no}. ${b.teks}`,
        kelompok: `${b.seksi}. ${SEKSI.find((s) => s.huruf === b.seksi)?.nama ?? ''}`,
      })),
      { nama: 'catatan_item', label: 'Catatan/Bukti', tipe: 'teks', maks: 5000, alias: ['Catatan', 'Bukti', 'Catatan Bukti'], kelompok: 'Ringkasan temuan dan rekomendasi',
        deskripsi: 'Catatan/bukti per butir (tulis nomor butirnya, mis. "12: APD tidak lengkap; 27: manifest belum ada")' },
      T('temuan_utama', 'Temuan Utama', undefined, { maks: 5000 }),
      T('rekomendasi', 'Rekomendasi/Tindakan Perbaikan', ['Rekomendasi', 'Tindakan Perbaikan'], { maks: 5000 }),
      { nama: 'batas_waktu_tindak_lanjut', label: 'Batas Waktu Tindak Lanjut', tipe: 'tanggal', alias: ['Batas Waktu'] },
      // ---- diisi manual petugas setelah data masuk (dropdown di daftar) ----
      T('status_tindak_lanjut', 'Status Tindak Lanjut', ['Status'], { manual: true, pilihan: ['Belum', 'Dalam proses', 'Selesai'], maks: 50 }),
    ],
  },

  // ------------------------------------------------------------------------------------------
  // Pemeriksaan udara dalam ruang. Menulis LANGSUNG ke tabel Karhutla (TABEL_UDARA), jadi satu kali entri tampil di Karhutla juga.
  // Kolom Karhutla yang sudah ada dipakai apa adanya; kolom baru ditambahkan oleh schema/postgres/10_modul_udara_ruang.sql.
  // Nama tabel/kolom lama: lib/udara-ruang/skema.ts. Parameter dan baku mutu: lib/udara-ruang/parameter.ts.
  // ------------------------------------------------------------------------------------------
  udara_ruang: {
    kunci: 'udara_ruang',
    label: 'Udara Dalam Ruang',
    tabel: TABEL_UDARA,
    kolomTanggal: KOLOM_LAMA.tanggal,
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'nama_ruangan',
    namaKunci: 'nama ruangan',
    kunciWilker: 'udara_ruang',
    pakaiParseTanggal: true,
    wilayahDenganSpasi: true,
    jenisWilayahBoleh: JENIS_LENGKAP,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: [KOLOM_LAMA.tanggal, 'wilayah_kerja', 'nama_pelabuhan', 'nama_gedung', 'nama_ruangan', KOLOM_LAMA.pm25, KOLOM_LAMA.pm10, KOLOM_LAMA.suhu, KOLOM_LAMA.kelembapan, KOLOM_LAMA.hcho, KOLOM_LAMA.tvoc],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Wilayah Kerja BKK', tipe: 'wilker', wajib: true, alias: ['Wilayah Kerja', 'Wilker', 'Wilayah Kerja BKK', 'Induk/Wilker'], kelompok: 'A. Identitas pemeriksaan' },
      T('nama_pelabuhan', 'Nama Pelabuhan/Bandara', ['Nama Pelabuhan', 'Nama Bandara']),
      T('nama_gedung', 'Nama Gedung/Bangunan', ['Nama Gedung', 'Gedung']),
      T('nama_ruangan', 'Nama Ruangan', ['Ruangan'], { wajib: true }),
      T('fungsi_ruangan', 'Fungsi Ruangan'),
      { nama: KOLOM_LAMA.tanggal, label: 'Tanggal Pemeriksaan', tipe: 'tanggal', wajib: true, alias: ['Tanggal', 'Tgl Pemeriksaan'] },
      { nama: 'waktu_pemeriksaan', label: 'Waktu Pemeriksaan', tipe: 'waktu', alias: ['Waktu', 'Jam'] },
      T('nama_pemeriksa', 'Petugas Pemeriksa', ['Nama Pemeriksa', 'Pemeriksa']),
      T('penanggung_jawab', 'Penanggung Jawab Lokasi', ['Penanggung Jawab']),
      T('kondisi_ruangan', 'Kondisi Ruangan Saat Pemeriksaan', ['Kondisi Ruangan']),
      // ---- parameter (hasil ukur). Judul Excel = "Nama (satuan)"; nama polos, kunci, dan nama kolom juga diterima ----
      ...PARAMETER.map((p): KolomModul => ({
        nama: kolomDb(p.kunci),
        label: `${p.nama} (${p.satuan})`,
        tipe: 'desimal',
        alias: [p.nama, p.kunci, ...(p.aliasTambahan ?? [])],
        deskripsi: `${p.nama} (${p.satuan}) — acuan: ${p.acuan}`,
        kelompok: NAMA_KELOMPOK[p.kelompok],
        batasNilai: p.rentangWajar,
      })),
      { nama: 'keterangan_parameter', label: 'Keterangan Parameter', tipe: 'teks', maks: 5000, alias: ['Keterangan'], kelompok: 'D. Kesimpulan dan rekomendasi' },
      { nama: 'kesimpulan', label: 'Kesimpulan Pemeriksaan', tipe: 'teks', maks: 5000, alias: ['Kesimpulan'] },
      { nama: 'rekomendasi', label: 'Rekomendasi/Tindak Lanjut', tipe: 'teks', maks: 5000, alias: ['Rekomendasi', 'Tindak Lanjut'] },
      { nama: 'catatan', label: 'Catatan Tambahan', tipe: 'teks', maks: 5000, alias: ['Catatan'] },
      // Label "Lokasi" yang dibaca dasbor Karhutla ("Samarinda (Pelabuhan Umum)", dst.): diturunkan, tidak diketik dua kali.
      {
        nama: KOLOM_LAMA.lokasi, label: 'Lokasi (label Karhutla)', tipe: 'teks', arsip: true,
        turunan: (n) => (n.nama_pelabuhan as string | null) || (n.wilayah_kerja as string | null) || null,

      },
      {
        nama: 'status_evaluasi', label: 'Status Evaluasi (otomatis)', tipe: 'teks', arsip: true,
        turunan: (n) => statusEvaluasi(n),
      },
    ],
  },
// ------------------------------------------------------------------------------------------
  // Rat Guard (pemasangan penghalang tikus pada tali kapal). Satu baris = jumlah kapal per wilayah per tanggal.
  // Tabel LAMA `rat_guard` dipakai apa adanya; dasbor membaca view_rat_guard_bulanan/mingguan, jadi tidak ikut berubah.
  // jumlah_kapal DIHITUNG (pasang + tidak pasang) agar tidak pernah selisih. Kolom tambahan: schema/postgres/11_modul_rat_guard.sql.
  // ------------------------------------------------------------------------------------------
  rat_guard: {
    kunci: 'rat_guard',
    label: 'Rat Guard',
    tabel: 'rat_guard',
    kolomTanggal: 'tanggal',
    kolomWilayah: 'wilayah_kerja',
    // Satu baris per wilayah per tanggal: kolom kunci berisi konstanta 'harian' (turunan) supaya pola kunci modul lain bisa dipakai.
    kolomKunci: 'kunci_harian',
    namaKunci: 'hari',
    kunciWilker: 'rat_guard',
    pakaiParseTanggal: true,
    wilayahDenganSpasi: true,
    jenisWilayahBoleh: JENIS_LENGKAP,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tanggal', 'wilayah_kerja', 'jumlah_kapal', 'pasang', 'tidak_pasang'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
      { nama: 'tanggal', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tgl', 'Tanggal Pemeriksaan', 'Tanggal Kegiatan'] },
      { nama: 'pasang', label: 'Rat Guard Terpasang', tipe: 'bilangan', wajib: true, batasNilai: [0, 1000],
        alias: ['Pasang', 'Terpasang', 'Jumlah Kapal Pasang', 'Kapal Terpasang', 'Memasang Rat Guard'] },
      { nama: 'tidak_pasang', label: 'Rat Guard Tidak Terpasang', tipe: 'bilangan', wajib: true, batasNilai: [0, 1000],
        alias: ['Tidak Pasang', 'Tidak Terpasang', 'Jumlah Kapal Tidak Pasang', 'Kapal Tidak Terpasang', 'Tidak Memasang Rat Guard'] },
      {
        nama: 'jumlah_kapal', label: 'Jumlah Kapal (otomatis)', tipe: 'bilangan', arsip: true,
        turunan: (n) => Number(n.pasang ?? 0) + Number(n.tidak_pasang ?? 0),
      },
      { nama: 'kunci_harian', label: 'Kunci (otomatis)', tipe: 'teks', arsip: true, turunan: () => 'harian' },
    ],
  },
    // ------------------------------------------------------------------------------------------
  // Kasus ISPA harian (Karhutla). Tabel LAMA `ispa_harian` dipakai apa adanya; view_karhutla_ispa_* dan dasbor tidak berubah.
  // Satu baris = satu tanggal + wilayah kerja + zona (zona boleh kosong). kode_wilker diisi trigger dari wilayah_kerja.
  // Kolom tambahan dan trigger: schema/postgres/12_modul_ispa.sql.
  // ------------------------------------------------------------------------------------------
  ispa: {
    kunci: 'ispa',
    label: 'Kasus ISPA (Karhutla)',
    tabel: 'ispa_harian',
    kolomTanggal: 'tanggal',
    kolomWilayah: 'wilayah_kerja',
    kolomKunci: 'kunci_zona',
    namaKunci: 'zona',
    kunciWilker: 'ispa',
    pakaiParseTanggal: true,
    wilayahDenganSpasi: true,
    jenisWilayahBoleh: JENIS_LENGKAP,
    peranBoleh: ['admin', 'petugas'],
    kolomDaftar: ['tanggal', 'wilayah_kerja', 'zona', 'kasus_ispa_anak', 'kasus_ispa_dewasa', 'keterangan'],
    kolom: [
      { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
      { nama: 'tanggal', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tgl', 'Tanggal Kasus', 'Tanggal Kegiatan'] },
      T('zona', 'Zona', ['Lokasi', 'Sub Wilayah', 'Zona Karhutla'], { maks: 100 }),
      { nama: 'kasus_ispa_anak', label: 'Kasus ISPA Anak', tipe: 'bilangan', wajib: true, batasNilai: [0, 100000], alias: ['ISPA Anak', 'Anak'] },
      { nama: 'kasus_ispa_dewasa', label: 'Kasus ISPA Dewasa', tipe: 'bilangan', wajib: true, batasNilai: [0, 100000], alias: ['ISPA Dewasa', 'Dewasa'] },
      T('keterangan', 'Keterangan', ['Catatan'], { maks: 5000 }),
      { nama: 'kunci_zona', label: 'Kunci zona (otomatis)', tipe: 'teks', arsip: true, turunan: (n) => (n.zona ? String(n.zona).trim() : '-') },
    ],
  },
};

export const DAFTAR_MODUL = Object.values(MODUL);

export function dapatkanModul(kunci: string): ModulInput | undefined {
  return Object.prototype.hasOwnProperty.call(MODUL, kunci) ? MODUL[kunci] : undefined;
}

/** Wilayah kerja AKTIF yang boleh dipakai modul ini (menurut jenisnya). Wilayah nonaktif tidak menerima input baru. */
export function wilayahBolehModul(modul: ModulInput, kamus: KamusWilker): Wilayah[] {
  return kamus.aktif.filter(
    (w) => modul.jenisWilayahBoleh.includes(w.jenis) && (!modul.kodeWilkerBoleh || modul.kodeWilkerBoleh.includes(w.kode)),
  );
}

/** Bentuk penyimpanan wilayah di tabel kegiatan_* saat ini: nama pendek tanpa spasi ("TanjungSantan").
 *  Modul sanitasi (wilayahDenganSpasi) menyimpan apa adanya ("Tanjung Santan"), sama dengan yang dibaca dasbor. */
export function wilayahTersimpan(kode: string, kamus: KamusWilker, denganSpasi = false): string {
  const pendek = kamus.dapatkan(kode)?.namaPendek ?? kode;
  return denganSpasi ? pendek.trim() : pendek.replace(/\s+/g, '');
}

/** Kebalikannya, untuk filter di daftar; teks tak dikenal -> null. */
export function kodeDariTersimpan(teks: string | null | undefined, kamus: KamusWilker): string | null {
  return kamus.kodeDariTeks(teks);
}

/** Normalisasi judul kolom Excel: huruf kecil, hanya huruf/angka. "Tgl. Kedatangan " -> "tglkedatangan". */
export function kunciJudul(teks: string): string {
  return teks.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
