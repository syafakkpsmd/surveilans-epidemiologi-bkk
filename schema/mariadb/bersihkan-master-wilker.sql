-- Dijalankan SEKALI saja, pada database lokal yang sudah pernah menjalankan versi LAMA 02_wilayah_kerja.sql.
-- Tujuan: membuang dua tabel master versi lama (isinya hanya 7 + 14 baris benih) agar dibuat ulang dengan
-- definisi yang SAMA PERSIS seperti di 02_supabase_tables.sql. Kolom `kode_wilker` di tabel data TIDAK disentuh.
-- Setelah ini jalankan berurutan: 02_supabase_tables.sql lalu 03_wilayah_kerja.sql.
DROP TABLE IF EXISTS `wilker_nama_alias`;
DROP TABLE IF EXISTS `wilker_ref`;
