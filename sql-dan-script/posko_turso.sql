-- ============================================================
-- POSKO NATARU & POSKO IDUL FITRI — skema Turso
-- Jalankan di Turso (shell / dashboard SQL). Aman dijalankan ulang.
-- Satu skema dipakai KEDUA posko; pembedanya kolom `posko` + `tahun`.
--   posko = 'nataru' | 'idul_fitri'
--   tahun = tahun posko (Nataru 2026/2027 => 2026)
-- Singkatan umur: lt5 = kurang dari 5 tahun, ge5 = 5 tahun ke atas
-- ============================================================

-- Periode posko (tanggal mulai-selesai tiap posko). ISI/UBAH sesuai surat edaran.
CREATE TABLE IF NOT EXISTS posko_periode (
  posko           TEXT    NOT NULL CHECK (posko IN ('nataru', 'idul_fitri')),
  tahun           INTEGER NOT NULL,
  nama            TEXT    NOT NULL,
  tanggal_mulai   TEXT    NOT NULL,  -- YYYY-MM-DD
  tanggal_selesai TEXT    NOT NULL,  -- YYYY-MM-DD
  PRIMARY KEY (posko, tahun)
);

-- Penyakit potensial KLB: kasus & kematian per jenis kelamin per kelompok umur
CREATE TABLE IF NOT EXISTS posko_penyakit_harian (
  posko          TEXT    NOT NULL CHECK (posko IN ('nataru', 'idul_fitri')),
  tahun          INTEGER NOT NULL,
  tanggal        TEXT    NOT NULL,   -- YYYY-MM-DD
  wilayah_kerja  TEXT    NOT NULL CHECK (wilayah_kerja IN ('Samarinda', 'APT Pranoto', 'Lhoktuan')),
  jenis_penyakit TEXT    NOT NULL,
  kasus_lk_lt5   INTEGER NOT NULL DEFAULT 0,
  kasus_lk_ge5   INTEGER NOT NULL DEFAULT 0,
  kasus_pr_lt5   INTEGER NOT NULL DEFAULT 0,
  kasus_pr_ge5   INTEGER NOT NULL DEFAULT 0,
  mati_lk_lt5    INTEGER NOT NULL DEFAULT 0,
  mati_lk_ge5    INTEGER NOT NULL DEFAULT 0,
  mati_pr_lt5    INTEGER NOT NULL DEFAULT 0,
  mati_pr_ge5    INTEGER NOT NULL DEFAULT 0,
  diperbarui     TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (posko, tahun, tanggal, wilayah_kerja, jenis_penyakit)
);
CREATE INDEX IF NOT EXISTS idx_posko_penyakit_tanggal ON posko_penyakit_harian (posko, tahun, tanggal);

-- Jumlah kejadian KLB harian
CREATE TABLE IF NOT EXISTS posko_klb_harian (
  posko         TEXT    NOT NULL CHECK (posko IN ('nataru', 'idul_fitri')),
  tahun         INTEGER NOT NULL,
  tanggal       TEXT    NOT NULL,
  wilayah_kerja TEXT    NOT NULL CHECK (wilayah_kerja IN ('Samarinda', 'APT Pranoto', 'Lhoktuan')),
  jumlah_klb    INTEGER NOT NULL DEFAULT 0,
  keterangan    TEXT,
  diperbarui    TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (posko, tahun, tanggal, wilayah_kerja)
);

-- Penyakit tidak menular (PTM)
CREATE TABLE IF NOT EXISTS posko_ptm_harian (
  posko         TEXT    NOT NULL CHECK (posko IN ('nataru', 'idul_fitri')),
  tahun         INTEGER NOT NULL,
  tanggal       TEXT    NOT NULL,
  wilayah_kerja TEXT    NOT NULL CHECK (wilayah_kerja IN ('Samarinda', 'APT Pranoto', 'Lhoktuan')),
  jenis_ptm     TEXT    NOT NULL,
  jumlah_kasus  INTEGER NOT NULL DEFAULT 0,  -- total = laki-laki + perempuan
  jumlah_lk     INTEGER NOT NULL DEFAULT 0,  -- laki-laki
  jumlah_pr     INTEGER NOT NULL DEFAULT 0,  -- perempuan
  diperbarui    TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (posko, tahun, tanggal, wilayah_kerja, jenis_ptm)
);
CREATE INDEX IF NOT EXISTS idx_posko_ptm_tanggal ON posko_ptm_harian (posko, tahun, tanggal);

-- Contoh periode (CONTOH — ganti tanggalnya sesuai surat edaran posko, lalu jalankan):
-- INSERT OR REPLACE INTO posko_periode (posko, tahun, nama, tanggal_mulai, tanggal_selesai) VALUES
--   ('nataru',     2026, 'Posko Nataru 2026/2027', '2026-12-18', '2027-01-04'),
--   ('idul_fitri', 2027, 'Posko Idul Fitri 1448 H', '2027-02-28', '2027-03-20');
