-- =====================================================================
-- 01_turso_modules.sql
-- Modul sinkronisasi yang sebelumnya di Turso (SQLite) -> MariaDB 10.11
-- 19 tabel. Dibuat 23 Okt 2026 dari turso_schema.sql.
--
-- Cara pakai (database kosong yang sudah dibuat utf8mb4):
--   Lokal (Docker):
--     docker exec -i mariadb-epic mariadb -uroot -p epic_ai < schema/mariadb/01_turso_modules.sql
--   cPanel: buat database lewat "Manage My Databases" (cPanel memberi awalan nama akun),
--           lalu phpMyAdmin -> pilih database -> Import.
--
-- Konvensi (lihat docs/MIGRASI_MARIADB.md bagian 7):
--  * Charset utf8mb4, collation utf8mb4_unicode_ci (tidak peka huruf besar/kecil).
--    Kolom kunci/ID yang di SQLite peka huruf besar/kecil memakai utf8mb4_bin.
--  * Waktu: kolom DATETIME disimpan UTC. Koneksi aplikasi WAJIB menjalankan
--    SET time_zone = '+00:00' agar CURRENT_TIMESTAMP sama dengan datetime('now') SQLite.
--  * Kolom tanggal operasional (TEXT 'YYYY-MM-DD' di SQLite) -> DATE.
--    Pool mysql2 memakai dateStrings: true agar tetap berupa string 'YYYY-MM-DD'.
--    Tanggal lahir (isian manual dari Sheets) sengaja tetap VARCHAR agar tidak ada data hilang.
--  * Indeks yang sudah tercakup awalan kunci UNIQUE/PRIMARY KEY dihapus (redundan).
--  * Tidak ada FOREIGN KEY: struktur asal juga tidak punya.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- HIV
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `data_hiv_vct` (
  `id`                 INT NOT NULL AUTO_INCREMENT,
  `wilker`             VARCHAR(100) NOT NULL COMMENT 'nama sheet = nama wilayah kerja',
  `no_baris`           INT NOT NULL COMMENT 'kolom No di sheet, kunci upsert',
  `tanggal_kegiatan`   DATE NOT NULL,
  `nik`                VARCHAR(32) NULL,
  `nama`               VARCHAR(255) NULL,
  `sex`                VARCHAR(20) NULL,
  `tanggal_lahir`      VARCHAR(32) NULL,
  `alamat`             TEXT NULL,
  `status_perkawinan`  VARCHAR(100) NULL,
  `kunjungan`          VARCHAR(100) NULL,
  `hasil`              VARCHAR(100) NULL,
  `jenis_reagen`       VARCHAR(255) NULL,
  `hubungan_beresiko`  TEXT NULL,
  `updated_at`         DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hiv_vct_wilker_baris` (`wilker`, `no_baris`),
  KEY `idx_hiv_vct_tanggal` (`tanggal_kegiatan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hiv_data` (
  `id`                 INT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`      VARCHAR(100) NOT NULL,
  `no_baris`           INT NOT NULL,
  `tanggal_kegiatan`   DATE NULL,
  `nik`                VARCHAR(32) NULL,
  `nama`               VARCHAR(255) NULL,
  `sex`                VARCHAR(20) NULL,
  `tanggal_lahir`      VARCHAR(32) NULL,
  `alamat`             TEXT NULL,
  `status_perkawinan`  VARCHAR(100) NULL,
  `kunjungan`          VARCHAR(100) NULL,
  `hasil`              VARCHAR(100) NULL,
  `jenis_reagen`       VARCHAR(255) NULL,
  `hubungan_berisiko`  TEXT NULL,
  `updated_at`         DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hiv_data_wilayah_baris` (`wilayah_kerja`, `no_baris`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Klinik: ICV dan stok vaksin (data mentah dari Google Sheets)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `data_icv` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `spreadsheet_id`  VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  `nama_klinik`     VARCHAR(255) NULL,
  `no_baris`        INT NOT NULL,
  `nik`             VARCHAR(32) NULL,
  `raw_json`        LONGTEXT NOT NULL,
  `updated_at`      DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_data_icv_sheet_baris` (`spreadsheet_id`, `no_baris`),
  KEY `idx_data_icv_nik` (`nik`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stok_vaksin` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `spreadsheet_id`  VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  `nama_klinik`     VARCHAR(255) NULL,
  `jenis_stok`      VARCHAR(100) NOT NULL,
  `no_baris`        INT NOT NULL,
  `tanggal`         DATE NULL,
  `raw_json`        LONGTEXT NOT NULL,
  `updated_at`      DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stok_vaksin_sheet_jenis_baris` (`spreadsheet_id`, `jenis_stok`, `no_baris`),
  KEY `idx_stok_vaksin_tanggal` (`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Lalu lintas orang / penumpang kapal / SIAOS / SKLT
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `data_penumpang_kapal` (
  `id`                   INT NOT NULL AUTO_INCREMENT,
  `wilker`               VARCHAR(100) NOT NULL,
  `no_baris`             INT NOT NULL,
  `tanggal_tiba`         DATE NOT NULL,
  `nama_kapal`           VARCHAR(255) NULL,
  `abk_datang`           INT NULL DEFAULT 0,
  `abk_berangkat`        INT NULL DEFAULT 0,
  `penumpang_datang`     INT NULL DEFAULT 0,
  `penumpang_berangkat`  INT NULL DEFAULT 0,
  `keterangan`           TEXT NULL,
  `updated_at`           DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `tanggal_berangkat`    DATE NULL,
  `siaos`                TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_penumpang_kapal_wilker_baris` (`wilker`, `no_baris`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `siaos` (
  `id`                              INT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`                   VARCHAR(100) NOT NULL,
  `no`                              INT NULL,
  `tanggal`                         DATE NULL,
  `no_surat`                        VARCHAR(255) NULL,
  `nama`                            VARCHAR(255) NULL,
  `pelayaran`                       VARCHAR(255) NULL,
  `maskapai`                        VARCHAR(255) NULL,
  `pelabuhan`                       VARCHAR(255) NULL,
  `jenis_kelamin`                   VARCHAR(20) NULL,
  `usia`                            INT NULL,
  `satuan_usia`                     VARCHAR(50) NULL,
  `diagnosa`                        TEXT NULL,
  `butuh_bantuan_medis`             VARCHAR(100) NULL,
  `ambulance`                       VARCHAR(100) NULL,
  `kondisi_lanjut_perjalanan`       VARCHAR(255) NULL,
  `perlu_kursi_dorong`              VARCHAR(100) NULL,
  `perlu_bantuan_makanan_medikasi`  VARCHAR(100) NULL,
  `synced_at`                       DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_siaos_wilayah_surat` (`wilayah_kerja`, `no_surat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sklt_penumpang` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `kunci_unik`      VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  `wilayah_kerja`   VARCHAR(100) NOT NULL DEFAULT 'APT Pranoto',
  `no_baris`        INT NULL,
  `no_urut`         INT NULL,
  `tanggal`         DATE NULL,
  `nama`            VARCHAR(255) NULL,
  `maskapai`        VARCHAR(255) NULL,
  `rute`            VARCHAR(255) NULL,
  `rute_kode`       VARCHAR(50) NULL,
  `jenis_kelamin`   VARCHAR(20) NULL,
  `umur`            INT NULL,
  `diagnosis`       TEXT NULL,
  `status_laik`     VARCHAR(100) NULL,
  `no_registrasi`   VARCHAR(100) NULL,
  `jenis_penyakit`  VARCHAR(255) NULL,
  `gcs`             VARCHAR(20) NULL,
  `nadi`            INT NULL,
  `suhu`            DOUBLE NULL,
  `hamil`           VARCHAR(50) NULL,
  `pendamping`      VARCHAR(255) NULL,
  `fasilitas`       VARCHAR(255) NULL,
  `updated_at`      DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sklt_kunci_unik` (`kunci_unik`),
  KEY `idx_sklt_laik` (`status_laik`),
  KEY `idx_sklt_rute` (`rute`),
  KEY `idx_sklt_tanggal` (`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- KIER, poliklinik, malaria, TB
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kier_kesehatan` (
  `kunci_unik`          VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT "wilayah_kerja + '|' + no_baris",
  `wilayah_kerja`       VARCHAR(100) NULL,
  `no_baris`            INT NULL,
  `nama`                VARCHAR(255) NULL,
  `tanggal_lahir`       VARCHAR(32) NULL,
  `jenis_kelamin`       VARCHAR(20) NULL,
  `alamat`              TEXT NULL,
  `tujuan_pemeriksaan`  VARCHAR(255) NULL,
  `tanggal_pemeriksaan` DATE NULL,
  `kesimpulan`          VARCHAR(255) NULL,
  `tempat_terbit`       VARCHAR(255) NULL,
  `updated_at`          DATETIME NULL,
  PRIMARY KEY (`kunci_unik`),
  KEY `idx_kier_kesimpulan` (`kesimpulan`),
  KEY `idx_kier_tgl_periksa` (`tanggal_pemeriksaan`),
  KEY `idx_kier_wilker` (`wilayah_kerja`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kunjungan_poliklinik` (
  `id`                   INT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`        VARCHAR(100) NOT NULL,
  `no_baris`             INT NOT NULL,
  `no_urut`              VARCHAR(50) NULL,
  `tanggal_pemeriksaan`  DATE NULL,
  `nama`                 VARCHAR(255) NULL,
  `jenis_kelamin`        VARCHAR(20) NULL,
  `usia`                 INT NULL,
  `usia_mentah`          VARCHAR(100) NULL,
  `diagnosa`             TEXT NULL,
  `keterangan`           TEXT NULL,
  `updated_at`           DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `kategori_pasien`      VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_poli_wilayah_baris` (`wilayah_kerja`, `no_baris`),
  KEY `idx_poli_diagnosa` (`diagnosa`(191)),
  KEY `idx_poli_tanggal` (`tanggal_pemeriksaan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `migrasi_malaria` (
  `id`                              VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  `wilayah_kerja`                   VARCHAR(100) NULL,
  `nama_kapal_pesawat`              VARCHAR(255) NULL,
  `tanggal_kegiatan`                DATE NULL,
  `nama_lengkap`                    VARCHAR(255) NULL,
  `tanggal_lahir`                   VARCHAR(32) NULL,
  `jenis_kelamin`                   VARCHAR(20) NULL,
  `umur`                            INT NULL,
  `pekerjaan`                       VARCHAR(255) NULL,
  `pendidikan_terakhir`             VARCHAR(255) NULL,
  `alamat_asal`                     TEXT NULL,
  `alamat_tujuan`                   TEXT NULL,
  `pernah_sakit_malaria`            VARCHAR(255) NULL,
  `tahu_penyakit_malaria`           VARCHAR(255) NULL,
  `tahu_gejala_malaria`             VARCHAR(255) NULL,
  `sekitar_pernah_sakit_malaria`    VARCHAR(255) NULL,
  `pernah_dapat_informasi_malaria`  VARCHAR(255) NULL,
  `sekitar_dekat_dengan`            VARCHAR(255) NULL,
  `punya_ternak`                    VARCHAR(255) NULL,
  `tempat_buang_hajat`              VARCHAR(255) NULL,
  `pakai_baju_panjang_repellent`    VARCHAR(255) NULL,
  `pakai_saat_tidur`                VARCHAR(255) NULL,
  `tempat_berobat`                  VARCHAR(255) NULL,
  `hasil_rdt`                       VARCHAR(255) NULL,
  `updated_at`                      DATETIME NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tb_data` (
  `id`                           INT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`                VARCHAR(100) NOT NULL,
  `no_baris`                     INT NOT NULL,
  `no_urut`                      VARCHAR(50) NULL,
  `tanggal_pelaksanaan`          DATE NULL,
  `nama_peserta`                 VARCHAR(255) NULL,
  `provinsi`                     VARCHAR(100) NULL,
  `kabupaten_kota`               VARCHAR(100) NULL,
  `nik`                          VARCHAR(32) NULL,
  `pekerjaan`                    VARCHAR(255) NULL,
  `tanggal_lahir`                VARCHAR(32) NULL,
  `jenis_kelamin`                VARCHAR(20) NULL,
  `no_hp`                        VARCHAR(50) NULL,
  `riwayat_kontak_tbc`           VARCHAR(100) NULL,
  `jenis_kontak_tbc`             VARCHAR(255) NULL,
  `pernah_terdiagnosa_tbc`       VARCHAR(100) NULL,
  `keterangan_riwayat_tbc`       TEXT NULL,
  `kekurangan_gizi`              VARCHAR(100) NULL,
  `merokok`                      VARCHAR(100) NULL,
  `perokok_pasif`                VARCHAR(100) NULL,
  `riwayat_dm`                   VARCHAR(100) NULL,
  `odhiv`                        VARCHAR(100) NULL,
  `lansia`                       VARCHAR(100) NULL,
  `ibu_hamil`                    VARCHAR(100) NULL,
  `hasil_skrining_gejala`        TEXT NULL,
  `terduga_tbc`                  VARCHAR(100) NULL,
  `tindak_lanjut_pemeriksaan`    TEXT NULL,
  `fasyankes_pemeriksaan`        VARCHAR(255) NULL,
  `nomor_register_sitb`          VARCHAR(100) NULL,
  `tanggal_hasil_diagnosis`      DATE NULL,
  `hasil_pemeriksaan_diagnosis`  TEXT NULL,
  `jenis_pemeriksaan_diagnosis`  VARCHAR(255) NULL,
  `terkonfirmasi_tbc`            VARCHAR(100) NULL,
  `updated_at`                   DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tb_data_wilayah_baris` (`wilayah_kerja`, `no_baris`),
  KEY `idx_tb_data_nik` (`nik`),
  KEY `idx_tb_data_tanggal` (`tanggal_pelaksanaan`),
  KEY `idx_tb_data_terduga` (`terduga_tbc`),
  KEY `idx_tb_data_terkonfirmasi` (`terkonfirmasi_tbc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Pengawasan klinik: tautan perbaikan, foto, rekomendasi PDF
-- pengawasan_id merujuk ke pengawasan_klinik.id (tabel Supabase, dipindah di Tahap 4).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pengawasan_klinik_link_perbaikan` (
  `pengawasan_id`  VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  `token`          VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  `aktif`          TINYINT(1) NOT NULL DEFAULT 1,
  `dibuat_pada`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pengawasan_id`),
  UNIQUE KEY `uq_link_perbaikan_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pengawasan_klinik_perbaikan` (
  `id`                 VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  `pengawasan_id`      VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  `item_key`           VARCHAR(100) NOT NULL,
  `keterangan`         TEXT NULL,
  `tanggal_perbaikan`  DATE NULL,
  `diisi_pada`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_perbaikan_pengawasan_item` (`pengawasan_id`, `item_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pengawasan_klinik_perbaikan_foto` (
  `id`             VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  `perbaikan_id`   VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  `isi_foto`       LONGBLOB NOT NULL,
  `ukuran_byte`    INT NOT NULL,
  `diunggah_pada`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_perbaikan_foto` (`perbaikan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pengawasan_klinik_rekomendasi` (
  `pengawasan_id`  VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  `nama_file`      VARCHAR(255) NOT NULL,
  `ukuran_byte`    INT NOT NULL,
  `isi_pdf`        LONGBLOB NOT NULL,
  `diunggah_pada`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pengawasan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Posko Nataru / Idul Fitri
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `posko_periode` (
  `posko`            VARCHAR(20) NOT NULL,
  `tahun`            INT NOT NULL,
  `nama`             VARCHAR(255) NOT NULL,
  `tanggal_mulai`    DATE NOT NULL,
  `tanggal_selesai`  DATE NOT NULL,
  PRIMARY KEY (`posko`, `tahun`),
  CONSTRAINT `ck_posko_periode_posko` CHECK (`posko` IN ('nataru', 'idul_fitri'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `posko_klb_harian` (
  `posko`          VARCHAR(20) NOT NULL,
  `tahun`          INT NOT NULL,
  `tanggal`        DATE NOT NULL,
  `wilayah_kerja`  VARCHAR(50) NOT NULL,
  `jumlah_klb`     INT NOT NULL DEFAULT 0,
  `keterangan`     TEXT NULL,
  `diperbarui`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`posko`, `tahun`, `tanggal`, `wilayah_kerja`),
  CONSTRAINT `ck_posko_klb_posko` CHECK (`posko` IN ('nataru', 'idul_fitri')),
  CONSTRAINT `ck_posko_klb_wilker` CHECK (`wilayah_kerja` IN ('Samarinda', 'APT Pranoto', 'Lhoktuan'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `posko_penyakit_harian` (
  `posko`           VARCHAR(20) NOT NULL,
  `tahun`           INT NOT NULL,
  `tanggal`         DATE NOT NULL,
  `wilayah_kerja`   VARCHAR(50) NOT NULL,
  `jenis_penyakit`  VARCHAR(150) NOT NULL,
  `kasus_lk_lt5`    INT NOT NULL DEFAULT 0,
  `kasus_lk_ge5`    INT NOT NULL DEFAULT 0,
  `kasus_pr_lt5`    INT NOT NULL DEFAULT 0,
  `kasus_pr_ge5`    INT NOT NULL DEFAULT 0,
  `mati_lk_lt5`     INT NOT NULL DEFAULT 0,
  `mati_lk_ge5`     INT NOT NULL DEFAULT 0,
  `mati_pr_lt5`     INT NOT NULL DEFAULT 0,
  `mati_pr_ge5`     INT NOT NULL DEFAULT 0,
  `diperbarui`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`posko`, `tahun`, `tanggal`, `wilayah_kerja`, `jenis_penyakit`),
  CONSTRAINT `ck_posko_penyakit_posko` CHECK (`posko` IN ('nataru', 'idul_fitri')),
  CONSTRAINT `ck_posko_penyakit_wilker` CHECK (`wilayah_kerja` IN ('Samarinda', 'APT Pranoto', 'Lhoktuan'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `posko_ptm_harian` (
  `posko`          VARCHAR(20) NOT NULL,
  `tahun`          INT NOT NULL,
  `tanggal`        DATE NOT NULL,
  `wilayah_kerja`  VARCHAR(50) NOT NULL,
  `jenis_ptm`      VARCHAR(150) NOT NULL,
  `jumlah_kasus`   INT NOT NULL DEFAULT 0,
  `diperbarui`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `jumlah_lk`      INT NOT NULL DEFAULT 0,
  `jumlah_pr`      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`posko`, `tahun`, `tanggal`, `wilayah_kerja`, `jenis_ptm`),
  CONSTRAINT `ck_posko_ptm_posko` CHECK (`posko` IN ('nataru', 'idul_fitri')),
  CONSTRAINT `ck_posko_ptm_wilker` CHECK (`wilayah_kerja` IN ('Samarinda', 'APT Pranoto', 'Lhoktuan'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
