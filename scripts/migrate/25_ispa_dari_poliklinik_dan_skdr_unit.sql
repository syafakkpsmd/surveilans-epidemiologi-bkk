-- 25_ispa_dari_poliklinik_dan_skdr_unit.sql  (PostgreSQL)
-- (1) wilayah_ispa.dari_poliklinik: zona Karhutla mana yang kasus ISPA-nya otomatis dihitung dari modul Kunjungan
--     Poliklinik (sebelumnya terkunci di kode lib/karhutla/ispaPoliklinik.ts: WK01 "Klinik Pelabuhan Samarinda").
--     Diatur admin di /dashboard/pengaturan-lokasi-karhutla (centang pada wilayah ISPA).
-- (2) wilker_ref.skdr_unit: unit pelapor SKDR yang SEMUANYA harus melapor agar wilayah dianggap "Sudah"
--     (sebelumnya terkunci di kode lalu-lintas-orang.ts: WK01 harus memuat Palaran DAN Sidomulyo).
--     Kosong = cukup 1 laporan. Diatur admin di /dashboard/pengaturan-wilayah-kerja.
-- Jalankan SETELAH 20_. Aman diulang; isi awal tidak menimpa pengaturan admin.
--   node --env-file=.env.local scripts/migrate/jalankan-sql.mjs scripts/migrate/25_ispa_dari_poliklinik_dan_skdr_unit.sql

BEGIN;

ALTER TABLE wilayah_ispa ADD COLUMN IF NOT EXISTS dari_poliklinik boolean NOT NULL DEFAULT false;

UPDATE wilayah_ispa
   SET dari_poliklinik = true
 WHERE kode_wilker = 'WK01' AND zona = 'Klinik Pelabuhan Samarinda'
   AND NOT EXISTS (SELECT 1 FROM wilayah_ispa WHERE dari_poliklinik);

ALTER TABLE wilker_ref ADD COLUMN IF NOT EXISTS skdr_unit text[] NOT NULL DEFAULT '{}';

UPDATE wilker_ref
   SET skdr_unit = ARRAY['Palaran', 'Sidomulyo']
 WHERE kode = 'WK01'
   AND NOT EXISTS (SELECT 1 FROM wilker_ref WHERE cardinality(skdr_unit) > 0);

COMMIT;

SELECT kode_wilker, zona, dari_poliklinik FROM wilayah_ispa WHERE dari_poliklinik;
SELECT kode, skdr_unit FROM wilker_ref WHERE cardinality(skdr_unit) > 0;
