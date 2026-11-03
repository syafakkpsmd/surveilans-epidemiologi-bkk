-- =====================================================================
-- 08_klinik_akses.sql  (akun petugas klinik terhubung ke klinik binaan + data ICV yang diinput lewat aplikasi)
-- Jalankan setelah 01, 02, 05, 06:
--   node --env-file=.env.local scripts/migrate/jalankan-sql.mjs schema/mariadb/08_klinik_akses.sql
-- Aman diulang. Tidak mengubah isi baris data yang ada (hanya mengisi kolom baru no_dokumen dari raw_json).
--
-- klinik_akses: satu akun petugas_klinik boleh memegang satu atau lebih klinik. Petugas klinik TANPA baris di sini
-- tidak melihat data klinik mana pun (gagal tertutup). Admin dan petugas BKK tetap melihat semua klinik.
--
-- data_icv.sumber: 'sheet' (hasil sinkronisasi Google Sheets, bawaan) | 'input' (form) | 'upload' (Excel).
-- Baris dari aplikasi memakai spreadsheet_id berawalan "app-" + id klinik, jadi sinkronisasi Sheets (bekerja per
-- spreadsheet_id dan menghapus baris yang tidak ada lagi di Sheets) tidak pernah menyentuhnya; dashboard membaca
-- keduanya (lib/klinik/dataset.ts). no_dokumen dipakai untuk mencegah dokumen ICV/e-ICV yang sama masuk dua kali.
-- =====================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `klinik_akses` (
  `user_id`     CHAR(36) COLLATE utf8mb4_bin NOT NULL,
  `klinik_id`   CHAR(36) COLLATE utf8mb4_bin NOT NULL,
  `dibuat_pada` DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  PRIMARY KEY (`user_id`, `klinik_id`),
  KEY `idx_klinik_akses_klinik` (`klinik_id`),
  CONSTRAINT `fk_klinik_akses_klinik` FOREIGN KEY (`klinik_id`) REFERENCES `klinik_binaan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `data_icv`
  ADD COLUMN IF NOT EXISTS `no_dokumen` VARCHAR(100) NULL AFTER `nik`,
  ADD COLUMN IF NOT EXISTS `sumber`     VARCHAR(10) NOT NULL DEFAULT 'sheet' AFTER `no_dokumen`,
  ADD COLUMN IF NOT EXISTS `batch_id`   CHAR(36) COLLATE utf8mb4_bin NULL AFTER `sumber`;

-- Isi no_dokumen untuk baris hasil sinkronisasi (dari raw_json) agar pemeriksaan duplikat juga mengenalinya.
UPDATE `data_icv`
   SET `no_dokumen` = NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(`raw_json`, '$."No Dokumen ICV / e-ICV"'))), '')
 WHERE `no_dokumen` IS NULL AND JSON_VALID(`raw_json`);

CREATE INDEX IF NOT EXISTS `idx_data_icv_dokumen` ON `data_icv` (`spreadsheet_id`, `no_dokumen`);
CREATE INDEX IF NOT EXISTS `idx_data_icv_batch` ON `data_icv` (`batch_id`);

-- ---------------------------------------------------------------------
-- Stok (ICV/e-ICV dan vaksin) yang diinput lewat aplikasi: baris memakai spreadsheet_id "app-<id klinik>" (sama seperti
-- data_icv), `sumber` 'input' | 'upload' | 'sheet', `batch_id` menunjuk upload_riwayat.id (modul "stk:<id klinik>").
-- Sisa stok dihitung aplikasi (buku besar per klinik+jenis), tidak diketik.
-- ---------------------------------------------------------------------
ALTER TABLE `stok_vaksin`
  ADD COLUMN IF NOT EXISTS `sumber`   VARCHAR(10) NOT NULL DEFAULT 'sheet' AFTER `tanggal`,
  ADD COLUMN IF NOT EXISTS `batch_id` CHAR(36) COLLATE utf8mb4_bin NULL AFTER `sumber`;

CREATE INDEX IF NOT EXISTS `idx_stok_vaksin_batch` ON `stok_vaksin` (`batch_id`);
