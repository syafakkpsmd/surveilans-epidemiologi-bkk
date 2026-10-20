-- Migrasi: tambah rincian jenis kelamin pada PTM (untuk pie jenis kelamin di info grafis & dashboard).
-- Jalankan SEKALI di Turso HANYA bila tabel posko_ptm_harian sudah dibuat dari versi lama (tanpa jenis kelamin).
-- Bila muncul "duplicate column name", kolomnya sudah ada -- abaikan.
-- Data lama tetap aman: total lama tetap di jumlah_kasus (tampil sebagai "Tanpa rincian" sampai dirinci ulang).
ALTER TABLE posko_ptm_harian ADD COLUMN jumlah_lk INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posko_ptm_harian ADD COLUMN jumlah_pr INTEGER NOT NULL DEFAULT 0;
