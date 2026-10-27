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
