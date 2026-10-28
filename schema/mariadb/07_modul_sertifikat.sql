-- =====================================================================
-- 07_modul_sertifikat.sql  (SSCEC, P3K Kapal, Sertifikat Air, Buku Kesehatan)
-- Jalankan setelah 05_upload.sql (butuh kolom/konvensi `sumber` + `batch_id`, tabel upload_riwayat):
--   node --env-file=.env.local scripts/migrate/jalankan-sql.mjs schema/mariadb/07_modul_sertifikat.sql
-- Aman dijalankan berulang (IF NOT EXISTS). Tidak mengubah tabel lain.
--
-- Mengikuti konvensi kegiatan_cop/kegiatan_phqc: id BIGINT, `wilayah_kerja` berisi nama pendek tanpa spasi
-- ("TanjungSantan"; akan dibakukan ke kode WK bersama tabel lain pada langkah B-2/B-3),
-- `sumber` ('input' form | 'upload' Excel | 'migrasi'), `batch_id` menunjuk upload_riwayat.id.
-- `tgl_terbit` wajib dan menentukan tahun/bulan data. Panjang kolom teks harus sama dengan `maks`
-- di lib/input-data/modul.ts (bawaan 255). Hanya kolom yang dibutuhkan dari Sinkarkes yang disimpan.
-- =====================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `sertifikat_sscec` (
  `id`                    BIGINT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`         VARCHAR(100) NOT NULL,
  `nama_kapal`            VARCHAR(255) NOT NULL,
  `nomor_barcode`         VARCHAR(100) NULL,
  `berat_gt`              DECIMAL(12,2) NULL,
  `bendera`               VARCHAR(255) NULL,
  `palka`                 VARCHAR(500) NULL,
  `berat_palka`           VARCHAR(255) NULL,
  `tgl_periksa`           DATE NULL,
  `pencatat_pemeriksaan`  VARCHAR(255) NULL,
  `tgl_terbit`            DATE NOT NULL,
  `nama_wajib_bayar`      VARCHAR(255) NULL,
  `tgl_bayar`             DATE NULL,
  `jumlah_bayar`          DECIMAL(14,2) NULL,
  `sumber`                VARCHAR(10) NOT NULL DEFAULT 'input',
  `batch_id`              CHAR(36) COLLATE utf8mb4_bin NULL,
  `dibuat_pada`           DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_sscec_wilayah_terbit` (`wilayah_kerja`, `tgl_terbit`),
  KEY `idx_sscec_terbit` (`tgl_terbit`),
  KEY `idx_sscec_barcode` (`nomor_barcode`),
  KEY `idx_sscec_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sertifikat_p3k` (
  `id`                 BIGINT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`      VARCHAR(100) NOT NULL,
  `nama_kapal`         VARCHAR(255) NOT NULL,
  `bendera`            VARCHAR(255) NULL,
  `berat`              DECIMAL(12,2) NULL,
  `tgl_terbit`         DATE NOT NULL,
  `tgl_published`      DATETIME NULL,
  `petugas_pemeriksa`  VARCHAR(255) NULL,
  `nip`                VARCHAR(50) NULL,
  `qr_code`            VARCHAR(100) NULL,
  `nama_wajib_bayar`   VARCHAR(255) NULL,
  `jumlah_bayar`       DECIMAL(14,2) NULL,
  `sumber`             VARCHAR(10) NOT NULL DEFAULT 'input',
  `batch_id`           CHAR(36) COLLATE utf8mb4_bin NULL,
  `dibuat_pada`        DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_p3k_wilayah_terbit` (`wilayah_kerja`, `tgl_terbit`),
  KEY `idx_p3k_terbit` (`tgl_terbit`),
  KEY `idx_p3k_qr` (`qr_code`),
  KEY `idx_p3k_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sertifikat_air` (
  `id`                   BIGINT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`        VARCHAR(100) NOT NULL,
  `nama_perusahaan`      VARCHAR(255) NOT NULL,
  `lokasi_pengambilan`   VARCHAR(500) NULL,
  `jenis_penampungan`    VARCHAR(255) NULL,
  `penampungan_lainnya`  VARCHAR(255) NULL,
  `volume_sampel`        VARCHAR(100) NULL,
  `tgl_pengambilan`      DATE NULL,
  `tgl_analisis`         DATE NULL,
  `jam_analisis`         TIME NULL,
  `sample_id`            VARCHAR(255) NULL,
  `kesimpulan`           VARCHAR(1000) NULL,
  `sebagai`              VARCHAR(255) NULL,
  `tempat_terbit`        VARCHAR(255) NULL,
  `tgl_terbit`           DATE NOT NULL,
  `berlaku_sampai`       DATE NULL,
  `jumlah_bayar`         DECIMAL(14,2) NULL,
  `sumber`               VARCHAR(10) NOT NULL DEFAULT 'input',
  `batch_id`             CHAR(36) COLLATE utf8mb4_bin NULL,
  `dibuat_pada`          DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_air_wilayah_terbit` (`wilayah_kerja`, `tgl_terbit`),
  KEY `idx_air_terbit` (`tgl_terbit`),
  KEY `idx_air_sample` (`sample_id`),
  KEY `idx_air_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `buku_kesehatan` (
  `id`                BIGINT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`     VARCHAR(100) NOT NULL,
  `qr_code`           VARCHAR(100) NULL,
  `e_healthbook`      VARCHAR(100) NULL,
  `nama_kapal`        VARCHAR(255) NOT NULL,
  `bendera`           VARCHAR(255) NULL,
  `berat`             DECIMAL(12,2) NULL,
  `pemilik`           VARCHAR(255) NULL,
  `tgl_terbit`        DATE NOT NULL,
  `nama_wajib_bayar`  VARCHAR(255) NULL,
  `jumlah_bayar`      DECIMAL(14,2) NULL,
  `sumber`            VARCHAR(10) NOT NULL DEFAULT 'input',
  `batch_id`          CHAR(36) COLLATE utf8mb4_bin NULL,
  `dibuat_pada`       DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_bukes_wilayah_terbit` (`wilayah_kerja`, `tgl_terbit`),
  KEY `idx_bukes_terbit` (`tgl_terbit`),
  KEY `idx_bukes_qr` (`qr_code`),
  KEY `idx_bukes_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
