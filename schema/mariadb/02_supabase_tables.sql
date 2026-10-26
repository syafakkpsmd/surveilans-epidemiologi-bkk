-- =====================================================================
-- 02_supabase_tables.sql
-- Tabel Supabase (PostgreSQL) -> MariaDB 10.11
-- Sumber: schema-dump/supabase_schema.json (46 tabel dasar). Dikerjakan bertahap:
--   Batch 1: tabel referensi / master tanpa dependensi data (10 tabel)
--   Batch 2: akun, konfigurasi, konten, log, dan foto (10 tabel)
--   Batch 3: kegiatan karantina, inspeksi, simulasi wabah, skrining (13 tabel)
--   Batch 4: surveilans vektor + 4 trigger hitung indikator (4 tabel)
--   Batch 5: lingkungan, penyakit, SKDR, pengawasan klinik (9 tabel + 1 trigger updated_at)
--   Batch berikutnya ditambahkan di bawah (kegiatan, vektor, lingkungan, dst).
--
-- Cara pakai (database kosong utf8mb4, SETELAH 01_turso_modules.sql):
--   docker exec -i mariadb-epic mariadb -uroot -p epic_ai < schema/mariadb/02_supabase_tables.sql
--
-- Konvensi (docs/MIGRASI_MARIADB.md bagian 7), plus keputusan Tahap 4:
--  * uuid         -> CHAR(36) COLLATE utf8mb4_bin, default UUID(). (Tipe UUID asli MariaDB
--                    juga boleh; CHAR(36) dipilih agar perilaku sama di semua klien/alat.)
--  * timestamptz  -> DATETIME (UTC), default CURRENT_TIMESTAMP. Koneksi aplikasi WAJIB
--                    menjalankan SET time_zone = '+00:00'. Presisi detik (DATETIME(0)).
--  * jsonb / array teks -> LONGTEXT berisi JSON, dijaga CHECK (JSON_VALID(...)).
--  * numeric(p,s) -> DECIMAL(p,s). numeric TANPA presisi di Postgres: sementara DECIMAL(38,18)
--                    dan ditandai "[VERIFIKASI]" sampai diukur (scripts/migrate/supabase-column-stats.sql).
--                    PENTING: MariaDB MEMBULATKAN kelebihan DESIMAL tanpa error walau mode strict
--                    (hanya Note 1265: 1.23456789 -> DECIMAL(10,4) menjadi 1.2346), sedangkan kelebihan
--                    bagian BULAT ditolak. Karena itu lebar sementara sengaja besar, lalu dipersempit
--                    berdasarkan hasil ukur. Skrip migrasi juga wajib membandingkan nilai asal vs tujuan.
--  * boolean      -> TINYINT(1).   integer -> INT, smallint -> SMALLINT, bigint -> BIGINT.
--  * text         -> VARCHAR(n) untuk kolom kunci/pendek, TEXT untuk teks bebas.
--  * Postgres `text` peka huruf besar/kecil. Kolom PK/FK/UNIQUE dan kolom ber-CHECK enum
--    memakai utf8mb4_bin agar perilakunya sama; kolom lain utf8mb4_unicode_ci.
--  * nextval(sequence) -> AUTO_INCREMENT. Skrip migrasi menyalin id asal apa adanya.
--  * CHECK (x = ANY (ARRAY[...])) -> CHECK (x IN (...)).
--  * FOREIGN KEY ke tabel di skema ini dipertahankan. FK ke auth.users TIDAK dibuat
--    (tabelnya baru ada di Tahap 5); kolomnya tetap CHAR(36) dan diberi komentar.
--  * Tidak ada RLS/policy: pemeriksaan role dipindah ke server (Tahap 5).
--  * Tabel Supabase yang bentrok nama dengan 01_turso_modules.sql (hiv_data, tb_data)
--    akan memakai awalan sb_ pada batch yang memuatnya.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- BATCH 1: TABEL REFERENSI / MASTER
-- Urutan: wilker_ref lebih dulu (dirujuk FK oleh banyak tabel).
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `wilker_ref` (
  `kode`        VARCHAR(50)  COLLATE utf8mb4_bin NOT NULL,
  `nama`        VARCHAR(255) NOT NULL,
  `jenis`       VARCHAR(20)  COLLATE utf8mb4_bin NOT NULL,
  `lat`         DECIMAL(38,18) NOT NULL COMMENT '[VERIFIKASI] numeric tanpa presisi di Postgres; lebar sementara, ukur dulu',
  `lng`         DECIMAL(38,18) NOT NULL COMMENT '[VERIFIKASI] numeric tanpa presisi di Postgres; lebar sementara, ukur dulu',
  `sub_lokasi`  LONGTEXT NULL DEFAULT '[]' COMMENT 'array teks Postgres -> JSON, mis. ["Pelabuhan Umum","TPK Palaran"]',
  `catatan`     TEXT NULL,
  PRIMARY KEY (`kode`),
  CONSTRAINT `chk_wilker_ref_jenis` CHECK (`jenis` IN ('Pelabuhan','Bandara','Kantor')),
  CONSTRAINT `chk_wilker_ref_sub_lokasi_json` CHECK (`sub_lokasi` IS NULL OR JSON_VALID(`sub_lokasi`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wilker_nama_alias` (
  `wilayah_kerja_teks` VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  `kode_wilker`        VARCHAR(50)  COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`wilayah_kerja_teks`),
  KEY `idx_wilker_nama_alias_kode` (`kode_wilker`),
  CONSTRAINT `fk_wilker_nama_alias_kode_wilker`
    FOREIGN KEY (`kode_wilker`) REFERENCES `wilker_ref` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referensi_parameter_penyakit` (
  `id`                    INT NOT NULL AUTO_INCREMENT,
  `kategori`              VARCHAR(255) NOT NULL,
  `r0_min`                DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi di Postgres; lebar sementara, ukur dulu',
  `r0_max`                DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi di Postgres; lebar sementara, ukur dulu',
  `r0_default`            DECIMAL(38,18) NOT NULL COMMENT '[VERIFIKASI] numeric tanpa presisi di Postgres; lebar sementara, ukur dulu',
  `serial_interval_hari`  DECIMAL(38,18) NOT NULL COMMENT '[VERIFIKASI] numeric tanpa presisi di Postgres; lebar sementara, ukur dulu',
  `masa_inkubasi_hari`    DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi di Postgres; lebar sementara, ukur dulu',
  `cara_penularan`        TEXT NULL,
  `sumber_referensi`      TEXT NULL,
  `catatan`               TEXT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referensi_populasi_wilker` (
  `id`                              INT NOT NULL AUTO_INCREMENT,
  `kode_wilker`                     VARCHAR(50)  COLLATE utf8mb4_bin NULL COMMENT 'tanpa FK (sama dengan sumber)',
  `wilayah_kerja`                   VARCHAR(255) NULL,
  `jenis_wilker`                    VARCHAR(100) NOT NULL,
  `jumlah_petugas_kesehatan`        INT NULL DEFAULT 0,
  `jumlah_petugas_non_kesehatan`    INT NULL DEFAULT 0,
  `jumlah_tkbm_terdaftar`           INT NULL DEFAULT 0,
  `jumlah_ground_crew_terdaftar`    INT NULL DEFAULT 0,
  `populasi_kota_sekitar`           INT NULL,
  `sumber_data`                     TEXT NULL,
  `updated_at`                      DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skdr_jenis_penyakit` (
  `nomor`          SMALLINT NOT NULL,
  `jenis_penyakit` VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`nomor`),
  UNIQUE KEY `uq_skdr_jenis_penyakit_nama` (`jenis_penyakit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jenis_kegiatan_foto` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `nama`        VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  `dibuat_pada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_jenis_kegiatan_foto_nama` (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wilayah_ispa` (
  `id`          CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `label`       VARCHAR(255) NOT NULL,
  `kode_wilker` VARCHAR(50) COLLATE utf8mb4_bin NOT NULL COMMENT 'tanpa FK (sama dengan sumber)',
  `zona`        VARCHAR(100) NULL,
  `urutan`      INT NOT NULL DEFAULT 0,
  `dibuat_pada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lokasi_kualitas_udara` (
  `id`           CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `nama`         VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  `urutan`       INT NOT NULL DEFAULT 0,
  `dibuat_pada`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lokasi_induk` VARCHAR(255) NULL,
  `sub_lokasi`   VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lokasi_kualitas_udara_nama` (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `klinik_binaan` (
  `id`               CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `nama_klinik`      VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  `alamat_klinik`    TEXT NULL,
  `jenis_fasilitas`  VARCHAR(255) NULL,
  `pemilik_pimpinan` VARCHAR(255) NULL,
  `penanggung_jawab` VARCHAR(255) NULL,
  `latitude`         DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi di Postgres; lebar sementara, ukur dulu',
  `longitude`        DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi di Postgres; lebar sementara, ukur dulu',
  `created_at`       DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `kabupaten_kota`   VARCHAR(255) NULL,
  `telepon`          VARCHAR(100) NULL,
  `spreadsheet_id`   VARCHAR(255) NULL,
  `kategori`         VARCHAR(20) COLLATE utf8mb4_bin NOT NULL DEFAULT 'klinik',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_klinik_binaan_nama` (`nama_klinik`),
  CONSTRAINT `chk_klinik_binaan_kategori` CHECK (`kategori` IN ('klinik','bkk'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fasilitas_pelabuhan` (
  `id`          CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `kode_wilker` VARCHAR(50) COLLATE utf8mb4_bin NOT NULL,
  `nama`        VARCHAR(255) NOT NULL,
  `tipe`        VARCHAR(20) COLLATE utf8mb4_bin NOT NULL,
  `lat`         DECIMAL(10,6) NOT NULL,
  `lng`         DECIMAL(10,6) NOT NULL,
  `deskripsi`   TEXT NULL,
  `created_at`  DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fasilitas_pelabuhan_kode_wilker` (`kode_wilker`),
  CONSTRAINT `fk_fasilitas_pelabuhan_kode_wilker`
    FOREIGN KEY (`kode_wilker`) REFERENCES `wilker_ref` (`kode`),
  CONSTRAINT `chk_fasilitas_pelabuhan_tipe` CHECK (`tipe` IN ('pelabuhan','bandara','kantor'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- BATCH 2: AKUN, KONFIGURASI, KONTEN, LOG, FOTO
-- Catatan umum batch ini:
--  * Kolom `bigint ... generated always as identity` di Postgres -> BIGINT AUTO_INCREMENT
--    (kunjungan_tamu terkonfirmasi dari sql/segmen3_*.sql; pengaturan_ai, riwayat_analisis_ai,
--    foto_kegiatan, statistik_kunjungan terkonfirmasi dari kode: insert tanpa id).
--  * FK ke auth.users sengaja tidak dibuat. Perilaku ON DELETE yang hilang, untuk Tahap 5:
--      profiles.id              : ON DELETE CASCADE  (hapus akun -> hapus profil)
--      statistik_kunjungan.user_id : ON DELETE SET NULL
-- ---------------------------------------------------------------------

-- Dipertahankan sebagai tabel profil sampai Tahap 5 (bisa digabung ke tabel users).
CREATE TABLE IF NOT EXISTS `profiles` (
  `id`            CHAR(36) COLLATE utf8mb4_bin NOT NULL COMMENT 'sama dengan id akun Supabase Auth; tanpa FK (Tahap 5)',
  `role`          VARCHAR(20) COLLATE utf8mb4_bin NOT NULL,
  `status`        VARCHAR(20) COLLATE utf8mb4_bin NOT NULL DEFAULT 'pending',
  `nama_lengkap`  VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_profiles_role`   CHECK (`role` IN ('admin','petugas','petugas_klinik')),
  CONSTRAINT `chk_profiles_status` CHECK (`status` IN ('pending','approved','suspended'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PERHATIAN: api_key berisi kunci API pihak ketiga (tersimpan apa adanya, seperti di Supabase).
-- Jangan sertakan isi tabel ini di dump/commit/chat. Pertimbangkan enkripsi di sisi aplikasi.
CREATE TABLE IF NOT EXISTS `pengaturan_ai` (
  `id`                BIGINT NOT NULL AUTO_INCREMENT,
  `nama_tampilan`     VARCHAR(255) NOT NULL,
  `tipe_provider`     VARCHAR(30) COLLATE utf8mb4_bin NOT NULL,
  `base_url`          TEXT NULL,
  `model`             VARCHAR(255) NOT NULL,
  `api_key`           TEXT NOT NULL,
  `aktif`             TINYINT(1) NOT NULL DEFAULT 1,
  `dibuat_pada`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `urutan_prioritas`  INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_pengaturan_ai_tipe_provider` CHECK (`tipe_provider` IN ('gemini','openai_compatible'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel satu baris (id = 1).
CREATE TABLE IF NOT EXISTS `pengaturan_klinik` (
  `id`                  INT NOT NULL DEFAULT 1,
  `standar_hari_vaksin` INT NOT NULL DEFAULT 14,
  `updated_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by`          CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `peraturan` (
  `id`              CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `judul`           VARCHAR(500) NOT NULL,
  `deskripsi`       TEXT NULL,
  `kategori`        VARCHAR(20) COLLATE utf8mb4_bin NOT NULL,
  `nomor_peraturan` VARCHAR(255) NULL,
  `tahun`           INT NULL,
  `file_url`        TEXT NOT NULL,
  `file_type`       VARCHAR(10) COLLATE utf8mb4_bin NOT NULL,
  `nama_file_asli`  VARCHAR(500) NOT NULL,
  `diunggah_oleh`   CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  `created_at`      DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_peraturan_kategori`  CHECK (`kategori` IN ('UU','PP','Permenkes','Kepmenkes','SK','SOP','Juknis','Lainnya')),
  CONSTRAINT `chk_peraturan_file_type` CHECK (`file_type` IN ('pdf','docx','xlsx'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `buletin` (
  `id`            CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tahun`         INT NOT NULL,
  `nama_kegiatan` VARCHAR(255) NOT NULL,
  `tipe_link`     VARCHAR(20) COLLATE utf8mb4_bin NOT NULL,
  `link_url`      TEXT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_buletin_tipe_link` CHECK (`tipe_link` IN ('looker','canva','lainnya'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hitungan kunjungan tamu (bukan data pribadi).
CREATE TABLE IF NOT EXISTS `kunjungan_tamu` (
  `id`      BIGINT NOT NULL AUTO_INCREMENT,
  `waktu`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `halaman` VARCHAR(1000) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ip_address dapat berisi IPv4/IPv6 (maks 45 karakter). Data pribadi: jangan dikirim ke chat.
CREATE TABLE IF NOT EXISTS `statistik_kunjungan` (
  `id`          BIGINT NOT NULL AUTO_INCREMENT,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tipe`        VARCHAR(20) COLLATE utf8mb4_bin NOT NULL,
  `role`        VARCHAR(50) NOT NULL DEFAULT '-',
  `user_id`     CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5), asal: ON DELETE SET NULL',
  `ip_address`  VARCHAR(64) NULL,
  `kota`        VARCHAR(255) NULL,
  `wilayah`     VARCHAR(255) NULL,
  `negara`      VARCHAR(255) NULL,
  `keterangan`  TEXT NULL DEFAULT '-',
  PRIMARY KEY (`id`),
  KEY `idx_statistik_created_at` (`created_at`),
  KEY `idx_statistik_tipe` (`tipe`),
  CONSTRAINT `chk_statistik_kunjungan_tipe` CHECK (`tipe` IN ('pageload','login'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cache hasil Analisis AI / Prediksi AI. Kolom yang diindeks dibuat VARCHAR dengan lebar
-- longgar (nilai nyata: konteks <= ~30 huruf, periode_key "2026-W27"/"2026-6").
CREATE TABLE IF NOT EXISTS `riwayat_analisis_ai` (
  `id`                BIGINT NOT NULL AUTO_INCREMENT,
  `konteks`           VARCHAR(100) NOT NULL,
  `periode_key`       VARCHAR(50)  NOT NULL,
  `wilayah_kerja`     VARCHAR(100) NULL,
  `provider_dipakai`  VARCHAR(255) NOT NULL,
  `ringkasan`         TEXT NOT NULL,
  `anomali`           TEXT NULL,
  `rekomendasi`       TEXT NULL,
  `dibuat_oleh`       CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  `dibuat_pada`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tipe`              VARCHAR(20) COLLATE utf8mb4_bin NOT NULL DEFAULT 'analisis',
  `metrik`            VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_riwayat_ai_lookup` (`konteks`, `periode_key`, `wilayah_kerja`, `dibuat_pada` DESC),
  KEY `idx_riwayat_analisis_ai_cache_lookup` (`konteks`, `periode_key`, `wilayah_kerja`, `tipe`, `dibuat_pada` DESC),
  KEY `idx_riwayat_analisis_ai_cache_lookup_metrik` (`konteks`, `periode_key`, `wilayah_kerja`, `tipe`, `metrik`, `dibuat_pada` DESC),
  CONSTRAINT `chk_riwayat_analisis_ai_tipe` CHECK (`tipe` IN ('analisis','prediksi'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kolom ke-4 di Postgres sudah dihapus (nomor urut kolom melompat), tidak dimigrasikan.
CREATE TABLE IF NOT EXISTS `foto_kegiatan` (
  `id`                 BIGINT NOT NULL AUTO_INCREMENT,
  `judul`              VARCHAR(500) NOT NULL,
  `deskripsi`          TEXT NULL,
  `diupload_oleh`      CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  `dibuat_pada`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `url_gambar`         TEXT NOT NULL,
  `public_id`          VARCHAR(255) NOT NULL COMMENT 'public_id Cloudinary',
  `jenis_kegiatan_id`  INT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_foto_kegiatan_jenis` (`jenis_kegiatan_id`),
  CONSTRAINT `fk_foto_kegiatan_jenis_kegiatan_id`
    FOREIGN KEY (`jenis_kegiatan_id`) REFERENCES `jenis_kegiatan_foto` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fasilitas_foto` (
  `id`            CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `fasilitas_id`  CHAR(36) COLLATE utf8mb4_bin NOT NULL,
  `kategori`      VARCHAR(20) COLLATE utf8mb4_bin NOT NULL,
  `url`           TEXT NOT NULL,
  `caption`       TEXT NULL,
  `created_at`    DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fasilitas_foto_fasilitas` (`fasilitas_id`),
  CONSTRAINT `fk_fasilitas_foto_fasilitas_id`
    FOREIGN KEY (`fasilitas_id`) REFERENCES `fasilitas_pelabuhan` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_fasilitas_foto_kategori` CHECK (`kategori` IN ('pelabuhan','kegiatan','kantor'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- BATCH 3: KEGIATAN KARANTINA, INSPEKSI, SIMULASI WABAH, SKRINING
-- Catatan umum batch ini:
--  * Kolom `bigint` tanpa default di sumber (kegiatan_phqc, pab, tpp, ttu, malaria_migrasi) dibuat BIGINT AUTO_INCREMENT. Flag identity-nya tidak ada di
--    ekspor dan datanya masuk lewat skrip luar repo, jadi tidak terkonfirmasi; AUTO_INCREMENT
--    aman di kedua kemungkinan (id eksplisit tetap diterima, id kosong diisi otomatis).
--  * Indeks yang sudah tercakup awalan kunci UNIQUE/PK/FK dihapus (kegiatan_cop: wilayah_kerja
--    dan indeks kembar UNIQUE; kegiatan_pesawat: kode_wilker).
--  * Kolom teks pendek/kategorikal -> VARCHAR(255), teks bebas -> TEXT. Ukuran sementara; MariaDB
--    mode strict MENOLAK teks yang kepanjangan (tidak memotong), jadi salah ukur terlihat.
--  * jsonb -> LONGTEXT + CHECK (JSON_VALID). jsonb merapikan urutan kunci/spasi; skrip migrasi
--    memakai JSON.stringify dari objek hasil parse.
-- ---------------------------------------------------------------------

-- Data COP (kedatangan kapal). Kunci upsert sinkronisasi: (wilayah_kerja, nama_kapal, tgl_kedatangan).
-- Kolom kunci bersifat NULLable; seperti Postgres, beberapa baris dengan NULL pada kunci dianggap berbeda.
CREATE TABLE IF NOT EXISTS `kegiatan_cop` (
  `id`                   CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `wilayah_kerja`        VARCHAR(100) COLLATE utf8mb4_bin NULL,
  `nama_kapal`           VARCHAR(255) COLLATE utf8mb4_bin NULL,
  `bendera_kapal`        VARCHAR(255) NULL,
  `negara_kedatangan`    VARCHAR(255) NULL,
  `tgl_kedatangan`       DATE NULL,
  `jml_abk_wna`          INT NULL,
  `jml_abk_wni`          INT NULL,
  `rba`                  VARCHAR(255) NULL,
  `faktor_risiko`        VARCHAR(255) NULL,
  `daerah_terjangkit`    VARCHAR(255) NULL,
  `kelengkapan_dokumen`  VARCHAR(255) NULL,
  `orang_sakit`          VARCHAR(255) NULL,
  `keberadaan_vektor`    VARCHAR(255) NULL,
  `sanitasi`             VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kegiatan_cop_kunci_unik` (`wilayah_kerja`, `nama_kapal`, `tgl_kedatangan`),
  KEY `idx_kegiatan_cop_tgl_kedatangan` (`tgl_kedatangan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kegiatan pesawat. updated_at: trigger Postgres set_updated_at() (BEFORE UPDATE) -> ON UPDATE
-- CURRENT_TIMESTAMP. Beda kecil: hanya berubah bila ada kolom yang berubah, dan nilai yang
-- di-set eksplisit pada UPDATE dihormati (berguna untuk migrasi ulang).
CREATE TABLE IF NOT EXISTS `kegiatan_pesawat` (
  `id`                   CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `kode_wilker`          VARCHAR(50) COLLATE utf8mb4_bin NOT NULL,
  `tanggal`              DATE NOT NULL,
  `maskapai`             VARCHAR(255) NOT NULL,
  `keberangkatan`        VARCHAR(255) NULL,
  `crew_berangkat`       INT NOT NULL DEFAULT 0,
  `penumpang_berangkat`  INT NOT NULL DEFAULT 0,
  `kedatangan`           VARCHAR(255) NULL,
  `crew_datang`          INT NOT NULL DEFAULT 0,
  `penumpang_datang`     INT NOT NULL DEFAULT 0,
  `sklt_male`            INT NOT NULL DEFAULT 0,
  `sklt_female`          INT NOT NULL DEFAULT 0,
  `td_laik_male`         INT NOT NULL DEFAULT 0,
  `td_laik_female`       INT NOT NULL DEFAULT 0,
  `iaos_male`            INT NOT NULL DEFAULT 0,
  `iaos_female`          INT NOT NULL DEFAULT 0,
  `jenazah_male`         INT NOT NULL DEFAULT 0,
  `jenazah_female`       INT NOT NULL DEFAULT 0,
  `kier_male`            INT NOT NULL DEFAULT 0,
  `kier_female`          INT NOT NULL DEFAULT 0,
  `status_data`          VARCHAR(20) COLLATE utf8mb4_bin NOT NULL DEFAULT 'final',
  `status_kirim`         VARCHAR(50) NULL DEFAULT 'draft',
  `created_by`           CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  `created_at`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kegiatan_pesawat_maskapai` (`maskapai`),
  KEY `idx_kegiatan_pesawat_status_data` (`status_data`),
  KEY `idx_kegiatan_pesawat_tanggal` (`tanggal`),
  KEY `idx_kegiatan_pesawat_wilker_tanggal` (`kode_wilker`, `tanggal`),
  CONSTRAINT `fk_kegiatan_pesawat_kode_wilker`
    FOREIGN KEY (`kode_wilker`) REFERENCES `wilker_ref` (`kode`),
  CONSTRAINT `chk_kegiatan_pesawat_status_data` CHECK (`status_data` IN ('final','rencana'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Salinan cadangan Juli-Agustus: di sumber TANPA primary key, TANPA constraint, semua kolom NULL.
-- Dipertahankan apa adanya. Karena tanpa kunci, skrip migrasi harus TRUNCATE sebelum mengisi
-- ulang (jika tidak, baris ganda). Kandidat dibuang bila memang sudah tidak dipakai.
CREATE TABLE IF NOT EXISTS `kegiatan_pesawat_backup_juli_agustus` (
  `id`                   CHAR(36) COLLATE utf8mb4_bin NULL,
  `kode_wilker`          VARCHAR(50) COLLATE utf8mb4_bin NULL,
  `tanggal`              DATE NULL,
  `maskapai`             VARCHAR(255) NULL,
  `keberangkatan`        VARCHAR(255) NULL,
  `crew_berangkat`       INT NULL,
  `penumpang_berangkat`  INT NULL,
  `kedatangan`           VARCHAR(255) NULL,
  `crew_datang`          INT NULL,
  `penumpang_datang`     INT NULL,
  `sklt_male`            INT NULL,
  `sklt_female`          INT NULL,
  `td_laik_male`         INT NULL,
  `td_laik_female`       INT NULL,
  `iaos_male`            INT NULL,
  `iaos_female`          INT NULL,
  `jenazah_male`         INT NULL,
  `jenazah_female`       INT NULL,
  `kier_male`            INT NULL,
  `kier_female`          INT NULL,
  `status_data`          VARCHAR(20) NULL,
  `status_kirim`         VARCHAR(50) NULL,
  `created_by`           CHAR(36) COLLATE utf8mb4_bin NULL,
  `created_at`           DATETIME NULL,
  `updated_at`           DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PHQC (keberangkatan kapal), ~37 ribu baris.
CREATE TABLE IF NOT EXISTS `kegiatan_phqc` (
  `id`                    BIGINT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`         VARCHAR(100) NULL,
  `nama_kapal`            VARCHAR(255) NULL,
  `bendera`               VARCHAR(255) NULL,
  `pelabuhan_tujuan`      VARCHAR(255) NULL,
  `tgl_keberangkatan`     DATE NULL,
  `jml_abk_wna`           INT NULL,
  `jml_abk_wni`           INT NULL,
  `jml_penumpang_wna`     INT NULL,
  `jml_penumpang_wni`     INT NULL,
  `pelabuhan_kedatangan`  VARCHAR(255) NULL,
  `rba`                   VARCHAR(255) NULL,
  `tujuan_berlayar`       VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kegiatan_phqc_tgl_keberangkatan` (`tgl_keberangkatan`),
  KEY `idx_kegiatan_phqc_wilayah_kerja` (`wilayah_kerja`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pab` (
  `id`                    BIGINT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`         VARCHAR(100) NOT NULL,
  `nama_ttu`              VARCHAR(255) NOT NULL,
  `tanggal`               DATE NOT NULL,
  `jumlah_pab_diperiksa`  INT NULL,
  `fisik`                 VARCHAR(255) NULL,
  `kimia`                 VARCHAR(255) NULL,
  `bakteriologis`         VARCHAR(255) NULL,
  `created_at`            DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tpp` (
  `id`                              BIGINT NOT NULL AUTO_INCREMENT,
  `tanggal_kegiatan`                DATE NOT NULL,
  `wilayah_kerja`                   VARCHAR(100) NOT NULL,
  `nama_tpp`                        VARCHAR(255) NOT NULL,
  `jumlah_sampel`                   INT NULL,
  `inspeksi_kesehatan_lingkungan`   VARCHAR(255) NULL,
  `formaldehyde`                    VARCHAR(255) NULL,
  `borax`                           VARCHAR(255) NULL,
  `metyl_yellow`                    VARCHAR(255) NULL,
  `rodamin_b`                       VARCHAR(255) NULL,
  `bakteriologis`                   VARCHAR(255) NULL,
  `hy_rise`                         VARCHAR(255) NULL,
  `keterangan`                      TEXT NULL,
  `created_at`                      DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ttu` (
  `id`                            BIGINT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`                 VARCHAR(100) NOT NULL,
  `nama_ttu`                      VARCHAR(255) NOT NULL,
  `tanggal`                       DATE NOT NULL,
  `lingkungan_luar_halaman`       VARCHAR(255) NULL,
  `ruang_bangunan`                VARCHAR(255) NULL,
  `penyehatan_air`                VARCHAR(255) NULL,
  `penyehatan_udara_ruang`        VARCHAR(255) NULL,
  `pengelolaan_limbah`            VARCHAR(255) NULL,
  `pencahayaan`                   VARCHAR(255) NULL,
  `kebisingan`                    VARCHAR(255) NULL,
  `getaran_diruang_kerja`         VARCHAR(255) NULL,
  `pengendalian_vektor_penyakit`  VARCHAR(255) NULL,
  `instalasi`                     VARCHAR(255) NULL,
  `pemeliharaan_jamban_kamar_mandi` VARCHAR(255) NULL,
  `hasil`                         VARCHAR(255) NULL,
  `created_at`                    DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Di sumber memakai sequence rat_guard_id_seq -> AUTO_INCREMENT.
CREATE TABLE IF NOT EXISTS `rat_guard` (
  `id`             BIGINT NOT NULL AUTO_INCREMENT,
  `wilayah_kerja`  VARCHAR(100) NOT NULL,
  `tanggal`        DATE NOT NULL,
  `jumlah_kapal`   INT NOT NULL DEFAULT 0,
  `pasang`         INT NOT NULL DEFAULT 0,
  `tidak_pasang`   INT NOT NULL DEFAULT 0,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Simulasi wabah kapal. Kolom numeric tanpa presisi -> DECIMAL(38,18) sementara [VERIFIKASI].
CREATE TABLE IF NOT EXISTS `simulasi_wabah_kapal` (
  `id`                           CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `kegiatan_cop_id`              CHAR(36) COLLATE utf8mb4_bin NULL,
  `wilayah_kerja`                VARCHAR(100) NOT NULL,
  `nama_kapal`                   VARCHAR(255) NOT NULL,
  `tanggal_kejadian`             DATE NOT NULL,
  `kategori_penyakit_id`         INT NULL,
  `total_abk`                    INT NOT NULL,
  `abk_bergejala`                INT NOT NULL,
  `r0_override`                  DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `efektivitas_isolasi_persen`   DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `jumlah_tkbm`                  INT NULL,
  `durasi_kontak_jam`            DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `penggunaan_apd_persen`        DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `hasil_kurva_kapal`            LONGTEXT NULL,
  `hasil_kurva_tkbm`             LONGTEXT NULL,
  `r_efektif_kapal`              DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `r_efektif_tkbm`               DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `estimasi_kasus_impor_kota`    DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `rekomendasi_kebijakan`        TEXT NULL,
  `dibuat_oleh`                  CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  `created_at`                   DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `jumlah_petugas_kesehatan`     INT NULL,
  `jumlah_petugas_non_kesehatan` INT NULL,
  `risiko_petugas`               LONGTEXT NULL,
  `r_efektif_tanpa_isolasi`      DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `daftar_kota_tujuan_lanjutan`  LONGTEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (`id`),
  KEY `idx_simulasi_wabah_kapal_cop` (`kegiatan_cop_id`),
  KEY `idx_simulasi_wabah_kapal_kategori` (`kategori_penyakit_id`),
  CONSTRAINT `fk_simulasi_wabah_kapal_kegiatan_cop_id`
    FOREIGN KEY (`kegiatan_cop_id`) REFERENCES `kegiatan_cop` (`id`),
  CONSTRAINT `fk_simulasi_wabah_kapal_kategori_penyakit_id`
    FOREIGN KEY (`kategori_penyakit_id`) REFERENCES `referensi_parameter_penyakit` (`id`),
  CONSTRAINT `chk_simulasi_wabah_kapal_json1` CHECK (`hasil_kurva_kapal` IS NULL OR JSON_VALID(`hasil_kurva_kapal`)),
  CONSTRAINT `chk_simulasi_wabah_kapal_json2` CHECK (`hasil_kurva_tkbm` IS NULL OR JSON_VALID(`hasil_kurva_tkbm`)),
  CONSTRAINT `chk_simulasi_wabah_kapal_json3` CHECK (`risiko_petugas` IS NULL OR JSON_VALID(`risiko_petugas`)),
  CONSTRAINT `chk_simulasi_wabah_kapal_json4` CHECK (JSON_VALID(`daftar_kota_tujuan_lanjutan`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- kode_wilker di sini TIDAK punya FK di sumber (sama dengan sumber).
CREATE TABLE IF NOT EXISTS `simulasi_wabah_pesawat` (
  `id`                      CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `kegiatan_pesawat_id`     CHAR(36) COLLATE utf8mb4_bin NULL,
  `kode_wilker`             VARCHAR(50) COLLATE utf8mb4_bin NOT NULL,
  `nomor_penerbangan`       VARCHAR(100) NULL,
  `tanggal_kejadian`        DATE NOT NULL,
  `kategori_penyakit_id`    INT NULL,
  `total_penumpang`         INT NOT NULL,
  `total_kru`               INT NOT NULL,
  `jumlah_bergejala`        INT NOT NULL,
  `radius_kontak_baris`     INT NULL DEFAULT 2,
  `durasi_penerbangan_jam`  DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `jumlah_ground_crew`      INT NULL,
  `penggunaan_apd_persen`   DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `estimasi_kontak_erat`    INT NULL,
  `daftar_kota_tujuan_lanjutan` LONGTEXT NULL,
  `risiko_ground_crew`      LONGTEXT NULL,
  `rekomendasi_kebijakan`   TEXT NULL,
  `dibuat_oleh`             CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  `created_at`              DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_simulasi_wabah_pesawat_kegiatan` (`kegiatan_pesawat_id`),
  KEY `idx_simulasi_wabah_pesawat_kategori` (`kategori_penyakit_id`),
  CONSTRAINT `fk_simulasi_wabah_pesawat_kegiatan_pesawat_id`
    FOREIGN KEY (`kegiatan_pesawat_id`) REFERENCES `kegiatan_pesawat` (`id`),
  CONSTRAINT `fk_simulasi_wabah_pesawat_kategori_penyakit_id`
    FOREIGN KEY (`kategori_penyakit_id`) REFERENCES `referensi_parameter_penyakit` (`id`),
  CONSTRAINT `chk_simulasi_wabah_pesawat_json1` CHECK (`daftar_kota_tujuan_lanjutan` IS NULL OR JSON_VALID(`daftar_kota_tujuan_lanjutan`)),
  CONSTRAINT `chk_simulasi_wabah_pesawat_json2` CHECK (`risiko_ground_crew` IS NULL OR JSON_VALID(`risiko_ground_crew`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Skrining malaria pada pelaku perjalanan (di Turso ada modul serupa: migrasi_malaria).
CREATE TABLE IF NOT EXISTS `malaria_migrasi` (
  `id`                  BIGINT NOT NULL AUTO_INCREMENT,
  `tgl_kedatangan`      DATE NOT NULL,
  `kode_wilker`         VARCHAR(50) COLLATE utf8mb4_bin NOT NULL,
  `no_kapal_pesawat`    VARCHAR(255) NULL,
  `rute_asal`           VARCHAR(255) NULL,
  `jenis_transportasi`  VARCHAR(20) COLLATE utf8mb4_bin NULL,
  `jml_penumpang`       INT NULL DEFAULT 0,
  `jml_diperiksa`       INT NULL DEFAULT 0,
  `jml_demam`           INT NULL DEFAULT 0,
  `jml_rdt_dilakukan`   INT NULL DEFAULT 0,
  `jml_positif_rdt`     INT NULL DEFAULT 0,
  `jenis_plasmodium`    VARCHAR(100) NULL,
  `ditindaklanjuti`     TINYINT(1) NULL DEFAULT 0,
  `dirujuk_ke`          VARCHAR(255) NULL,
  `keterangan`          TEXT NULL,
  `input_oleh`          VARCHAR(255) NULL,
  `dibuat_pada`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_malaria_migrasi_kode_wilker` (`kode_wilker`),
  CONSTRAINT `fk_malaria_migrasi_kode_wilker`
    FOREIGN KEY (`kode_wilker`) REFERENCES `wilker_ref` (`kode`),
  CONSTRAINT `chk_malaria_migrasi_jenis_transportasi` CHECK (`jenis_transportasi` IN ('Kapal','Pesawat','Feri'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (hiv_data dan tb_data Supabase adalah tabel dummy; sengaja TIDAK dimigrasi. Keputusan pengguna, 26 Okt 2026.)

-- ---------------------------------------------------------------------
-- BATCH 4: SURVEILANS VEKTOR (4 tabel) + 4 TRIGGER HITUNG INDIKATOR
-- Catatan umum batch ini:
--  * Berkas ini memakai DELIMITER (untuk trigger). Aman untuk klien `mariadb`/`mysql` CLI dan
--    phpMyAdmin; TIDAK bisa dijalankan apa adanya lewat mysql2 (Node) tanpa memecah per pernyataan.
--  * Indikator (hi, ci, bi, abj, mbr, mhd, tsi, index_pinjal, hasil_pengamatan, fly_index,
--    kepadatan_kecoa_per_m2) dihitung trigger BEFORE INSERT, SAMA dengan Postgres: hanya saat INSERT,
--    TIDAK dihitung ulang saat UPDATE, dan menimpa nilai yang dikirim klien.
--  * SAKLAR MIGRASI: trigger melewati perhitungan bila variabel sesi @lewati_trigger_hitung
--    TIDAK NULL. Skrip migrasi data menjalankan `SET @lewati_trigger_hitung = 1` pada koneksinya
--    sendiri agar nilai historis dari Supabase tersalin apa adanya (jika tidak, trigger menimpanya
--    dengan hasil hitung ulang). Variabel sesi hanya berlaku di koneksi itu; aplikasi tidak
--    memakainya, jadi INSERT aplikasi tetap menghitung.
--  * Pembagian memakai CAST(... AS DECIMAL(38,18)) agar presisinya eksplisit dan tidak bergantung pada
--    detail internal div_precision_increment. Hasil trigger dibandingkan dengan fungsi plpgsql ASLI di
--    PostgreSQL 16 pada 67.857 baris (203.094 sel): nol perbedaan. Varian tanpa CAST juga cocok pada data
--    uji itu; varian DOUBLE BEDA di 447 sel (mis. 3.13 menjadi 3.12), jadi jangan pakai DOUBLE/FLOAT.
--  * Indeks parsial Postgres (WHERE sub_lokasi IS NOT NULL) tidak ada di MariaDB -> indeks biasa.
--  * Indeks biasa yang kembar dengan UNIQUE (vektor_anopheles, vektor_tikus) dihapus.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `vektor_anopheles` (
  `id`                         BIGINT NOT NULL AUTO_INCREMENT,
  `tgl_survei`                 DATE NOT NULL,
  `kode_wilker`                VARCHAR(50) COLLATE utf8mb4_bin NOT NULL,
  `zona`                       VARCHAR(20) COLLATE utf8mb4_bin NULL,
  `tipe_pengamatan`            VARCHAR(20) COLLATE utf8mb4_bin NOT NULL,
  `metode_tangkap`             VARCHAR(255) NULL,
  `jml_nyamuk`                 INT NULL DEFAULT 0,
  `jml_jam_tangkap`            DECIMAL(38,18) NULL DEFAULT 1 COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `mbr`                        DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `mhd`                        DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `spesies`                    VARCHAR(255) NULL,
  `fase_bulan`                 VARCHAR(100) NULL,
  `suhu_c`                     DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `kelembapan_pct`             DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `cuaca`                      VARCHAR(255) NULL,
  `jumlah_cidukan`             INT NULL,
  `jumlah_larva`               INT NULL,
  `jumlah_jenis_larva`         INT NULL,
  `spesies_larva`              VARCHAR(255) NULL,
  `macam_tempat_perindukan`    VARCHAR(255) NULL,
  `keadaan_tempat_perindukan`  TEXT NULL,
  `dibuat_pada`                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vektor_anopheles_unik` (`tgl_survei`, `kode_wilker`, `zona`, `tipe_pengamatan`),
  KEY `idx_vektor_anopheles_kode_wilker` (`kode_wilker`),
  CONSTRAINT `fk_vektor_anopheles_kode_wilker`
    FOREIGN KEY (`kode_wilker`) REFERENCES `wilker_ref` (`kode`),
  CONSTRAINT `chk_vektor_anopheles_tipe_pengamatan` CHECK (`tipe_pengamatan` IN ('dewasa','larva')),
  CONSTRAINT `chk_vektor_anopheles_zona` CHECK (`zona` IN ('Perimeter','Buffer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kolom ke-5, 16, 17, 20 di Postgres sudah dihapus (nomor urut melompat), tidak dimigrasikan.
CREATE TABLE IF NOT EXISTS `vektor_dbd` (
  `id`                          BIGINT NOT NULL AUTO_INCREMENT,
  `tgl_survei`                  DATE NOT NULL,
  `kode_wilker`                 VARCHAR(50) COLLATE utf8mb4_bin NOT NULL,
  `zona`                        VARCHAR(20) COLLATE utf8mb4_bin NULL,
  `jml_rumah_diperiksa`         INT NOT NULL DEFAULT 0,
  `jml_positif_jentik`          INT NOT NULL DEFAULT 0,
  `hi`                          DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `ci`                          DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `bi`                          DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `abj`                         DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `container_diperiksa`         INT NULL DEFAULT 0,
  `container_positif`           INT NULL DEFAULT 0,
  `tindakan_pengendalian`       TEXT NULL,
  `curah_hujan_mm`              DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `dibuat_pada`                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `minggu_epid`                 VARCHAR(50) NULL,
  `larvasida_gram`              DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `luas_wilayah_fogging_ha`     DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `jml_insektisida_fogging_ml`  DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `sub_lokasi`                  VARCHAR(50) COLLATE utf8mb4_bin NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vektor_dbd_wilker_sub_lokasi` (`kode_wilker`, `sub_lokasi`),
  CONSTRAINT `fk_vektor_dbd_kode_wilker`
    FOREIGN KEY (`kode_wilker`) REFERENCES `wilker_ref` (`kode`),
  CONSTRAINT `chk_vektor_dbd_zona` CHECK (`zona` IN ('Perimeter','Buffer')),
  CONSTRAINT `chk_vektor_dbd_sub_lokasi` CHECK (`sub_lokasi` IS NULL OR `sub_lokasi` IN ('Pelabuhan Umum','TPK Palaran'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vektor_diare` (
  `id`                         BIGINT NOT NULL AUTO_INCREMENT,
  `tgl_kegiatan`               DATE NOT NULL,
  `kode_wilker`                VARCHAR(50) COLLATE utf8mb4_bin NOT NULL,
  `jenis_kegiatan`             VARCHAR(20) COLLATE utf8mb4_bin NOT NULL,
  `lokasi`                     VARCHAR(255) NULL,
  `nilai_hasil_pengamatan`     DECIMAL(38,18) NOT NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `hasil_pengamatan`           VARCHAR(100) NULL COMMENT 'diisi trigger: Memenuhi Syarat / Tidak Memenuhi Syarat',
  `tindakan_pengendalian`      TEXT NULL,
  `insektisida_terpakai_ml`    DECIMAL(38,18) NULL DEFAULT 0 COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `luas_area_semprot_m2`       DECIMAL(38,18) NULL DEFAULT 0 COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `fly_index`                  DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `kepadatan_kecoa_per_m2`     DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `suhu_c`                     DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `kelembapan_pct`             DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `cuaca`                      VARCHAR(255) NULL,
  `curah_hujan_mm`             DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `keterangan`                 TEXT NULL,
  `input_oleh`                 VARCHAR(255) NULL,
  `dibuat_pada`                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vektor_diare_kode_wilker` (`kode_wilker`),
  CONSTRAINT `fk_vektor_diare_kode_wilker`
    FOREIGN KEY (`kode_wilker`) REFERENCES `wilker_ref` (`kode`),
  CONSTRAINT `chk_vektor_diare_jenis_kegiatan` CHECK (`jenis_kegiatan` IN ('lalat','kecoa'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kolom ke-10 di Postgres sudah dihapus (nomor urut melompat), tidak dimigrasikan.
CREATE TABLE IF NOT EXISTS `vektor_tikus` (
  `id`                          BIGINT NOT NULL AUTO_INCREMENT,
  `tgl_survei`                  DATE NOT NULL,
  `kode_wilker`                 VARCHAR(50) COLLATE utf8mb4_bin NOT NULL,
  `area_survei`                 VARCHAR(255) COLLATE utf8mb4_bin NULL,
  `jenis_trap`                  VARCHAR(100) COLLATE utf8mb4_bin NULL,
  `jml_trap_dipasang`           INT NOT NULL DEFAULT 0,
  `jml_trap_tertangkap`         INT NOT NULL DEFAULT 0,
  `tsi`                         DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `spesies_dominan`             VARCHAR(255) NULL,
  `jml_pinjal_ditemukan`        INT NULL DEFAULT 0,
  `index_pinjal`                DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] dihitung trigger; lebar sementara',
  `uji_lab`                     VARCHAR(10) COLLATE utf8mb4_bin NULL DEFAULT 'Tidak',
  `hasil_leptospira`            VARCHAR(20) COLLATE utf8mb4_bin NULL,
  `hasil_pes`                   VARCHAR(20) COLLATE utf8mb4_bin NULL,
  `hasil_hantavirus`            VARCHAR(20) COLLATE utf8mb4_bin NULL,
  `keterangan`                  TEXT NULL,
  `input_oleh`                  VARCHAR(255) NULL,
  `dibuat_pada`                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `jumlah_positif_leptospira`   INT NULL DEFAULT 0,
  `jumlah_positif_pes`          INT NULL DEFAULT 0,
  `jumlah_positif_hantavirus`   INT NULL DEFAULT 0,
  `minggu_epid`                 VARCHAR(50) NULL,
  `rt`                          INT NULL,
  `rn`                          INT NULL,
  `mm`                          INT NULL,
  `jenis_lainnya`               INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unik_tgl_wilker_area_trap` (`tgl_survei`, `kode_wilker`, `area_survei`, `jenis_trap`),
  KEY `idx_vektor_tikus_kode_wilker` (`kode_wilker`),
  CONSTRAINT `fk_vektor_tikus_kode_wilker`
    FOREIGN KEY (`kode_wilker`) REFERENCES `wilker_ref` (`kode`),
  CONSTRAINT `chk_vektor_tikus_uji_lab`          CHECK (`uji_lab` IN ('Ya','Tidak')),
  CONSTRAINT `chk_vektor_tikus_hasil_leptospira` CHECK (`hasil_leptospira` IN ('Negatif','Positif','Pending')),
  CONSTRAINT `chk_vektor_tikus_hasil_pes`        CHECK (`hasil_pes` IN ('Negatif','Positif','Pending')),
  CONSTRAINT `chk_vektor_tikus_hasil_hantavirus` CHECK (`hasil_hantavirus` IN ('Negatif','Positif','Pending'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Trigger hitung indikator (terjemahan hitung_indikator_* plpgsql) ----
DELIMITER //

CREATE OR REPLACE TRIGGER `trg_hitung_anopheles` BEFORE INSERT ON `vektor_anopheles`
FOR EACH ROW
BEGIN
  IF @lewati_trigger_hitung IS NULL
     AND NEW.tipe_pengamatan = 'dewasa' AND COALESCE(NEW.jml_jam_tangkap, 0) > 0 THEN
    SET NEW.mbr = ROUND(CAST(COALESCE(NEW.jml_nyamuk, 0) AS DECIMAL(38,18)) / NEW.jml_jam_tangkap, 3);
    SET NEW.mhd = NEW.mbr;
  END IF;
END//

CREATE OR REPLACE TRIGGER `trg_hitung_dbd` BEFORE INSERT ON `vektor_dbd`
FOR EACH ROW
BEGIN
  IF @lewati_trigger_hitung IS NULL THEN
    IF NEW.jml_rumah_diperiksa > 0 THEN
      SET NEW.hi  = ROUND((CAST(NEW.jml_positif_jentik AS DECIMAL(38,18)) / NEW.jml_rumah_diperiksa) * 100, 2);
      SET NEW.abj = ROUND((1 - CAST(NEW.jml_positif_jentik AS DECIMAL(38,18)) / NEW.jml_rumah_diperiksa) * 100, 2);
      SET NEW.bi  = ROUND((CAST(COALESCE(NEW.container_positif, 0) AS DECIMAL(38,18)) / NEW.jml_rumah_diperiksa) * 100, 2);
    ELSE
      SET NEW.hi = 0, NEW.abj = 0, NEW.bi = 0;
    END IF;

    IF COALESCE(NEW.container_diperiksa, 0) > 0 THEN
      SET NEW.ci = ROUND((CAST(COALESCE(NEW.container_positif, 0) AS DECIMAL(38,18)) / NEW.container_diperiksa) * 100, 2);
    ELSE
      SET NEW.ci = 0;
    END IF;
  END IF;
END//

CREATE OR REPLACE TRIGGER `trg_hitung_diare` BEFORE INSERT ON `vektor_diare`
FOR EACH ROW
BEGIN
  IF @lewati_trigger_hitung IS NULL THEN
    SET NEW.hasil_pengamatan = CASE
      WHEN NEW.nilai_hasil_pengamatan < 2 THEN 'Memenuhi Syarat'
      ELSE 'Tidak Memenuhi Syarat'
    END;

    IF NEW.jenis_kegiatan = 'lalat' THEN
      SET NEW.fly_index = NEW.nilai_hasil_pengamatan;
      SET NEW.kepadatan_kecoa_per_m2 = NULL;
    ELSE
      SET NEW.kepadatan_kecoa_per_m2 = NEW.nilai_hasil_pengamatan;
      SET NEW.fly_index = NULL;
    END IF;
  END IF;
END//

CREATE OR REPLACE TRIGGER `trg_hitung_tikus` BEFORE INSERT ON `vektor_tikus`
FOR EACH ROW
BEGIN
  IF @lewati_trigger_hitung IS NULL THEN
    IF NEW.jml_trap_dipasang > 0 THEN
      SET NEW.tsi = ROUND((CAST(NEW.jml_trap_tertangkap AS DECIMAL(38,18)) / NEW.jml_trap_dipasang) * 100, 2);
    ELSE
      SET NEW.tsi = 0;
    END IF;

    IF COALESCE(NEW.jml_trap_tertangkap, 0) > 0 THEN
      SET NEW.index_pinjal = ROUND(CAST(COALESCE(NEW.jml_pinjal_ditemukan, 0) AS DECIMAL(38,18)) / NEW.jml_trap_tertangkap, 2);
    ELSE
      SET NEW.index_pinjal = 0;
    END IF;
  END IF;
END//

DELIMITER ;

-- ---------------------------------------------------------------------
-- BATCH 5: LINGKUNGAN, PENYAKIT, SKDR, PENGAWASAN KLINIK (9 tabel)
-- Catatan umum batch ini:
--  * Indeks parsial Postgres (laporan_penyakit_emerging: WHERE jenis_periode = ...) -> indeks biasa
--    pada kolom yang sama (MariaDB tidak punya indeks parsial; hasil query tetap sama).
--  * Indeks yang kembar dengan UNIQUE atau tercakup awalan UNIQUE dibuang (hotspot_nasa_kaltim,
--    ispu_stasiun_harian x2, laporan_penyakit_emerging, laporan_penyakit_nasional, skdr_mingguan).
--  * Kunci UNIQUE yang memuat kolom NULL (hotspot.jam_deteksi, ispa_harian.zona) tetap mengizinkan
--    baris ganda dengan NULL, sama dengan Postgres.
--  * `double precision` -> DOUBLE (sama-sama IEEE 754). `time` -> TIME tanpa pecahan detik
--    (pecahan detik diukur oleh supabase-column-stats.sql). text[] -> LONGTEXT JSON.
--  * FK ke auth.users tidak dibuat (Tahap 5): ispa_harian.input_oleh, kualitas_udara_harian.created_by,
--    pengawasan_klinik.submitted_by tetap CHAR(36).
-- ---------------------------------------------------------------------

-- Titik panas NASA FIRMS. latitude/longitude numeric(9,6) -> DECIMAL(9,6) (eksplisit, tidak berubah).
CREATE TABLE IF NOT EXISTS `hotspot_nasa_kaltim` (
  `id`               CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `latitude`         DECIMAL(9,6) NOT NULL,
  `longitude`        DECIMAL(9,6) NOT NULL,
  `tanggal_deteksi`  DATE NOT NULL,
  `jam_deteksi`      VARCHAR(20) COLLATE utf8mb4_bin NULL,
  `confidence`       DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `confidence_asli`  VARCHAR(100) NULL,
  `satelit`          VARCHAR(100) NULL,
  `frp`              DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `sumber_source`    VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  `dibuat_pada`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hotspot_nasa_kaltim_kunci_unik` (`latitude`, `longitude`, `tanggal_deteksi`, `jam_deteksi`, `sumber_source`),
  KEY `idx_hotspot_confidence` (`confidence`),
  KEY `idx_hotspot_tanggal_deteksi` (`tanggal_deteksi` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- kode_wilker tanpa FK di sumber (sama dengan sumber).
CREATE TABLE IF NOT EXISTS `ispa_harian` (
  `id`                  CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `tanggal`             DATE NOT NULL,
  `kode_wilker`         VARCHAR(50) COLLATE utf8mb4_bin NOT NULL,
  `zona`                VARCHAR(100) COLLATE utf8mb4_bin NULL,
  `kasus_ispa_anak`     INT NOT NULL DEFAULT 0,
  `kasus_ispa_dewasa`   INT NOT NULL DEFAULT 0,
  `keterangan`          TEXT NULL,
  `input_oleh`          CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  `dibuat_pada`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ispa_harian_tanggal_wilker_zona_key` (`tanggal`, `kode_wilker`, `zona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data ISPU per stasiun (OpenAQ). Kosong di sumber saat ini. updated_at: TANPA trigger di sumber,
-- jadi hanya DEFAULT (aplikasi yang mengisi saat upsert).
CREATE TABLE IF NOT EXISTS `ispu_stasiun_harian` (
  `id`                    CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `openaq_location_id`    INT NOT NULL,
  `nama_stasiun`          VARCHAR(255) NOT NULL,
  `kabupaten_kota`        VARCHAR(255) NULL,
  `provinsi`              VARCHAR(255) NULL DEFAULT 'Kalimantan Timur',
  `latitude`              DOUBLE NOT NULL,
  `longitude`             DOUBLE NOT NULL,
  `pm10`                  DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `pm25`                  DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `so2`                   DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `co`                    DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `o3`                    DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `no2`                   DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `ispu_pm10`             INT NULL,
  `ispu_pm25`             INT NULL,
  `ispu_so2`              INT NULL,
  `ispu_co`               INT NULL,
  `ispu_o3`               INT NULL,
  `ispu_no2`              INT NULL,
  `ispu_nilai`            INT NOT NULL,
  `ispu_parameter_kritis` VARCHAR(50) NOT NULL,
  `ispu_kategori`         VARCHAR(100) NOT NULL,
  `waktu_pengukuran`      DATETIME NOT NULL,
  `sumber`                VARCHAR(100) NOT NULL DEFAULT 'OpenAQ',
  `raw_response`          LONGTEXT NULL,
  `created_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ispu_stasiun_harian_lokasi_waktu_key` (`openaq_location_id`, `waktu_pengukuran`),
  KEY `idx_ispu_stasiun_harian_waktu` (`waktu_pengukuran` DESC),
  CONSTRAINT `chk_ispu_stasiun_harian_raw_json` CHECK (`raw_response` IS NULL OR JSON_VALID(`raw_response`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kualitas_udara_harian` (
  `id`                CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `tanggal`           DATE NOT NULL,
  `lokasi`            VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  `pm25`              DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `pm10`              DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `suhu`              DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `hcho`              DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `tvoc`              DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `kelembapan`        DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `catatan_evaluasi`  TEXT NULL,
  `status_evaluasi`   VARCHAR(255) NULL,
  `created_at`        DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by`        CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  `ispu_status`       VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kualitas_udara_harian_tanggal_lokasi_key` (`tanggal`, `lokasi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Laporan penyakit emerging (mingguan/bulanan). Daftar CHECK dibangkitkan langsung dari dump.
-- id bigint tanpa default di sumber -> AUTO_INCREMENT (identity tidak terkonfirmasi; superset aman).
CREATE TABLE IF NOT EXISTS `laporan_penyakit_emerging` (
  `id`               BIGINT NOT NULL AUTO_INCREMENT,
  `penyakit`         VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  `negara`           VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  `jenis_periode`    VARCHAR(20)  COLLATE utf8mb4_bin NOT NULL,
  `tahun_epid`       INT NOT NULL,
  `minggu_epid`      INT NOT NULL DEFAULT 0,
  `bulan`            INT NOT NULL DEFAULT 0,
  `jumlah_kasus`     INT NOT NULL DEFAULT 0,
  `jumlah_kematian`  INT NOT NULL DEFAULT 0,
  `sumber`           VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  `dibuat_pada`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `laporan_penyakit_emerging_kunci_unik` (`penyakit`, `negara`, `jenis_periode`, `tahun_epid`, `minggu_epid`, `bulan`, `sumber`),
  KEY `idx_lpe_bulanan` (`jenis_periode`, `tahun_epid`, `bulan`, `penyakit`, `negara`),
  KEY `idx_lpe_mingguan` (`jenis_periode`, `tahun_epid`, `minggu_epid`, `penyakit`, `negara`),
  CONSTRAINT `chk_lpe_jenis_periode` CHECK (`jenis_periode` IN ('mingguan','bulanan')),
  CONSTRAINT `chk_lpe_negara`        CHECK (`negara` IN ('China','Filipina','Hong Kong','Singapura','Vietnam','Malaysia','India','Korea Selatan','Taiwan','Arab Saudi','Jepang','Thailand','Bangladesh')),
  CONSTRAINT `chk_lpe_penyakit`      CHECK (`penyakit` IN ('Listeriosis','Hantavirus','Legionellosis','Infeksi Virus B','Mpox','MERS-CoV','Covid-19','H5N1','Demam Lassa','CCHF','Meningitis','Oropouche','Ebola','Influenza','Nipah'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- updated_at: trigger Postgres set_updated_at_lpn() (BEFORE UPDATE) -> ON UPDATE CURRENT_TIMESTAMP
-- (sama dengan kegiatan_pesawat di batch 3).
CREATE TABLE IF NOT EXISTS `laporan_penyakit_nasional` (
  `id`               CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `penyakit`         VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  `propinsi`         VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  `tahun_epid`       INT NOT NULL,
  `minggu_epid`      INT NOT NULL,
  `jumlah_kasus`     INT NOT NULL DEFAULT 0,
  `jumlah_kematian`  INT NOT NULL DEFAULT 0,
  `sumber`           VARCHAR(100) COLLATE utf8mb4_bin NOT NULL DEFAULT 'manual-gss',
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `laporan_penyakit_nasional_kunci_unik` (`penyakit`, `propinsi`, `tahun_epid`, `minggu_epid`, `sumber`),
  KEY `idx_lpn_penyakit_tahun_minggu` (`penyakit`, `tahun_epid`, `minggu_epid`),
  KEY `idx_lpn_propinsi` (`propinsi`),
  CONSTRAINT `chk_lpn_minggu_epid` CHECK (`minggu_epid` >= 1 AND `minggu_epid` <= 53)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SKDR mingguan. id bigint tanpa default -> AUTO_INCREMENT (identity tidak terkonfirmasi).
-- created_at/updated_at nullable dan TANPA trigger di sumber -> hanya DEFAULT.
CREATE TABLE IF NOT EXISTS `skdr_mingguan` (
  `id`                  BIGINT NOT NULL AUTO_INCREMENT,
  `tahun_epid`          INT NOT NULL,
  `minggu_epid`         SMALLINT NOT NULL,
  `wilayah_kerja`       VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  `jenis_penyakit_id`   SMALLINT NOT NULL,
  `jumlah_kasus`        INT NOT NULL DEFAULT 0,
  `created_at`          DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `skdr_mingguan_kunci_unik` (`tahun_epid`, `minggu_epid`, `wilayah_kerja`, `jenis_penyakit_id`),
  KEY `idx_skdr_mingguan_wilayah_penyakit` (`wilayah_kerja`, `jenis_penyakit_id`, `tahun_epid`, `minggu_epid`),
  KEY `idx_skdr_mingguan_jenis_penyakit` (`jenis_penyakit_id`),
  CONSTRAINT `fk_skdr_mingguan_jenis_penyakit_id`
    FOREIGN KEY (`jenis_penyakit_id`) REFERENCES `skdr_jenis_penyakit` (`nomor`),
  CONSTRAINT `chk_skdr_mingguan_minggu_epid` CHECK (`minggu_epid` >= 1 AND `minggu_epid` <= 53)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pengawasan klinik vaksinasi (daftar periksa). Semua item boolean bisa NULL (belum diisi).
-- item_bermasalah text[] -> LONGTEXT JSON. persentase_kepatuhan numeric tanpa presisi [VERIFIKASI].
CREATE TABLE IF NOT EXISTS `pengawasan_klinik` (
  `id`                            CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `klinik_id`                     CHAR(36) COLLATE utf8mb4_bin NOT NULL,
  `tanggal_kegiatan`              DATE NOT NULL,
  `waktu_mulai_layanan`           TIME NULL,
  `waktu_tutup_layanan`           TIME NULL,
  `papan_nama_vaksinasi`          TINYINT(1) NULL,
  `papan_nama_ruangan_vaksinasi`  TINYINT(1) NULL,
  `ada_vaksinator_bersertifikat`  TINYINT(1) NULL,
  `jumlah_vaksinator`             INT NULL,
  `nomor_sip_dokter`              VARCHAR(255) NULL,
  `nomor_sip_perawat`             VARCHAR(255) NULL,
  `nomor_sip_pj`                  VARCHAR(255) NULL,
  `sio_ada`                       TINYINT(1) NULL,
  `nomor_sio`                     VARCHAR(255) NULL,
  `sio_berlaku_sampai`            DATE NULL,
  `mou_limbah_ada`                TINYINT(1) NULL,
  `mou_limbah_berlaku`            TINYINT(1) NULL,
  `sop_pelayanan_vaksinasi`       TINYINT(1) NULL,
  `sop_syok_anafilaktik`          TINYINT(1) NULL,
  `alur_pelayanan_terpasang`      TINYINT(1) NULL,
  `pendaftaran_komputer_jaringan` TINYINT(1) NULL,
  `ruang_tunggu_terpisah`         TINYINT(1) NULL,
  `ruang_periksa_screening`       TINYINT(1) NULL,
  `ruang_vaksinasi`               TINYINT(1) NULL,
  `ruang_tindakan`                TINYINT(1) NULL,
  `apotek_cold_chain_room`        TINYINT(1) NULL,
  `ruang_laboratorium`            TINYINT(1) NULL,
  `ruang_administrasi_komputer`   TINYINT(1) NULL,
  `toilet_urin`                   TINYINT(1) NULL,
  `vaccine_refrigerator_freezer`  TINYINT(1) NULL,
  `vaccine_carrier`               TINYINT(1) NULL,
  `jenis_pendingin_carrier`       VARCHAR(255) NULL,
  `termometer`                    TINYINT(1) NULL,
  `freeze_tag`                    TINYINT(1) NULL,
  `log_tag`                       TINYINT(1) NULL,
  `form_pencatatan_suhu_manual`   TINYINT(1) NULL,
  `alarm_suhu`                    TINYINT(1) NULL,
  `avr`                           TINYINT(1) NULL,
  `genset`                        TINYINT(1) NULL,
  `anafilaktik_kit`               TINYINT(1) NULL,
  `pengelolaan_limbah_medis`      TINYINT(1) NULL,
  `safety_box`                    TINYINT(1) NULL,
  `tempat_sampah_medis`           TINYINT(1) NULL,
  `tempat_sampah_tertutup`        TINYINT(1) NULL,
  `printer_passbook`              TINYINT(1) NULL,
  `nama_petugas_1`                VARCHAR(255) NULL,
  `nama_petugas_2`                VARCHAR(255) NULL,
  `nama_petugas_3`                VARCHAR(255) NULL,
  `nama_petugas_klinik`           VARCHAR(255) NULL,
  `catatan`                       TEXT NULL,
  `skor_kritikal_gagal`           INT NULL DEFAULT 0,
  `skor_pendukung_gagal`          INT NULL DEFAULT 0,
  `persentase_kepatuhan`          DECIMAL(38,18) NULL COMMENT '[VERIFIKASI] numeric tanpa presisi; lebar sementara',
  `status_kepatuhan`              VARCHAR(100) NULL,
  `item_bermasalah`               LONGTEXT NULL COMMENT 'text[] Postgres -> array JSON',
  `submitted_by`                  CHAR(36) COLLATE utf8mb4_bin NULL COMMENT 'id akun; tanpa FK (Tahap 5)',
  `created_at`                    DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pengawasan_klinik_klinik_id` (`klinik_id`),
  KEY `idx_pengawasan_klinik_status` (`status_kepatuhan`),
  KEY `idx_pengawasan_klinik_tanggal` (`tanggal_kegiatan`),
  CONSTRAINT `fk_pengawasan_klinik_klinik_id`
    FOREIGN KEY (`klinik_id`) REFERENCES `klinik_binaan` (`id`),
  CONSTRAINT `chk_pengawasan_klinik_item_json` CHECK (`item_bermasalah` IS NULL OR JSON_VALID(`item_bermasalah`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pengawasan_klinik_dokumen` (
  `id`                    CHAR(36) COLLATE utf8mb4_bin NOT NULL DEFAULT UUID(),
  `pengawasan_id`         CHAR(36) COLLATE utf8mb4_bin NULL,
  `jenis_dokumen`         VARCHAR(255) NOT NULL,
  `cloudinary_url`        TEXT NOT NULL,
  `cloudinary_public_id`  VARCHAR(255) NOT NULL,
  `uploaded_at`           DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pengawasan_klinik_dokumen_pengawasan` (`pengawasan_id`),
  CONSTRAINT `fk_pengawasan_klinik_dokumen_pengawasan_id`
    FOREIGN KEY (`pengawasan_id`) REFERENCES `pengawasan_klinik` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
