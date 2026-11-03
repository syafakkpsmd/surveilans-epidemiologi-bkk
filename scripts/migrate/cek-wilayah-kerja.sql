-- Daftar SEMUA penulisan wilayah kerja yang ada di data (hanya nama dan jumlah baris, tanpa data pribadi).
-- Tujuan: melihat varian ejaan/huruf/spasi sebelum membuat pemetaan baku (WK01-WK07).
-- Jalankan di MariaDB lokal (HeidiSQL / phpMyAdmin), lalu kirim hasilnya (atau tangkapan layarnya).
--
-- Kolom status: 'baku'    = persis salah satu dari 7 nama pendek yang dipakai kode saat ini
--               'PERIKSA' = ejaan lain (beda huruf besar/kecil, spasi, singkatan, typo, dll.)
-- Kurung siku [ ] pada nilai menampakkan spasi di awal/akhir.
SELECT tabel,
       CONCAT('[', nilai, ']') AS nilai_apa_adanya,
       jumlah,
       CASE WHEN HEX(nilai) IN (HEX('Samarinda'), HEX('APT Pranoto'), HEX('Tanjung Santan'), HEX('Tanjung Laut'),
                                HEX('Lhoktuan'), HEX('Sangatta'), HEX('Sangkulirang'))
            THEN 'baku' ELSE 'PERIKSA' END AS status
FROM (
  SELECT 'data_hiv_vct'          AS tabel, MIN(wilker)        AS nilai, COUNT(*) AS jumlah FROM data_hiv_vct          GROUP BY HEX(wilker)
  UNION ALL SELECT 'data_penumpang_kapal',     MIN(wilker),        COUNT(*) FROM data_penumpang_kapal     GROUP BY HEX(wilker)
  UNION ALL SELECT 'hiv_data',                 MIN(wilayah_kerja), COUNT(*) FROM hiv_data                 GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'kier_kesehatan',           MIN(wilayah_kerja), COUNT(*) FROM kier_kesehatan           GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'kunjungan_poliklinik',     MIN(wilayah_kerja), COUNT(*) FROM kunjungan_poliklinik     GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'migrasi_malaria',          MIN(wilayah_kerja), COUNT(*) FROM migrasi_malaria          GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'siaos',                    MIN(wilayah_kerja), COUNT(*) FROM siaos                    GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'sklt_penumpang',           MIN(wilayah_kerja), COUNT(*) FROM sklt_penumpang           GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'tb_data',                  MIN(wilayah_kerja), COUNT(*) FROM tb_data                  GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'posko_klb_harian',         MIN(wilayah_kerja), COUNT(*) FROM posko_klb_harian         GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'posko_penyakit_harian',    MIN(wilayah_kerja), COUNT(*) FROM posko_penyakit_harian    GROUP BY HEX(wilayah_kerja)
  UNION ALL SELECT 'posko_ptm_harian',         MIN(wilayah_kerja), COUNT(*) FROM posko_ptm_harian         GROUP BY HEX(wilayah_kerja)
) x
ORDER BY (status = 'baku'), tabel, nilai;
