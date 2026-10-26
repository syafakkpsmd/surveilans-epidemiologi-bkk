-- =====================================================================
-- 02_wilayah_kerja.sql  (Tahap 3c, langkah A: PENAMBAHAN saja, tidak mengubah data/kolom lama)
--
-- Isi:
--  1. Tabel master `wilker_ref` dan `wilker_nama_alias` (bentuk sama dengan di Supabase, agar data aslinya
--     bisa diimpor pada Tahap 4 tanpa mengubah kode).
--  2. Benih sementara 7 wilayah kerja (WK01-WK07) dan alias penulisannya (nama pendek dan panjang).
--     Data asli dari Supabase menimpa benih ini saat Tahap 4 (INSERT IGNORE di sini tidak menimpa data yang sudah ada).
--  3. Kolom `kode_wilker` pada tabel-tabel data, diisi dari kolom lama lewat alias. Kolom lama TIDAK diubah/dihapus.
--  4. Laporan pemetaan di akhir: kolom `belum` harus 0 di semua tabel.
--
-- Aman dijalankan berulang (idempotent). Tidak ada baris yang dihapus.
-- Jalankan: node --env-file=.env.local scripts/migrate/jalankan-sql.mjs schema/mariadb/02_wilayah_kerja.sql
-- =====================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `wilker_ref` (
  `kode`        VARCHAR(10) COLLATE utf8mb4_bin NOT NULL,
  `nama`        VARCHAR(100) NOT NULL,
  `jenis`       VARCHAR(20) NOT NULL,
  `lat`         DECIMAL(10,6) NOT NULL,
  `lng`         DECIMAL(10,6) NOT NULL,
  `sub_lokasi`  LONGTEXT NULL COMMENT 'larik JSON berisi nama sub lokasi (di Supabase: text[])',
  `catatan`     TEXT NULL,
  PRIMARY KEY (`kode`),
  CONSTRAINT `ck_wilker_ref_jenis` CHECK (`jenis` IN ('Pelabuhan', 'Bandara', 'Kantor'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wilker_nama_alias` (
  `wilayah_kerja_teks`  VARCHAR(150) NOT NULL COMMENT 'penulisan apa adanya di data/unggahan; pencocokan tidak peka huruf besar/kecil',
  `kode_wilker`         VARCHAR(10) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`wilayah_kerja_teks`),
  KEY `idx_wilker_alias_kode` (`kode_wilker`),
  CONSTRAINT `fk_wilker_alias_kode` FOREIGN KEY (`kode_wilker`) REFERENCES `wilker_ref` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Benih sementara (koordinat = pusat peta yang dipakai kode saat ini, lib/data/wilker-lokasi.ts)
INSERT IGNORE INTO `wilker_ref` (`kode`, `nama`, `jenis`, `lat`, `lng`, `sub_lokasi`) VALUES
  ('WK01', 'Pelabuhan Samarinda',       'Pelabuhan', -0.524446, 117.171145, '[]'),
  ('WK02', 'Pelabuhan Tanjung Santan',  'Pelabuhan', -0.088145, 117.444977, '[]'),
  ('WK03', 'Pelabuhan Tanjung Laut',    'Pelabuhan',  0.139117, 117.494074, '[]'),
  ('WK04', 'Pelabuhan Lhoktuan',        'Pelabuhan',  0.165029, 117.487204, '[]'),
  ('WK05', 'Pelabuhan Sangatta',        'Pelabuhan',  0.533478, 117.556648, '[]'),
  ('WK06', 'Pelabuhan Sangkulirang',    'Pelabuhan',  1.987437, 117.985921, '[]'),
  ('WK07', 'Bandara APT Pranoto',       'Bandara',   -0.374600, 117.250600, '[]');

INSERT IGNORE INTO `wilker_nama_alias` (`wilayah_kerja_teks`, `kode_wilker`) VALUES
  ('Samarinda', 'WK01'),        ('Pelabuhan Samarinda', 'WK01'),
  ('Tanjung Santan', 'WK02'),   ('Pelabuhan Tanjung Santan', 'WK02'),
  ('Tanjung Laut', 'WK03'),     ('Pelabuhan Tanjung Laut', 'WK03'),
  ('Lhoktuan', 'WK04'),         ('Pelabuhan Lhoktuan', 'WK04'),
  ('Sangatta', 'WK05'),         ('Pelabuhan Sangatta', 'WK05'),
  ('Sangkulirang', 'WK06'),     ('Pelabuhan Sangkulirang', 'WK06'),
  ('APT Pranoto', 'WK07'),      ('Bandara APT Pranoto', 'WK07');

-- Kolom baku `kode_wilker` pada tabel data (posisi tepat setelah kolom lama)
ALTER TABLE `data_hiv_vct`          ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilker`,         ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `data_penumpang_kapal`  ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilker`,         ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `hiv_data`              ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `kier_kesehatan`        ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `kunjungan_poliklinik`  ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `migrasi_malaria`       ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `siaos`                 ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `sklt_penumpang`        ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `tb_data`               ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `posko_klb_harian`      ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `posko_penyakit_harian` ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);
ALTER TABLE `posko_ptm_harian`      ADD COLUMN IF NOT EXISTS `kode_wilker` VARCHAR(10) COLLATE utf8mb4_bin NULL AFTER `wilayah_kerja`,  ADD INDEX IF NOT EXISTS `idx_kode_wilker` (`kode_wilker`);

-- Isi dari kolom lama lewat alias (spasi di awal/akhir diabaikan; huruf besar/kecil tidak dibedakan)
UPDATE `data_hiv_vct`          t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilker`)        SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `data_penumpang_kapal`  t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilker`)        SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `hiv_data`              t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `kier_kesehatan`        t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `kunjungan_poliklinik`  t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `migrasi_malaria`       t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `siaos`                 t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `sklt_penumpang`        t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `tb_data`               t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `posko_klb_harian`      t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `posko_penyakit_harian` t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;
UPDATE `posko_ptm_harian`      t JOIN `wilker_nama_alias` a ON a.`wilayah_kerja_teks` = TRIM(t.`wilayah_kerja`) SET t.`kode_wilker` = a.`kode_wilker` WHERE t.`kode_wilker` IS NULL;

-- LAPORAN 1: ringkasan pemetaan per tabel (kolom `belum` harus 0)
SELECT 'data_hiv_vct' AS tabel, COUNT(*) AS total, COALESCE(SUM(kode_wilker IS NOT NULL), 0) AS terpetakan, COALESCE(SUM(kode_wilker IS NULL), 0) AS belum FROM `data_hiv_vct`
UNION ALL SELECT 'data_penumpang_kapal', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `data_penumpang_kapal`
UNION ALL SELECT 'hiv_data', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `hiv_data`
UNION ALL SELECT 'kier_kesehatan', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `kier_kesehatan`
UNION ALL SELECT 'kunjungan_poliklinik', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `kunjungan_poliklinik`
UNION ALL SELECT 'migrasi_malaria', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `migrasi_malaria`
UNION ALL SELECT 'siaos', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `siaos`
UNION ALL SELECT 'sklt_penumpang', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `sklt_penumpang`
UNION ALL SELECT 'tb_data', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `tb_data`
UNION ALL SELECT 'posko_klb_harian', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `posko_klb_harian`
UNION ALL SELECT 'posko_penyakit_harian', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `posko_penyakit_harian`
UNION ALL SELECT 'posko_ptm_harian', COUNT(*), COALESCE(SUM(kode_wilker IS NOT NULL), 0), COALESCE(SUM(kode_wilker IS NULL), 0) FROM `posko_ptm_harian`;

-- LAPORAN 2: penulisan yang belum punya alias (kosong bila semua terpetakan). Tambahkan alias lalu jalankan ulang file ini.
SELECT tabel, CONCAT('[', nilai, ']') AS nilai_apa_adanya, jumlah FROM (
  SELECT 'data_hiv_vct' AS tabel, MIN(wilker) AS nilai, COUNT(*) AS jumlah FROM data_hiv_vct WHERE kode_wilker IS NULL GROUP BY HEX(wilker)
  UNION ALL SELECT 'data_penumpang_kapal', MIN(wilker), COUNT(*) FROM data_penumpang_kapal WHERE kode_wilker IS NULL GROUP BY HEX(wilker)
  UNION ALL SELECT 'hiv_data', MIN(wilayah_kerja), COUNT(*) FROM hiv_data WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'kier_kesehatan', MIN(wilayah_kerja), COUNT(*) FROM kier_kesehatan WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'kunjungan_poliklinik', MIN(wilayah_kerja), COUNT(*) FROM kunjungan_poliklinik WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'migrasi_malaria', MIN(wilayah_kerja), COUNT(*) FROM migrasi_malaria WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'siaos', MIN(wilayah_kerja), COUNT(*) FROM siaos WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'sklt_penumpang', MIN(wilayah_kerja), COUNT(*) FROM sklt_penumpang WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'tb_data', MIN(wilayah_kerja), COUNT(*) FROM tb_data WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'posko_klb_harian', MIN(wilayah_kerja), COUNT(*) FROM posko_klb_harian WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'posko_penyakit_harian', MIN(wilayah_kerja), COUNT(*) FROM posko_penyakit_harian WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'posko_ptm_harian', MIN(wilayah_kerja), COUNT(*) FROM posko_ptm_harian WHERE kode_wilker IS NULL GROUP BY HEX(wilayah_kerja)
) x ORDER BY tabel, nilai;
