-- Tahap 3b: dukungan input data dan unggah Excel (pengganti Google Sheets).
-- Aman dijalankan berulang (IF NOT EXISTS). Jalankan setelah 01-04:
--   node --env-file=.env.local scripts/migrate/jalankan-sql.mjs schema/mariadb/05_upload.sql

-- Riwayat setiap unggahan/input: siapa, kapan, berkas apa, berapa baris.
CREATE TABLE IF NOT EXISTS `upload_riwayat` (
  `id`              CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `modul`           VARCHAR(40)  NOT NULL,
  `tahun`           SMALLINT     NULL,
  `sumber`          VARCHAR(10)  NOT NULL DEFAULT 'upload',   -- 'upload' | 'input'
  `nama_file`       VARCHAR(255) NULL,
  `jumlah_baris`    INT NOT NULL DEFAULT 0,                    -- baris data di berkas
  `jumlah_masuk`    INT NOT NULL DEFAULT 0,                    -- baris yang disimpan
  `jumlah_ditolak`  INT NOT NULL DEFAULT 0,                    -- baris yang gagal validasi
  `jumlah_diganti`  INT NOT NULL DEFAULT 0,                    -- baris lama yang dihapus (mode ganti)
  `dibuat_oleh`     VARCHAR(255) NULL,
  `dibuat_pada`     DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_upload_riwayat_modul` (`modul`, `dibuat_pada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Penanda asal baris: 'migrasi' (dari Supabase/Sheets), 'input' (form), 'upload' (Excel).
-- batch_id menunjuk upload_riwayat.id (NULL untuk data hasil migrasi).
ALTER TABLE `kegiatan_cop`
  ADD COLUMN IF NOT EXISTS `sumber`   VARCHAR(10) NOT NULL DEFAULT 'migrasi',
  ADD COLUMN IF NOT EXISTS `batch_id` CHAR(36) COLLATE utf8mb4_bin NULL;
ALTER TABLE `kegiatan_phqc`
  ADD COLUMN IF NOT EXISTS `sumber`   VARCHAR(10) NOT NULL DEFAULT 'migrasi',
  ADD COLUMN IF NOT EXISTS `batch_id` CHAR(36) COLLATE utf8mb4_bin NULL;

-- ---------------------------------------------------------------------
-- COP/PHQC: kolom tambahan dari ekspor Sinkarkes (27 Okt 2026).
-- Jam/tanggal terbit dan waktu publish apa adanya dari Sinkarkes (waktu WITA, bukan UTC).
-- ---------------------------------------------------------------------
ALTER TABLE `kegiatan_cop`
  ADD COLUMN IF NOT EXISTS `pelabuhan_kedatangan`   VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `pelabuhan_berikutnya`   VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `kondisi_pelabuhan`      VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `bebas_darurat`          VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `berat_kapal`            DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS `jml_penumpang_wna`      INT NULL,
  ADD COLUMN IF NOT EXISTS `jml_penumpang_wni`      INT NULL,
  ADD COLUMN IF NOT EXISTS `tgl_terbit`             DATE NULL,
  ADD COLUMN IF NOT EXISTS `jam_terbit`             TIME NULL,
  ADD COLUMN IF NOT EXISTS `nama_petugas`           VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `tgl_published`          DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `qr_code`                VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `nama_wajib_bayar`       VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `jumlah_bayar`           DECIMAL(14,2) NULL;

ALTER TABLE `kegiatan_phqc`
  ADD COLUMN IF NOT EXISTS `nama_balai`             VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `no_imo`                 VARCHAR(50)  NULL,
  ADD COLUMN IF NOT EXISTS `jenis_kapal`            VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `berat_kapal`            DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS `jam_terbit`             TIME NULL,
  ADD COLUMN IF NOT EXISTS `nama_penerbit`          VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `berlaku_sampai`         DATE NULL,
  ADD COLUMN IF NOT EXISTS `nama_petugas`           VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `keterangan`             TEXT NULL,
  ADD COLUMN IF NOT EXISTS `tgl_published`          DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `qr_code`                VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `kode_billing`           VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `nama_wajib_bayar`       VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `ntpn`                   VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `ntb`                    VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `jam_bayar`              DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `jumlah_bayar`           DECIMAL(14,2) NULL;

-- Master pelabuhan -> negara (satu untuk semua wilayah kerja). Dipakai mengisi
-- kegiatan_cop.negara_kedatangan otomatis dari pelabuhan_kedatangan.
-- `kunci` = nama pelabuhan huruf kecil tanpa spasi/tanda baca (dihitung aplikasi).
CREATE TABLE IF NOT EXISTS `master_pelabuhan_negara` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `kunci`          VARCHAR(190) COLLATE utf8mb4_bin NOT NULL,
  `nama_pelabuhan` VARCHAR(255) NOT NULL,
  `negara`         VARCHAR(100) NOT NULL,
  `dibuat_oleh`    VARCHAR(255) NULL,
  `dibuat_pada`    DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_pelabuhan_kunci` (`kunci`),
  KEY `idx_master_pelabuhan_negara` (`negara`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
