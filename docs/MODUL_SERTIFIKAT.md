# Modul SSCEC, P3K Kapal, Sertifikat Air, Buku Kesehatan

Dipasang di atas kerangka `lib/input-data` (unggah Excel/ekspor Sinkarkes, form, daftar berfilter, riwayat unggahan).
Menambah modul seperti ini = satu entri di `MODUL` (`lib/input-data/modul.ts`) + satu tabel di `schema/mariadb/`.

## Akses
- Menu **Data** → SSCEC / P3K Kapal / Sertifikat Air / Buku Kesehatan, atau hub **Input Data** → kategori *Sertifikat & Dokumen Kapal*.
  Keduanya membuka `/dashboard/input-data/sertifikat?modul=…` (satu halaman, pemilih modul di atas).
- Tiap modul: **Unggah berkas** (xlsx atau ekspor `.xls` Sinkarkes), **Tambah satu data lewat form**, dan **Daftar data** dengan filter tahun, bulan, wilayah kerja, sumber.
- COP dan PHQC kembali tersambung di hub (kategori *Alat Angkut & Lalu Lintas Orang*) lewat `/dashboard/input-data/kapal?modul=cop|phqc`, memakai komponen yang sama (termasuk tab Master Negara Kedatangan).
- Peran: admin dan petugas; hapus baris dan batalkan unggahan hanya admin (aturan kerangka yang sama dengan COP/PHQC).

## Tabel
`schema/mariadb/07_modul_sertifikat.sql`: `sertifikat_sscec`, `sertifikat_p3k`, `sertifikat_air`, `buku_kesehatan`.
Konvensi sama dengan `kegiatan_cop/phqc`: `wilayah_kerja` berisi nama pendek tanpa spasi (dibakukan ke kode WK bersama tabel lain pada langkah B-2/B-3), kolom `sumber` dan `batch_id`. `tgl_terbit` wajib dan menentukan tahun/bulan data.

## Aturan unggah
- Judul laporan di atas baris judul kolom dilewati otomatis; kolom Sinkarkes yang tidak diminta (Kode Billing, NTPN, alamat, dst.) diabaikan.
- Kolom wilayah menerima judul "Nama KKP", "Nama Balai Karkes", dan "KKP Induk/Wilker". Isinya nama wilayah kerja ("Samarinda", "Pelabuhan Laut Sangatta", "Pelabuhan Tanjung Laut"); bentuk "Samarinda / Pelabuhan Laut Sangkulirang" dibaca dari bagian kanan "/". Nilai yang tidak dikenal ditolak, tidak ditebak.
- **Tambah atau perbarui** (bukan hapus-ganti): baris dicocokkan lewat wilayah + nama kapal + tanggal terbit + pembeda (SSCEC: nomor barcode; P3K dan Buku Kesehatan: QR Code; Air: nama perusahaan + "Sebagai", dengan Sample ID sebagai pengganti nama kapal). Yang belum ada ditambah; yang sudah ada diperbarui, nilai kosong tidak menimpa. Unggahan satu hari tidak menyentuh data hari lain, dan unggah ulang berkas yang sama tidak menggandakan data.
- Tahun data yang dipilih saat unggah harus sama dengan tahun tanggal terbit baris.

## Temuan dari contoh berkas Sinkarkes (27 Okt 2026)
- Laporan Sertifikat Air tidak punya kolom nama kapal; nama kapal ada di **Sample ID** (kadang "Nama Kapal / GT").
- "Mencatat Pemeriksaan" (SSCEC) berisi hasil pemeriksaan ("Bebas dari pengawasan"), bukan nama petugas. Nama kolom DB `pencatat_pemeriksaan` mengikuti judul Sinkarkes.
- Kode Billing yang sama muncul di keempat laporan untuk kapal yang sama (jumlah bayar per jenis dokumen). Kode Billing belum disimpan karena belum diminta; bisa ditambahkan sebagai kolom arsip bila perlu rekonsiliasi PNBP.

## Uji
`scripts/migrate/uji-modul-sertifikat.ts` (15 uji; bagian database butuh MariaDB berisi schema 01-03, 05, 07):
`npx tsx --test --test-force-exit scripts/migrate/uji-modul-sertifikat.ts`. Data uji karangan, judul kolom meniru ekspor asli.
