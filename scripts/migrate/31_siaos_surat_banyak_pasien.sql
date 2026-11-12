-- scripts/migrate/31_siaos_surat_banyak_pasien.sql
-- DIANJURKAN, tetapi baru dijalankan atas persetujuan Anda (mengubah satu indeks unik).
--   node --env-file=.env.local scripts/migrate/jalankan-sql-pg.mjs scripts/migrate/31_siaos_surat_banyak_pasien.sql
--
-- Satu surat izin bisa memuat lebih dari satu pasien: pada ekspor Sinkarkes ada nomor surat yang sama dipakai dua pasien berbeda.
-- Indeks unik lama (wilayah_kerja, no_surat) menolak pasien kedua, sehingga SELURUH unggahan yang memuatnya batal.
-- Diganti indeks yang sama dengan kunci pencocokan modul input: (wilayah_kerja, no_surat, nama, tanggal).
-- Baris kembar tetap ditolak; beberapa pasien pada satu surat diizinkan. Data lama memenuhi indeks baru (lebih longgar dari yang lama).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'siaos'::regclass AND conname = 'siaos_uq_siaos_wilayah_surat') THEN
    ALTER TABLE siaos DROP CONSTRAINT siaos_uq_siaos_wilayah_surat;
  ELSE
    DROP INDEX IF EXISTS siaos_uq_siaos_wilayah_surat;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS siaos_uq_wilayah_surat_nama_tanggal ON siaos (wilayah_kerja, no_surat, nama, tanggal);