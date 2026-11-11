// lib/input-data/modul-omkaba.ts
// Modul input data Lalu Lintas OMKABA (Health Certificate barang ekspor/impor): form + unggah Excel LANGSUNG dari
// "Rekapitulasi Lalu Lintas OMKABA" Sinkarkes (tanpa edit/cleaning) + edit baris. MURNI (aman untuk komponen 'use client').
// Didaftarkan di MODUL (modul.ts) lewat `...MODUL_OMKABA`. Tabel: schema/postgres/13_modul_omkaba.sql.
//
// Kolom Sinkarkes yang TIDAK disimpan (diabaikan otomatis saat membaca berkas): No, alamat dan nomor telepon
// (perusahaan/eksportir/buyer), nama penanggung jawab, Packing List No., Invoice No., semua kolom "Keterangan",
// Tanggal Buyer, QRCode, Kode Billing, NTPN, NTB, Bank/Pos Bayar, Channel Bayar. Judul ganda di berkas
// ("Keterangan", "Penanggung Jawab", "No. Telp / Fax") tidak dipetakan ke kolom mana pun.
import type { JenisWilker } from '@/lib/wilayah-kerja';
import { DAFTAR_DOKUMEN } from '@/lib/omkaba/dokumen';
import type { KolomModul, ModulInput } from './modul';

const JENIS_LENGKAP: JenisWilker[] = ['Pelabuhan', 'Bandara', 'Kantor'];
const ALIAS_WILKER = ['Wilayah Kerja', 'Wilker', 'Nama KKP', 'KKP', 'Nama Balai Karkes', 'KKP Induk/Wilker', 'KKP Induk'];

const T = (nama: string, label: string, alias?: string[], extra: Partial<KolomModul> = {}): KolomModul => ({ nama, label, tipe: 'teks', alias, ...extra });

const omkaba: ModulInput = {
  kunci: 'omkaba',
  label: 'Lalu Lintas OMKABA',
  tabel: 'omkaba_sertifikat',
  kolomTanggal: 'diterbitkan_tanggal',
  kolomWilayah: 'wilayah_kerja',
  // Nomor dokumen unik per sertifikat; unggah ulang berkas yang tumpang tindih memperbarui baris yang sama.
  kolomKunci: 'no_dokumen',
  namaKunci: 'nomor dokumen',
  pakaiParseTanggal: true,
  wilayahDenganSpasi: true,
  jenisWilayahBoleh: JENIS_LENGKAP,
  peranBoleh: ['admin', 'petugas', 'petugas_klinik'],
  kolomDaftar: ['diterbitkan_tanggal', 'wilayah_kerja', 'no_dokumen', 'jenis_layanan', 'nama_eksportir_importir', 'jenis_komoditi', 'negara_tujuan', 'pelabuhan_asal', 'pelabuhan_tujuan', 'nama_kapal', 'health_certificate', 'jumlah_bayar'],
  kolom: [
    { nama: 'wilayah_kerja', label: 'Nama KKP', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER, kelompok: 'Dokumen' },
    T('no_dokumen', 'No Dokumen', ['Nomor Dokumen', 'No Sertifikat'], { wajib: true, maks: 100 }),
    { nama: 'diterbitkan_tanggal', label: 'Diterbitkan Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tanggal Terbit', 'Tgl Terbit', 'Tanggal'] },
    T('jenis_layanan', 'Jenis Layanan', ['Layanan'], { maks: 50 }),
    T('health_certificate', 'Health Certificate', ['Hasil Pemeriksaan'], { maks: 200 }),
    T('petugas_pemeriksa', 'Petugas Pemeriksa', ['Pemeriksa']),

    T('nama_keagenan', 'Nama Keagenan', ['Keagenan'], { kelompok: 'Para pihak' }),
    T('nama_agen', 'Nama Agen', ['Agen']),
    T('nama_eksportir_importir', 'Nama Exportir/Importir', ['Nama Eksportir/Importir', 'Eksportir/Importir', 'Nama Eksportir', 'Nama Importir']),
    T('nama_buyer', 'Nama Buyer', ['Buyer']),

    T('jenis_komoditi', 'Jenis Komoditi', ['Komoditi'], { maks: 100, kelompok: 'Komoditas dan barang' }),
    T('jumlah_komoditi', 'Jumlah Komoditi', undefined, { maks: 100 }),
    T('jenis_barang', 'Jenis Barang/Produk', ['Jenis Barang', 'Jenis Produk'], { maks: 500 }),
    T('jumlah_barang', 'Jumlah Barang/Produk', ['Jumlah Barang', 'Jumlah Produk'], { maks: 100 }),

    ...DAFTAR_DOKUMEN.map((d, i): KolomModul => T(d.kolom, d.label, [d.sinkarkes], { maks: 20, kelompok: i === 0 ? 'Kelengkapan dokumen (Ada / Tidak Ada)' : undefined })),

    T('negara_asal', 'Negara Asal', undefined, { maks: 100, kelompok: 'Pengangkutan' }),
    T('negara_tujuan', 'Negara Tujuan', undefined, { maks: 100 }),
    T('pelabuhan_asal', 'Pelabuhan/Bandara Asal', ['Pelabuhan Asal', 'Bandara Asal']),
    T('pelabuhan_tujuan', 'Pelabuhan/Banda Tujuan', ['Pelabuhan/Bandara Tujuan', 'Pelabuhan Tujuan', 'Bandara Tujuan']),
    T('nama_kapal', 'Nama Maskapai/Kapal', ['Nama Kapal', 'Nama Maskapai', 'Kapal']),
    T('no_voyage', 'No. Maskapai/Voyage Number', ['Voyage Number', 'No Voyage', 'No. Voyage'], { maks: 100 }),

    { nama: 'jumlah_bayar', label: 'Jumlah Bayar', tipe: 'desimal', alias: ['PNBP', 'Jumlah'], kelompok: 'Pembayaran', batasNilai: [0, 1_000_000_000] },
  ],
};

export const MODUL_OMKABA: Record<string, ModulInput> = { omkaba };