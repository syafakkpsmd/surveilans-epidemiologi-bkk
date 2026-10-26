-- =====================================================================
-- 03_supabase_views.sql
-- Fungsi, 44 view, dan 2 prosedur Supabase (PostgreSQL) -> MariaDB 10.11
-- Sumber: schema-dump/supabase_schema.json (view_definition + fungsi). Dibuat 24 Okt 2026.
--
-- Prasyarat: 01_turso_modules.sql dan 02_supabase_tables.sql sudah dimuat.
-- Cara pakai (database utf8mb4; berkas ini memakai DELIMITER, jadi muat lewat klien CLI / phpMyAdmin,
-- BUKAN lewat mysql2):
--   docker exec -i mariadb-epic mariadb -uroot -p epic_ai < schema/mariadb/03_supabase_views.sql
-- Idempoten (CREATE OR REPLACE). Pengguna aplikasi perlu SELECT pada view/tabel dan EXECUTE pada fungsi
-- dan prosedur (view dibuat SQL SECURITY INVOKER, jadi hak diperiksa atas pengguna yang memanggil).
--
-- ISI
--   1. Fungsi minggu epidemiologi: epi_week1_start, epi_week_start, mmwr_tahun, mmwr_minggu
--   2. 44 view (urutan mengikuti dependensi)
--   3. Prosedur: status_lapor_bulanan, status_lapor_mingguan  (CALL ..., hasil = result set)
--   Tidak diterjemahkan: is_admin() dan 90+ kebijakan RLS (pembantu RLS Supabase; pemeriksaan role pindah ke
--   server pada Tahap 5), serta 6 trigger yang sudah ada di 02_supabase_tables.sql.
--
-- PEMETAAN PENTING (semua diverifikasi diferensial terhadap PostgreSQL 16 dan fungsi/view ASLI dari dump)
--  * mmwr_week(d) adalah fungsi BERTABEL + CROSS JOIN LATERAL; MariaDB tidak punya keduanya. Dipecah menjadi
--    mmwr_tahun(d) dan mmwr_minggu(d). LATERAL membuang baris bertanggal NULL, jadi tiap view menambah
--    WHERE tanggal IS NOT NULL pada tabel turunan.
--  * Tabel hiv_data / tb_data Supabase dibaca dari sb_hiv_data / sb_tb_data.
--  * EXTRACT(isoyear/week ...) -> YEARWEEK(d, 3) DIV 100 dan WEEK(d, 3) (minggu ISO, BUKAN MMWR).
--  * count(*) FILTER (WHERE c) -> COUNT(CASE WHEN c THEN 1 END);  tanggal + N -> DATE_ADD(.., INTERVAL N DAY)
--    (di MariaDB `tanggal + 4` adalah penjumlahan numerik pada YYYYMMDD dan menghasilkan NULL/salah).
--  * mode() WITHIN GROUP -> ROW_NUMBER() dalam tabel turunan + LEFT JOIN. JANGAN diganti subquery
--    berkorelasi: cache subquery MariaDB memakai kolasi kolom sebagai kunci, sehingga 'Cerah' dan 'cerah'
--    dianggap sama dan hasil salah (terbukti di uji).
--  * Alert SKDR (rata-rata + 2 SD dari 4 minggu sebelumnya) dihitung eksak dari n, sum x, sum x^2 per jendela.
--    Catatan jujur: varian naif STDDEV_POP MariaDB juga sama persis pada 47.916 baris uji (228 tepat di
--    batas), jadi versi eksak ini pengaman, bukan perbaikan bug yang terbukti.
--  * ILIKE -> LOWER(x) LIKE 'pola-huruf-kecil' (eksplisit, tidak bergantung kolasi).
--  * ORDER BY: Postgres menaruh NULL di akhir (ASC), MariaDB di awal; ditambah (kolom IS NULL) bila perlu.
--  * KESETIAAN KOLASI: kolom teks biasa berkolasi utf8mb4_unicode_ci (tidak peka huruf besar/kecil, spasi akhir
--    diabaikan), sedangkan Postgres peka. Pada view, perbandingan/pengelompokan/DISTINCT/TRIM kolom teks
--    diberi COLLATE utf8mb4_nopad_bin supaya hasil sama persis dengan Postgres (mis. 'Memenuhi Syarat' tidak
--    ikut menghitung 'memenuhi syarat'). ORDER BY sengaja tidak diberi COLLATE. DDL tabel tidak diubah.
--  * Semua view lolos mode ONLY_FULL_GROUP_BY (dipaksa di uji), tidak bergantung sql_mode server.
--  * Tipe hasil: boolean (status_alert) kini 0/1; DECIMAL dikembalikan sebagai angka karena lib/db/client.ts
--    memakai decimalNumbers: true.
--  * Beda kecil yang diterima: urutan menurut locale (ORDER BY) bisa beda untuk teks campuran huruf
--    besar/kecil; seri mode() diurutkan menaik menurut kolasi biner.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- FUNGSI MINGGU EPIDEMIOLOGI (terjemahan epi_week_start dan mmwr_week plpgsql)
-- Aturan (sama dengan Postgres dan lib/epi-week.ts): minggu dimulai hari Minggu; minggu 1 dimulai pada
-- Minggu di pekan yang memuat 1 Januari bila 1 Januari jatuh Minggu-Rabu, selain itu Minggu berikutnya.
-- Tanggal sebelum minggu 1 tahun itu masuk tahun sebelumnya. Hari-hari akhir Desember TIDAK dipindah
-- ke tahun berikutnya (sama dengan plpgsql asli; minggu ke-53 dimungkinkan).
--
-- mmwr_week(d) di Postgres adalah fungsi BERTABEL (tahun_epid, minggu_epid) yang dipakai lewat
-- CROSS JOIN LATERAL. MariaDB 10.11 tidak punya fungsi bertabel maupun LATERAL, jadi dipecah menjadi
-- dua fungsi skalar: mmwr_tahun(d) dan mmwr_minggu(d). NULL masuk -> NULL keluar. (Di Postgres baris
-- bertanggal NULL hilang dari hasil LATERAL; view di bawah menambahkan WHERE tanggal IS NOT NULL.)
-- DETERMINISTIC NO SQL: wajib agar fungsi boleh dibuat bila binary log aktif.
-- ---------------------------------------------------------------------
DELIMITER //

CREATE OR REPLACE FUNCTION `epi_week1_start`(p_tahun INT) RETURNS DATE
  DETERMINISTIC NO SQL
BEGIN
  DECLARE jan1 DATE;
  DECLARE jan1_dow INT;
  SET jan1 = MAKEDATE(p_tahun, 1);
  SET jan1_dow = DAYOFWEEK(jan1) - 1;          -- Postgres DOW: Minggu = 0 (MariaDB DAYOFWEEK: Minggu = 1)
  IF jan1_dow <= 3 THEN
    RETURN DATE_SUB(jan1, INTERVAL jan1_dow DAY);
  END IF;
  RETURN DATE_ADD(jan1, INTERVAL (7 - jan1_dow) DAY);
END//

CREATE OR REPLACE FUNCTION `epi_week_start`(p_tahun INT, p_minggu INT) RETURNS DATE
  DETERMINISTIC NO SQL
BEGIN
  RETURN DATE_ADD(epi_week1_start(p_tahun), INTERVAL (p_minggu - 1) * 7 DAY);
END//

CREATE OR REPLACE FUNCTION `mmwr_tahun`(d DATE) RETURNS INT
  DETERMINISTIC NO SQL
BEGIN
  DECLARE yr INT;
  IF d IS NULL THEN
    RETURN NULL;
  END IF;
  SET yr = YEAR(d);
  IF d < epi_week1_start(yr) THEN
    SET yr = yr - 1;
  END IF;
  RETURN yr;
END//

CREATE OR REPLACE FUNCTION `mmwr_minggu`(d DATE) RETURNS INT
  DETERMINISTIC NO SQL
BEGIN
  IF d IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (DATEDIFF(d, epi_week1_start(mmwr_tahun(d))) DIV 7) + 1;
END//

DELIMITER ;

-- ---------------------------------------------------------------------
-- 44 VIEW (dibangkitkan dari teks view_definition di dump; urutan mengikuti dependensi)
-- ---------------------------------------------------------------------
CREATE OR REPLACE SQL SECURITY INVOKER VIEW `v_kegiatan_pesawat_rekap` AS
SELECT kp.id,
    kp.kode_wilker,
    wr.nama AS nama_wilker,
    kp.tanggal,
    mmwr_minggu(kp.tanggal) AS epi_week,
    mmwr_tahun(kp.tanggal) AS tahun,
    kp.status_data,
    kp.maskapai,
    kp.keberangkatan,
    kp.kedatangan,
    kp.crew_berangkat,
    kp.penumpang_berangkat,
    kp.crew_datang,
    kp.penumpang_datang,
    (kp.sklt_male + kp.sklt_female) AS sklt_total,
    (kp.td_laik_male + kp.td_laik_female) AS td_laik_total,
    (kp.iaos_male + kp.iaos_female) AS iaos_total,
    (kp.jenazah_male + kp.jenazah_female) AS jenazah_total,
    (kp.kier_male + kp.kier_female) AS kier_total,
    ((((kp.sklt_male + kp.td_laik_male) + kp.iaos_male) + kp.jenazah_male) + kp.kier_male) AS total_sertifikat_male,
    ((((kp.sklt_female + kp.td_laik_female) + kp.iaos_female) + kp.jenazah_female) + kp.kier_female) AS total_sertifikat_female
FROM kegiatan_pesawat kp
JOIN wilker_ref wr ON wr.kode = kp.kode_wilker
WHERE kp.tanggal IS NOT NULL;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `v_nasional_emerging_mingguan` AS
SELECT penyakit,
    tahun_epid,
    minggu_epid,
    sum(jumlah_kasus) AS total_kasus,
    sum(jumlah_kematian) AS total_kematian
   FROM laporan_penyakit_nasional
  GROUP BY penyakit, tahun_epid, minggu_epid
  ORDER BY penyakit, tahun_epid, minggu_epid;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `v_nasional_emerging_per_propinsi` AS
SELECT penyakit,
    propinsi,
    tahun_epid,
    sum(jumlah_kasus) AS total_kasus,
    sum(jumlah_kematian) AS total_kematian
   FROM laporan_penyakit_nasional
  GROUP BY penyakit, propinsi, tahun_epid
  ORDER BY penyakit, tahun_epid, (sum(jumlah_kasus)) DESC;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_kegiatan_cop_enriched` AS
SELECT k.id,
    k.wilayah_kerja,
    k.nama_kapal,
    k.bendera_kapal COLLATE utf8mb4_nopad_bin AS bendera_kapal,
    k.negara_kedatangan COLLATE utf8mb4_nopad_bin AS negara_kedatangan,
    k.tgl_kedatangan,
    k.jml_abk_wna,
    k.jml_abk_wni,
    k.rba COLLATE utf8mb4_nopad_bin AS rba,
    k.faktor_risiko COLLATE utf8mb4_nopad_bin AS faktor_risiko,
    k.daerah_terjangkit COLLATE utf8mb4_nopad_bin AS daerah_terjangkit,
    k.kelengkapan_dokumen COLLATE utf8mb4_nopad_bin AS kelengkapan_dokumen,
    k.orang_sakit COLLATE utf8mb4_nopad_bin AS orang_sakit,
    k.keberadaan_vektor COLLATE utf8mb4_nopad_bin AS keberadaan_vektor,
    k.sanitasi COLLATE utf8mb4_nopad_bin AS sanitasi,
    k.mw_tahun AS tahun_epid,
    k.mw_minggu AS minggu_epid,
    YEAR(k.tgl_kedatangan) AS tahun_kalender,
    MONTH(k.tgl_kedatangan) AS bulan_kalender,
    (COALESCE(k.jml_abk_wna, 0) + COALESCE(k.jml_abk_wni, 0)) AS total_abk
   FROM (SELECT k.*, mmwr_tahun(k.tgl_kedatangan) AS mw_tahun, mmwr_minggu(k.tgl_kedatangan) AS mw_minggu FROM kegiatan_cop k WHERE k.tgl_kedatangan IS NOT NULL) k
  WHERE (k.tgl_kedatangan IS NOT NULL);

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_bulanan_kategori` AS
SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'negara_kedatangan' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.negara_kedatangan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.negara_kedatangan
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'rba' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.rba), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.rba
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'faktor_risiko' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.faktor_risiko), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.faktor_risiko
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'kelengkapan_dokumen' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.kelengkapan_dokumen), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.kelengkapan_dokumen
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'daerah_terjangkit' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.daerah_terjangkit), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.daerah_terjangkit
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'keberadaan_vektor' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.keberadaan_vektor), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.keberadaan_vektor
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'bendera_kapal' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.bendera_kapal), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.bendera_kapal;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_kegiatan_phqc_enriched` AS
SELECT k.id,
    k.wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja,
    k.nama_kapal COLLATE utf8mb4_nopad_bin AS nama_kapal,
    k.bendera COLLATE utf8mb4_nopad_bin AS bendera,
    k.pelabuhan_tujuan COLLATE utf8mb4_nopad_bin AS pelabuhan_tujuan,
    k.tgl_keberangkatan,
    k.jml_abk_wna,
    k.jml_abk_wni,
    k.jml_penumpang_wna,
    k.jml_penumpang_wni,
    k.pelabuhan_kedatangan COLLATE utf8mb4_nopad_bin AS pelabuhan_kedatangan,
    k.rba COLLATE utf8mb4_nopad_bin AS rba,
    k.tujuan_berlayar COLLATE utf8mb4_nopad_bin AS tujuan_berlayar,
    k.mw_tahun AS tahun_epid,
    k.mw_minggu AS minggu_epid,
    YEAR(k.tgl_keberangkatan) AS tahun_kalender,
    MONTH(k.tgl_keberangkatan) AS bulan_kalender,
    (COALESCE(k.jml_abk_wna, 0) + COALESCE(k.jml_abk_wni, 0)) AS total_abk,
    (COALESCE(k.jml_penumpang_wna, 0) + COALESCE(k.jml_penumpang_wni, 0)) AS total_penumpang
   FROM (SELECT k.*, mmwr_tahun(k.tgl_keberangkatan) AS mw_tahun, mmwr_minggu(k.tgl_keberangkatan) AS mw_minggu FROM kegiatan_phqc k WHERE k.tgl_keberangkatan IS NOT NULL) k
  WHERE (k.tgl_keberangkatan IS NOT NULL);

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_bulanan_kategori_phqc` AS
SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'bendera' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.bendera), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.bendera
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'rba' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.rba), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.rba
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'tujuan_berlayar' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.tujuan_berlayar), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.tujuan_berlayar
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_kedatangan' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.pelabuhan_kedatangan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_kedatangan
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_tujuan' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.pelabuhan_tujuan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_tujuan;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_mingguan_penyakit_emerging` AS
WITH dasar AS (
         SELECT laporan_penyakit_emerging.tahun_epid,
            laporan_penyakit_emerging.minggu_epid,
            laporan_penyakit_emerging.penyakit,
            laporan_penyakit_emerging.negara,
            laporan_penyakit_emerging.jumlah_kasus,
            laporan_penyakit_emerging.jumlah_kematian,
            (laporan_penyakit_emerging.sumber LIKE 'OWID%') AS dari_owid
           FROM laporan_penyakit_emerging
          WHERE (laporan_penyakit_emerging.jenis_periode = 'mingguan')
        ), ada_owid AS (
         SELECT DISTINCT dasar.tahun_epid,
            dasar.minggu_epid,
            dasar.penyakit,
            dasar.negara
           FROM dasar
          WHERE dasar.dari_owid
        )
 SELECT tahun_epid,
    minggu_epid,
    penyakit,
    negara,
    sum(jumlah_kasus) AS total_kasus,
    sum(jumlah_kematian) AS total_kematian
   FROM dasar d
  WHERE (dari_owid OR (NOT (EXISTS ( SELECT 1
           FROM ada_owid o
          WHERE ((o.tahun_epid = d.tahun_epid) AND (o.minggu_epid = d.minggu_epid) AND (o.penyakit = d.penyakit) AND (o.negara = d.negara))))))
  GROUP BY tahun_epid, minggu_epid, penyakit, negara;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_bulanan_penyakit_emerging` AS
WITH asli_dasar AS (
         SELECT laporan_penyakit_emerging.tahun_epid,
            laporan_penyakit_emerging.bulan,
            laporan_penyakit_emerging.penyakit,
            laporan_penyakit_emerging.negara,
            laporan_penyakit_emerging.jumlah_kasus,
            laporan_penyakit_emerging.jumlah_kematian,
            (laporan_penyakit_emerging.sumber LIKE 'OWID%') AS dari_owid
           FROM laporan_penyakit_emerging
          WHERE (laporan_penyakit_emerging.jenis_periode = 'bulanan')
        ), asli_ada_owid AS (
         SELECT DISTINCT asli_dasar.tahun_epid,
            asli_dasar.bulan,
            asli_dasar.penyakit,
            asli_dasar.negara
           FROM asli_dasar
          WHERE asli_dasar.dari_owid
        ), asli AS (
         SELECT d.tahun_epid,
            d.bulan,
            d.penyakit,
            d.negara,
            sum(d.jumlah_kasus) AS jumlah_kasus,
            sum(d.jumlah_kematian) AS jumlah_kematian
           FROM asli_dasar d
          WHERE (d.dari_owid OR (NOT (EXISTS ( SELECT 1
                   FROM asli_ada_owid o
                  WHERE ((o.tahun_epid = d.tahun_epid) AND (o.bulan = d.bulan) AND (o.penyakit = d.penyakit) AND (o.negara = d.negara))))))
          GROUP BY d.tahun_epid, d.bulan, d.penyakit, d.negara
        ), turunan AS (
         SELECT YEAR((DATE_ADD(epi_week_start(view_mingguan_penyakit_emerging.tahun_epid, view_mingguan_penyakit_emerging.minggu_epid), INTERVAL 4 DAY))) AS tahun_epid,
            MONTH((DATE_ADD(epi_week_start(view_mingguan_penyakit_emerging.tahun_epid, view_mingguan_penyakit_emerging.minggu_epid), INTERVAL 4 DAY))) AS bulan,
            view_mingguan_penyakit_emerging.penyakit,
            view_mingguan_penyakit_emerging.negara,
            view_mingguan_penyakit_emerging.total_kasus AS jumlah_kasus,
            view_mingguan_penyakit_emerging.total_kematian AS jumlah_kematian
           FROM view_mingguan_penyakit_emerging
        ), ada_asli AS (
         SELECT DISTINCT asli.tahun_epid,
            asli.bulan,
            asli.penyakit,
            asli.negara
           FROM asli
        )
 SELECT tahun_epid,
    bulan,
    penyakit,
    negara,
    sum(jumlah_kasus) AS total_kasus,
    sum(jumlah_kematian) AS total_kematian
   FROM ( SELECT asli.tahun_epid,
            asli.bulan,
            asli.penyakit,
            asli.negara,
            asli.jumlah_kasus,
            asli.jumlah_kematian,
            true AS prioritas
           FROM asli
        UNION ALL
         SELECT turunan.tahun_epid,
            turunan.bulan,
            turunan.penyakit,
            turunan.negara,
            turunan.jumlah_kasus,
            turunan.jumlah_kematian,
            false
           FROM turunan) g
  WHERE (prioritas OR (NOT (EXISTS ( SELECT 1
           FROM ada_asli a
          WHERE ((a.tahun_epid = g.tahun_epid) AND (a.bulan = g.bulan) AND (a.penyakit = g.penyakit) AND (a.negara = g.negara))))))
  GROUP BY tahun_epid, bulan, penyakit, negara;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_bulanan_ringkasan` AS
SELECT tahun_kalender AS tahun,
    bulan_kalender AS bulan,
    wilayah_kerja,
    count(*) AS jumlah_kapal,
    sum(total_abk) AS total_abk,
    sum(COALESCE(jml_abk_wna, 0)) AS total_abk_wna,
    sum(COALESCE(jml_abk_wni, 0)) AS total_abk_wni
   FROM view_kegiatan_cop_enriched
  GROUP BY tahun_kalender, bulan_kalender, wilayah_kerja
  ORDER BY tahun_kalender, bulan_kalender, (wilayah_kerja IS NULL), wilayah_kerja;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_bulanan_ringkasan_phqc` AS
SELECT tahun_kalender AS tahun,
    bulan_kalender AS bulan,
    wilayah_kerja,
    count(*) AS jumlah_kapal,
    sum(total_abk) AS total_abk,
    sum(COALESCE(jml_abk_wna, 0)) AS total_abk_wna,
    sum(COALESCE(jml_abk_wni, 0)) AS total_abk_wni,
    sum(total_penumpang) AS total_penumpang,
    sum(COALESCE(jml_penumpang_wna, 0)) AS total_penumpang_wna,
    sum(COALESCE(jml_penumpang_wni, 0)) AS total_penumpang_wni
   FROM view_kegiatan_phqc_enriched
  GROUP BY tahun_kalender, bulan_kalender, wilayah_kerja
  ORDER BY tahun_kalender, bulan_kalender, (wilayah_kerja IS NULL), wilayah_kerja;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_hiv_mingguan` AS
SELECT h.mw_tahun AS tahun_epid,
    h.mw_minggu AS minggu_epid,
    h.kode_wilker,
    sum(h.jml_diperiksa) AS total_diperiksa,
    sum(h.jml_reaktif) AS total_reaktif,
    sum(h.jml_konfirmasi_positif) AS total_konfirmasi_positif
   FROM (SELECT h.*, mmwr_tahun(h.tgl_skrining) AS mw_tahun, mmwr_minggu(h.tgl_skrining) AS mw_minggu FROM sb_hiv_data h WHERE h.tgl_skrining IS NOT NULL) h
  GROUP BY h.mw_tahun, h.mw_minggu, h.kode_wilker;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_hotspot_kaltim_bulanan` AS
SELECT YEAR(tanggal_deteksi) AS tahun,
    MONTH(tanggal_deteksi) AS bulan,
    count(*) AS jumlah_hotspot,
    avg(confidence) AS confidence_rerata,
    avg(frp) AS frp_rerata
   FROM hotspot_nasa_kaltim
  GROUP BY (YEAR(tanggal_deteksi)), (MONTH(tanggal_deteksi));

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_hotspot_kaltim_mingguan` AS
SELECT (YEARWEEK(tanggal_deteksi, 3) DIV 100) AS tahun_epid,
    WEEK(tanggal_deteksi, 3) AS minggu_epid,
    count(*) AS jumlah_hotspot,
    avg(confidence) AS confidence_rerata,
    avg(frp) AS frp_rerata
   FROM hotspot_nasa_kaltim
  GROUP BY ((YEARWEEK(tanggal_deteksi, 3) DIV 100)), (WEEK(tanggal_deteksi, 3));

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_karhutla_ispa_bulanan` AS
SELECT YEAR(tanggal) AS tahun,
    MONTH(tanggal) AS bulan,
    kode_wilker,
    zona,
    sum((kasus_ispa_anak + kasus_ispa_dewasa)) AS total_kasus_ispa,
    sum(kasus_ispa_anak) AS total_kasus_anak,
    sum(kasus_ispa_dewasa) AS total_kasus_dewasa,
    count(*) AS jml_input
   FROM ispa_harian
  GROUP BY (YEAR(tanggal)), (MONTH(tanggal)), kode_wilker, zona;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_karhutla_ispa_mingguan` AS
SELECT (YEARWEEK(tanggal, 3) DIV 100) AS tahun_epid,
    WEEK(tanggal, 3) AS minggu_epid,
    kode_wilker,
    zona,
    sum((kasus_ispa_anak + kasus_ispa_dewasa)) AS total_kasus_ispa,
    sum(kasus_ispa_anak) AS total_kasus_anak,
    sum(kasus_ispa_dewasa) AS total_kasus_dewasa,
    count(*) AS jml_input
   FROM ispa_harian
  GROUP BY ((YEARWEEK(tanggal, 3) DIV 100)), (WEEK(tanggal, 3)), kode_wilker, zona;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_kualitas_udara_bulanan` AS
SELECT YEAR(tanggal) AS tahun,
    MONTH(tanggal) AS bulan,
    lokasi,
    avg(pm25) AS pm25_rerata,
    avg(pm10) AS pm10_rerata,
    avg(suhu) AS suhu_rerata,
    COUNT(CASE WHEN (status_evaluasi COLLATE utf8mb4_nopad_bin = 'TMS') THEN 1 END) AS jml_tms,
    count(*) AS jml_input
   FROM kualitas_udara_harian
  GROUP BY (YEAR(tanggal)), (MONTH(tanggal)), lokasi;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_kualitas_udara_mingguan` AS
SELECT (YEARWEEK(tanggal, 3) DIV 100) AS tahun_epid,
    WEEK(tanggal, 3) AS minggu_epid,
    lokasi,
    avg(pm25) AS pm25_rerata,
    avg(pm10) AS pm10_rerata,
    avg(suhu) AS suhu_rerata,
    COUNT(CASE WHEN (status_evaluasi COLLATE utf8mb4_nopad_bin = 'TMS') THEN 1 END) AS jml_tms,
    count(*) AS jml_input
   FROM kualitas_udara_harian
  GROUP BY ((YEARWEEK(tanggal, 3) DIV 100)), (WEEK(tanggal, 3)), lokasi;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_malaria_mingguan` AS
SELECT m.mw_tahun AS tahun_epid,
    m.mw_minggu AS minggu_epid,
    m.kode_wilker,
    sum(m.jml_diperiksa) AS total_diperiksa,
    sum(m.jml_positif_rdt) AS total_positif_rdt,
    sum(m.jml_penumpang) AS total_penumpang
   FROM (SELECT m.*, mmwr_tahun(m.tgl_kedatangan) AS mw_tahun, mmwr_minggu(m.tgl_kedatangan) AS mw_minggu FROM malaria_migrasi m WHERE m.tgl_kedatangan IS NOT NULL) m
  GROUP BY m.mw_tahun, m.mw_minggu, m.kode_wilker;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_mingguan_kategori` AS
SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'negara_kedatangan' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.negara_kedatangan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.negara_kedatangan
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'rba' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.rba), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.rba
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'faktor_risiko' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.faktor_risiko), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.faktor_risiko
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'kelengkapan_dokumen' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.kelengkapan_dokumen), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.kelengkapan_dokumen
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'daerah_terjangkit' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.daerah_terjangkit), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.daerah_terjangkit
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'keberadaan_vektor' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.keberadaan_vektor), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.keberadaan_vektor
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'bendera_kapal' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_cop_enriched.bendera_kapal), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.bendera_kapal;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_mingguan_kategori_phqc` AS
SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'bendera' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.bendera), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.bendera
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'rba' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.rba), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.rba
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'tujuan_berlayar' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.tujuan_berlayar), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.tujuan_berlayar
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_kedatangan' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.pelabuhan_kedatangan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_kedatangan
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_tujuan' AS kategori,
    COALESCE(NULLIF(TRIM(view_kegiatan_phqc_enriched.pelabuhan_tujuan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_tujuan;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_mingguan_ringkasan` AS
SELECT tahun_epid,
    minggu_epid,
    wilayah_kerja,
    count(*) AS jumlah_kapal,
    sum(total_abk) AS total_abk,
    sum(COALESCE(jml_abk_wna, 0)) AS total_abk_wna,
    sum(COALESCE(jml_abk_wni, 0)) AS total_abk_wni
   FROM view_kegiatan_cop_enriched
  GROUP BY tahun_epid, minggu_epid, wilayah_kerja
  ORDER BY tahun_epid, minggu_epid, (wilayah_kerja IS NULL), wilayah_kerja;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_mingguan_ringkasan_phqc` AS
SELECT tahun_epid,
    minggu_epid,
    wilayah_kerja,
    count(*) AS jumlah_kapal,
    sum(total_abk) AS total_abk,
    sum(COALESCE(jml_abk_wna, 0)) AS total_abk_wna,
    sum(COALESCE(jml_abk_wni, 0)) AS total_abk_wni,
    sum(total_penumpang) AS total_penumpang,
    sum(COALESCE(jml_penumpang_wna, 0)) AS total_penumpang_wna,
    sum(COALESCE(jml_penumpang_wni, 0)) AS total_penumpang_wni
   FROM view_kegiatan_phqc_enriched
  GROUP BY tahun_epid, minggu_epid, wilayah_kerja
  ORDER BY tahun_epid, minggu_epid, (wilayah_kerja IS NULL), wilayah_kerja;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_pab_bulanan` AS
SELECT YEAR(tanggal) AS tahun,
    MONTH(tanggal) AS bulan,
    wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja,
    count(*) AS jumlah_pemeriksaan,
    CAST(sum(COALESCE(jumlah_pab_diperiksa, 0)) AS SIGNED) AS total_pab_diperiksa,
    COUNT(CASE WHEN ((LOWER(COALESCE(fisik COLLATE utf8mb4_nopad_bin, 'memenuhi')) LIKE 'memenuhi%') AND (LOWER(COALESCE(kimia COLLATE utf8mb4_nopad_bin, 'memenuhi')) LIKE 'memenuhi%') AND (LOWER(COALESCE(bakteriologis COLLATE utf8mb4_nopad_bin, 'memenuhi')) LIKE 'memenuhi%')) THEN 1 END) AS jumlah_ms,
    COUNT(CASE WHEN ((LOWER(fisik COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') OR (LOWER(kimia COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') OR (LOWER(bakteriologis COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%')) THEN 1 END) AS jumlah_tms,
    COUNT(CASE WHEN (LOWER(fisik COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') THEN 1 END) AS tms_fisik,
    COUNT(CASE WHEN (LOWER(kimia COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') THEN 1 END) AS tms_kimia,
    COUNT(CASE WHEN (LOWER(bakteriologis COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') THEN 1 END) AS tms_bakteriologis,
    COUNT(CASE WHEN (LOWER(fisik COLLATE utf8mb4_nopad_bin) LIKE 'memenuhi%') THEN 1 END) AS ms_fisik,
    COUNT(CASE WHEN (LOWER(kimia COLLATE utf8mb4_nopad_bin) LIKE 'memenuhi%') THEN 1 END) AS ms_kimia,
    COUNT(CASE WHEN (LOWER(bakteriologis COLLATE utf8mb4_nopad_bin) LIKE 'memenuhi%') THEN 1 END) AS ms_bakteriologis
   FROM (SELECT * FROM pab) p
  GROUP BY (YEAR(tanggal)), (MONTH(tanggal)), wilayah_kerja COLLATE utf8mb4_nopad_bin;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_pab_mingguan` AS
SELECT p.mw_tahun AS tahun,
    p.mw_minggu AS minggu,
    p.wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja,
    count(*) AS jumlah_pemeriksaan,
    CAST(sum(COALESCE(p.jumlah_pab_diperiksa, 0)) AS SIGNED) AS total_pab_diperiksa,
    COUNT(CASE WHEN ((LOWER(COALESCE(p.fisik COLLATE utf8mb4_nopad_bin, 'memenuhi')) LIKE 'memenuhi%') AND (LOWER(COALESCE(p.kimia COLLATE utf8mb4_nopad_bin, 'memenuhi')) LIKE 'memenuhi%') AND (LOWER(COALESCE(p.bakteriologis COLLATE utf8mb4_nopad_bin, 'memenuhi')) LIKE 'memenuhi%')) THEN 1 END) AS jumlah_ms,
    COUNT(CASE WHEN ((LOWER(p.fisik COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') OR (LOWER(p.kimia COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') OR (LOWER(p.bakteriologis COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%')) THEN 1 END) AS jumlah_tms,
    COUNT(CASE WHEN (LOWER(p.fisik COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') THEN 1 END) AS tms_fisik,
    COUNT(CASE WHEN (LOWER(p.kimia COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') THEN 1 END) AS tms_kimia,
    COUNT(CASE WHEN (LOWER(p.bakteriologis COLLATE utf8mb4_nopad_bin) LIKE 'tidak memenuhi%') THEN 1 END) AS tms_bakteriologis,
    COUNT(CASE WHEN (LOWER(p.fisik COLLATE utf8mb4_nopad_bin) LIKE 'memenuhi%') THEN 1 END) AS ms_fisik,
    COUNT(CASE WHEN (LOWER(p.kimia COLLATE utf8mb4_nopad_bin) LIKE 'memenuhi%') THEN 1 END) AS ms_kimia,
    COUNT(CASE WHEN (LOWER(p.bakteriologis COLLATE utf8mb4_nopad_bin) LIKE 'memenuhi%') THEN 1 END) AS ms_bakteriologis
   FROM (SELECT p.*, mmwr_tahun(p.tanggal) AS mw_tahun, mmwr_minggu(p.tanggal) AS mw_minggu FROM pab p WHERE p.tanggal IS NOT NULL) p
  GROUP BY p.mw_tahun, p.mw_minggu, p.wilayah_kerja COLLATE utf8mb4_nopad_bin;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_pesawat_kota_bulanan` AS
SELECT t.tahun, t.bulan, t.arah, t.kota,
    COUNT(*) AS jumlah_penerbangan,
    SUM(COALESCE(t.pnp, 0)) AS total_penumpang
FROM (SELECT YEAR(kp.tanggal) AS tahun, MONTH(kp.tanggal) AS bulan, 'kedatangan' AS arah,
             CASE WHEN TRIM(kp.kedatangan COLLATE utf8mb4_nopad_bin) = 'YIA - SIB' THEN 'YOGYAKARTA' WHEN TRIM(kp.kedatangan COLLATE utf8mb4_nopad_bin) = 'MHU-MHU' THEN 'MUARA WAHAU' WHEN TRIM(kp.kedatangan COLLATE utf8mb4_nopad_bin) = 'LNU - AAP -TRK' THEN 'MALINAU' ELSE kp.kedatangan COLLATE utf8mb4_nopad_bin END AS kota, kp.penumpang_datang AS pnp
      FROM kegiatan_pesawat kp
      WHERE kp.kedatangan IS NOT NULL AND kp.kedatangan COLLATE utf8mb4_nopad_bin <> '') t
GROUP BY t.tahun, t.bulan, t.arah, t.kota
UNION ALL
SELECT t.tahun, t.bulan, t.arah, t.kota,
    COUNT(*) AS jumlah_penerbangan,
    SUM(COALESCE(t.pnp, 0)) AS total_penumpang
FROM (SELECT YEAR(kp.tanggal) AS tahun, MONTH(kp.tanggal) AS bulan, 'keberangkatan' AS arah,
             CASE WHEN TRIM(kp.keberangkatan COLLATE utf8mb4_nopad_bin) = 'YIA - SIB' THEN 'SURABAYA' WHEN TRIM(kp.keberangkatan COLLATE utf8mb4_nopad_bin) = 'MHU-MHU' THEN 'MUARA WAHAU' WHEN TRIM(kp.keberangkatan COLLATE utf8mb4_nopad_bin) = 'LNU - AAP -TRK' THEN 'TARAKAN' ELSE kp.keberangkatan COLLATE utf8mb4_nopad_bin END AS kota, kp.penumpang_berangkat AS pnp
      FROM kegiatan_pesawat kp
      WHERE kp.keberangkatan IS NOT NULL AND kp.keberangkatan COLLATE utf8mb4_nopad_bin <> '') t
GROUP BY t.tahun, t.bulan, t.arah, t.kota;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_pesawat_maskapai_bulanan` AS
SELECT YEAR(kp.tanggal) AS tahun,
    MONTH(kp.tanggal) AS bulan,
    'kedatangan' AS arah,
    kp.maskapai COLLATE utf8mb4_nopad_bin AS maskapai,
    COUNT(*) AS jumlah_penerbangan,
    SUM(COALESCE(kp.penumpang_datang, 0)) AS total_penumpang
FROM (SELECT * FROM kegiatan_pesawat) kp
WHERE kp.maskapai IS NOT NULL AND kp.maskapai COLLATE utf8mb4_nopad_bin <> ''
GROUP BY YEAR(kp.tanggal), MONTH(kp.tanggal), kp.maskapai COLLATE utf8mb4_nopad_bin
UNION ALL
SELECT YEAR(kp.tanggal) AS tahun,
    MONTH(kp.tanggal) AS bulan,
    'keberangkatan' AS arah,
    kp.maskapai COLLATE utf8mb4_nopad_bin AS maskapai,
    COUNT(*) AS jumlah_penerbangan,
    SUM(COALESCE(kp.penumpang_berangkat, 0)) AS total_penumpang
FROM (SELECT * FROM kegiatan_pesawat) kp
WHERE kp.maskapai IS NOT NULL AND kp.maskapai COLLATE utf8mb4_nopad_bin <> ''
GROUP BY YEAR(kp.tanggal), MONTH(kp.tanggal), kp.maskapai COLLATE utf8mb4_nopad_bin;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_rat_guard_bulanan` AS
SELECT YEAR(r.tanggal) AS tahun,
    MONTH(r.tanggal) AS bulan,
    r.wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja,
    SUM(r.jumlah_kapal) AS jumlah_kapal,
    SUM(r.pasang) AS pasang,
    SUM(r.tidak_pasang) AS tidak_pasang,
    CASE
        WHEN SUM(r.jumlah_kapal) > 0 THEN ROUND((CAST(SUM(r.pasang) AS DECIMAL(38,18)) / CAST(SUM(r.jumlah_kapal) AS DECIMAL(38,18))) * 100, 1)
        ELSE 0
    END AS persentase_kepatuhan
FROM (SELECT * FROM rat_guard) r
GROUP BY YEAR(r.tanggal), MONTH(r.tanggal), r.wilayah_kerja COLLATE utf8mb4_nopad_bin;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_rat_guard_mingguan` AS
SELECT mw.tahun_epid AS tahun,
    mw.minggu_epid,
    mw.wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja,
    SUM(mw.jumlah_kapal) AS jumlah_kapal,
    SUM(mw.pasang) AS pasang,
    SUM(mw.tidak_pasang) AS tidak_pasang,
    CASE
        WHEN SUM(mw.jumlah_kapal) > 0 THEN ROUND((CAST(SUM(mw.pasang) AS DECIMAL(38,18)) / CAST(SUM(mw.jumlah_kapal) AS DECIMAL(38,18))) * 100, 1)
        ELSE 0
    END AS persentase_kepatuhan
FROM (SELECT r.wilayah_kerja, r.jumlah_kapal, r.pasang, r.tidak_pasang,
             mmwr_tahun(r.tanggal) AS tahun_epid, mmwr_minggu(r.tanggal) AS minggu_epid
      FROM rat_guard r WHERE r.tanggal IS NOT NULL) mw
GROUP BY mw.tahun_epid, mw.minggu_epid, mw.wilayah_kerja COLLATE utf8mb4_nopad_bin;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_skdr_alert_mingguan` AS
SELECT x.id,
    x.tahun_epid,
    x.minggu_epid,
    x.wilayah_kerja,
    x.jenis_penyakit_id,
    x.jenis_penyakit,
    x.jumlah_kasus,
    ROUND(CAST(x.sx AS DECIMAL(38,18)) / NULLIF(x.n, 0), 2) AS rata2_4minggu,
    ROUND(COALESCE(SQRT(CAST(x.n * x.sxx - x.sx * x.sx AS DECIMAL(38,18)) / (x.n * x.n)), 0), 2) AS sd_4minggu,
    ROUND(CAST(x.sx AS DECIMAL(38,18)) / NULLIF(x.n, 0)
          + 2 * COALESCE(SQRT(CAST(x.n * x.sxx - x.sx * x.sx AS DECIMAL(38,18)) / (x.n * x.n)), 0), 2) AS ambang_atas,
    CASE
        WHEN x.n > 0 AND x.jumlah_kasus > 0 AND x.n * x.jumlah_kasus - x.sx > 0
             AND (x.n * x.jumlah_kasus - x.sx) * (x.n * x.jumlah_kasus - x.sx) > 4 * (x.n * x.sxx - x.sx * x.sx)
        THEN TRUE
        ELSE FALSE
    END AS status_alert
FROM (SELECT s.id, s.tahun_epid, s.minggu_epid, s.wilayah_kerja, s.jenis_penyakit_id, jp.jenis_penyakit, s.jumlah_kasus,
             COUNT(s.jumlah_kasus) OVER w AS n,
             SUM(s.jumlah_kasus) OVER w AS sx,
             SUM(s.jumlah_kasus * s.jumlah_kasus) OVER w AS sxx
      FROM skdr_mingguan s
      JOIN skdr_jenis_penyakit jp ON jp.nomor = s.jenis_penyakit_id
      WINDOW w AS (PARTITION BY s.wilayah_kerja, s.jenis_penyakit_id ORDER BY s.tahun_epid, s.minggu_epid
                   ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING)) x
ORDER BY x.wilayah_kerja, x.jenis_penyakit_id, x.tahun_epid, x.minggu_epid;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_tb_mingguan` AS
SELECT t.mw_tahun AS tahun_epid,
    t.mw_minggu AS minggu_epid,
    t.kode_wilker,
    sum(t.jml_suspek) AS total_suspek,
    sum(t.jml_diperiksa_tcm) AS total_diperiksa_tcm,
    sum(t.jml_positif_tcm) AS total_positif_tcm
   FROM (SELECT t.*, mmwr_tahun(t.tgl_penemuan) AS mw_tahun, mmwr_minggu(t.tgl_penemuan) AS mw_minggu FROM sb_tb_data t WHERE t.tgl_penemuan IS NOT NULL) t
  GROUP BY t.mw_tahun, t.mw_minggu, t.kode_wilker;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_tpp_bulanan` AS
SELECT YEAR(tanggal_kegiatan) AS tahun,
    MONTH(tanggal_kegiatan) AS bulan,
    wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja,
    count(*) AS jumlah_tpp_diperiksa,
    CAST(sum(COALESCE(jumlah_sampel, 0)) AS SIGNED) AS total_sampel,
    COUNT(CASE WHEN ((inspeksi_kesehatan_lingkungan COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') AND (COALESCE(formaldehyde COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(borax COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(metyl_yellow COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(rodamin_b COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(bakteriologis COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(hy_rise COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat')) THEN 1 END) AS jumlah_ms,
    COUNT(CASE WHEN ((inspeksi_kesehatan_lingkungan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (formaldehyde COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (borax COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (metyl_yellow COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (rodamin_b COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (bakteriologis COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (hy_rise COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat')) THEN 1 END) AS jumlah_tms,
    COUNT(CASE WHEN (inspeksi_kesehatan_lingkungan COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ikl_ms,
    COUNT(CASE WHEN (inspeksi_kesehatan_lingkungan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS ikl_tms,
    COUNT(CASE WHEN (formaldehyde COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_formaldehyde,
    COUNT(CASE WHEN (borax COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_borax,
    COUNT(CASE WHEN (metyl_yellow COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_metyl_yellow,
    COUNT(CASE WHEN (rodamin_b COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_rodamin_b,
    COUNT(CASE WHEN (bakteriologis COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_bakteriologis,
    COUNT(CASE WHEN (hy_rise COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_hy_rise,
    COUNT(CASE WHEN (formaldehyde COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_formaldehyde,
    COUNT(CASE WHEN (borax COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_borax,
    COUNT(CASE WHEN (metyl_yellow COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_metyl_yellow,
    COUNT(CASE WHEN (rodamin_b COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_rodamin_b,
    COUNT(CASE WHEN (bakteriologis COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_bakteriologis,
    COUNT(CASE WHEN (hy_rise COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_hy_rise
   FROM (SELECT * FROM tpp) tpp
  GROUP BY (YEAR(tanggal_kegiatan)), (MONTH(tanggal_kegiatan)), wilayah_kerja COLLATE utf8mb4_nopad_bin;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_tpp_mingguan` AS
SELECT t.mw_tahun AS tahun,
    t.mw_minggu AS minggu,
    t.wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja,
    count(*) AS jumlah_tpp_diperiksa,
    CAST(sum(COALESCE(t.jumlah_sampel, 0)) AS SIGNED) AS total_sampel,
    COUNT(CASE WHEN ((t.inspeksi_kesehatan_lingkungan COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') AND (COALESCE(t.formaldehyde COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.borax COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.metyl_yellow COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.rodamin_b COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.bakteriologis COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.hy_rise COLLATE utf8mb4_nopad_bin, 'Memenuhi Syarat') = 'Memenuhi Syarat')) THEN 1 END) AS jumlah_ms,
    COUNT(CASE WHEN ((t.inspeksi_kesehatan_lingkungan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (t.formaldehyde COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (t.borax COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (t.metyl_yellow COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (t.rodamin_b COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (t.bakteriologis COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') OR (t.hy_rise COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat')) THEN 1 END) AS jumlah_tms,
    COUNT(CASE WHEN (t.inspeksi_kesehatan_lingkungan COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ikl_ms,
    COUNT(CASE WHEN (t.inspeksi_kesehatan_lingkungan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS ikl_tms,
    COUNT(CASE WHEN (t.formaldehyde COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_formaldehyde,
    COUNT(CASE WHEN (t.borax COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_borax,
    COUNT(CASE WHEN (t.metyl_yellow COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_metyl_yellow,
    COUNT(CASE WHEN (t.rodamin_b COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_rodamin_b,
    COUNT(CASE WHEN (t.bakteriologis COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_bakteriologis,
    COUNT(CASE WHEN (t.hy_rise COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_hy_rise,
    COUNT(CASE WHEN (t.formaldehyde COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_formaldehyde,
    COUNT(CASE WHEN (t.borax COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_borax,
    COUNT(CASE WHEN (t.metyl_yellow COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_metyl_yellow,
    COUNT(CASE WHEN (t.rodamin_b COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_rodamin_b,
    COUNT(CASE WHEN (t.bakteriologis COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_bakteriologis,
    COUNT(CASE WHEN (t.hy_rise COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS ms_hy_rise
   FROM (SELECT t.*, mmwr_tahun(t.tanggal_kegiatan) AS mw_tahun, mmwr_minggu(t.tanggal_kegiatan) AS mw_minggu FROM tpp t WHERE t.tanggal_kegiatan IS NOT NULL) t
  GROUP BY t.mw_tahun, t.mw_minggu, t.wilayah_kerja COLLATE utf8mb4_nopad_bin;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_ttu_bulanan` AS
SELECT YEAR(tanggal) AS tahun,
    MONTH(tanggal) AS bulan,
    wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja,
    count(*) AS jumlah_diperiksa,
    COUNT(CASE WHEN (hasil COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS jumlah_ms,
    COUNT(CASE WHEN (hasil COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS jumlah_tms,
    COUNT(CASE WHEN (lingkungan_luar_halaman COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_lingkungan_luar_halaman,
    COUNT(CASE WHEN (ruang_bangunan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_ruang_bangunan,
    COUNT(CASE WHEN (penyehatan_air COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_penyehatan_air,
    COUNT(CASE WHEN (penyehatan_udara_ruang COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_penyehatan_udara_ruang,
    COUNT(CASE WHEN (pengelolaan_limbah COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_pengelolaan_limbah,
    COUNT(CASE WHEN (pencahayaan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_pencahayaan,
    COUNT(CASE WHEN (kebisingan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_kebisingan,
    COUNT(CASE WHEN (getaran_diruang_kerja COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_getaran_diruang_kerja,
    COUNT(CASE WHEN (pengendalian_vektor_penyakit COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_pengendalian_vektor_penyakit,
    COUNT(CASE WHEN (instalasi COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_instalasi,
    COUNT(CASE WHEN (pemeliharaan_jamban_kamar_mandi COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_pemeliharaan_jamban_kamar_mandi
   FROM (SELECT * FROM ttu) ttu
  GROUP BY (YEAR(tanggal)), (MONTH(tanggal)), wilayah_kerja COLLATE utf8mb4_nopad_bin;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_ttu_mingguan` AS
SELECT t.mw_tahun AS tahun,
    t.mw_minggu AS minggu,
    t.wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja,
    count(*) AS jumlah_diperiksa,
    COUNT(CASE WHEN (t.hasil COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat') THEN 1 END) AS jumlah_ms,
    COUNT(CASE WHEN (t.hasil COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS jumlah_tms,
    COUNT(CASE WHEN (t.lingkungan_luar_halaman COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_lingkungan_luar_halaman,
    COUNT(CASE WHEN (t.ruang_bangunan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_ruang_bangunan,
    COUNT(CASE WHEN (t.penyehatan_air COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_penyehatan_air,
    COUNT(CASE WHEN (t.penyehatan_udara_ruang COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_penyehatan_udara_ruang,
    COUNT(CASE WHEN (t.pengelolaan_limbah COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_pengelolaan_limbah,
    COUNT(CASE WHEN (t.pencahayaan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_pencahayaan,
    COUNT(CASE WHEN (t.kebisingan COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_kebisingan,
    COUNT(CASE WHEN (t.getaran_diruang_kerja COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_getaran_diruang_kerja,
    COUNT(CASE WHEN (t.pengendalian_vektor_penyakit COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_pengendalian_vektor_penyakit,
    COUNT(CASE WHEN (t.instalasi COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_instalasi,
    COUNT(CASE WHEN (t.pemeliharaan_jamban_kamar_mandi COLLATE utf8mb4_nopad_bin = 'Tidak Memenuhi Syarat') THEN 1 END) AS tms_pemeliharaan_jamban_kamar_mandi
   FROM (SELECT t.*, mmwr_tahun(t.tanggal) AS mw_tahun, mmwr_minggu(t.tanggal) AS mw_minggu FROM ttu t WHERE t.tanggal IS NOT NULL) t
  GROUP BY t.mw_tahun, t.mw_minggu, t.wilayah_kerja COLLATE utf8mb4_nopad_bin;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_vektor_anopheles_mingguan` AS
SELECT a.mw_tahun AS tahun_epid,
    a.mw_minggu AS minggu_epid,
    a.kode_wilker,
    a.tipe_pengamatan,
    count(*) AS jml_survei,
    round(avg(a.mbr), 3) AS mbr_rerata,
    round(avg(a.suhu_c), 1) AS suhu_rerata,
    round(avg(a.kelembapan_pct)) AS kelembapan_rerata,
    sum(a.jumlah_larva) AS total_larva,
    sum(a.jumlah_cidukan) AS total_cidukan,
    round(avg(a.mhd), 3) AS mhd_rerata
   FROM (SELECT a.*, mmwr_tahun(a.tgl_survei) AS mw_tahun, mmwr_minggu(a.tgl_survei) AS mw_minggu FROM vektor_anopheles a WHERE a.tgl_survei IS NOT NULL) a
  GROUP BY a.mw_tahun, a.mw_minggu, a.kode_wilker, a.tipe_pengamatan;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_vektor_dbd_mingguan` AS
SELECT d.mw_tahun AS tahun_epid,
    d.mw_minggu AS minggu_epid,
    d.kode_wilker,
    count(*) AS jml_survei,
    round(avg(d.hi), 2) AS hi_rerata,
    round(avg(d.ci), 2) AS ci_rerata,
    round(avg(d.abj), 2) AS abj_rerata,
    sum(d.jml_positif_jentik) AS total_positif_jentik,
    round(avg(d.curah_hujan_mm), 1) AS curah_hujan_rerata,
    round(avg(d.bi), 2) AS bi_rerata
   FROM (SELECT d.*, mmwr_tahun(d.tgl_survei) AS mw_tahun, mmwr_minggu(d.tgl_survei) AS mw_minggu FROM vektor_dbd d WHERE d.tgl_survei IS NOT NULL) d
  GROUP BY d.mw_tahun, d.mw_minggu, d.kode_wilker;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_vektor_diare_bulanan` AS
SELECT g.*, m.cuaca AS cuaca_dominan
FROM (SELECT x.tahun, x.bulan,
    x.kode_wilker,
    x.jenis_kegiatan,
    COUNT(*) AS jml_pengamatan,
    ROUND(AVG(x.fly_index), 2) AS fly_index_rerata,
    ROUND(AVG(x.kepadatan_kecoa_per_m2), 2) AS kepadatan_kecoa_rerata,
    COUNT(CASE WHEN x.hasil_pengamatan COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat' THEN 1 END) AS jml_memenuhi_syarat,
    ROUND(AVG(x.suhu_c), 2) AS suhu_rerata,
    ROUND(AVG(x.kelembapan_pct), 2) AS kelembapan_rerata,
    ROUND(AVG(x.curah_hujan_mm), 2) AS curah_hujan_rerata,
    ROUND(AVG(x.insektisida_terpakai_ml), 2) AS insektisida_rerata,
    ROUND(AVG(x.luas_area_semprot_m2), 2) AS luas_area_rerata
  FROM (SELECT d.*, YEAR(d.tgl_kegiatan) AS tahun, MONTH(d.tgl_kegiatan) AS bulan FROM vektor_diare d WHERE d.tgl_kegiatan IS NOT NULL) x
  GROUP BY x.tahun, x.bulan, x.kode_wilker, x.jenis_kegiatan) g
LEFT JOIN (SELECT q.tahun, q.bulan, q.kode_wilker, q.jenis_kegiatan, q.cuaca
           FROM (SELECT y.tahun, y.bulan, y.kode_wilker, y.jenis_kegiatan, y.cuaca,
                        ROW_NUMBER() OVER (PARTITION BY y.tahun, y.bulan, y.kode_wilker, y.jenis_kegiatan
                                           ORDER BY y.n DESC, y.cuaca ASC) AS rn
                 FROM (SELECT c.tahun, c.bulan, c.kode_wilker, c.jenis_kegiatan, c.cuaca, COUNT(*) AS n
                       FROM (SELECT d.kode_wilker, d.jenis_kegiatan, YEAR(d.tgl_kegiatan) AS tahun, MONTH(d.tgl_kegiatan) AS bulan, d.cuaca COLLATE utf8mb4_nopad_bin AS cuaca
                             FROM vektor_diare d WHERE d.tgl_kegiatan IS NOT NULL AND d.cuaca IS NOT NULL) c
                       GROUP BY c.tahun, c.bulan, c.kode_wilker, c.jenis_kegiatan, c.cuaca) y) q
           WHERE q.rn = 1) m ON m.tahun = g.tahun AND m.bulan = g.bulan AND m.kode_wilker = g.kode_wilker AND m.jenis_kegiatan = g.jenis_kegiatan;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_vektor_diare_mingguan` AS
SELECT g.*, m.cuaca AS cuaca_dominan
FROM (SELECT x.tahun_epid, x.minggu_epid,
    x.kode_wilker,
    x.jenis_kegiatan,
    COUNT(*) AS jml_pengamatan,
    ROUND(AVG(x.fly_index), 2) AS fly_index_rerata,
    ROUND(AVG(x.kepadatan_kecoa_per_m2), 2) AS kepadatan_kecoa_rerata,
    COUNT(CASE WHEN x.hasil_pengamatan COLLATE utf8mb4_nopad_bin = 'Memenuhi Syarat' THEN 1 END) AS jml_memenuhi_syarat,
    ROUND(AVG(x.suhu_c), 2) AS suhu_rerata,
    ROUND(AVG(x.kelembapan_pct), 2) AS kelembapan_rerata,
    ROUND(AVG(x.curah_hujan_mm), 2) AS curah_hujan_rerata,
    ROUND(AVG(x.insektisida_terpakai_ml), 2) AS insektisida_rerata,
    ROUND(AVG(x.luas_area_semprot_m2), 2) AS luas_area_rerata
  FROM (SELECT d.*, mmwr_tahun(d.tgl_kegiatan) AS tahun_epid, mmwr_minggu(d.tgl_kegiatan) AS minggu_epid FROM vektor_diare d WHERE d.tgl_kegiatan IS NOT NULL) x
  GROUP BY x.tahun_epid, x.minggu_epid, x.kode_wilker, x.jenis_kegiatan) g
LEFT JOIN (SELECT q.tahun_epid, q.minggu_epid, q.kode_wilker, q.jenis_kegiatan, q.cuaca
           FROM (SELECT y.tahun_epid, y.minggu_epid, y.kode_wilker, y.jenis_kegiatan, y.cuaca,
                        ROW_NUMBER() OVER (PARTITION BY y.tahun_epid, y.minggu_epid, y.kode_wilker, y.jenis_kegiatan
                                           ORDER BY y.n DESC, y.cuaca ASC) AS rn
                 FROM (SELECT c.tahun_epid, c.minggu_epid, c.kode_wilker, c.jenis_kegiatan, c.cuaca, COUNT(*) AS n
                       FROM (SELECT d.kode_wilker, d.jenis_kegiatan, mmwr_tahun(d.tgl_kegiatan) AS tahun_epid, mmwr_minggu(d.tgl_kegiatan) AS minggu_epid, d.cuaca COLLATE utf8mb4_nopad_bin AS cuaca
                             FROM vektor_diare d WHERE d.tgl_kegiatan IS NOT NULL AND d.cuaca IS NOT NULL) c
                       GROUP BY c.tahun_epid, c.minggu_epid, c.kode_wilker, c.jenis_kegiatan, c.cuaca) y) q
           WHERE q.rn = 1) m ON m.tahun_epid = g.tahun_epid AND m.minggu_epid = g.minggu_epid AND m.kode_wilker = g.kode_wilker AND m.jenis_kegiatan = g.jenis_kegiatan;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_vektor_tikus_bulanan` AS
SELECT YEAR(tgl_survei) AS tahun,
    MONTH(tgl_survei) AS bulan,
    kode_wilker,
    count(*) AS jml_survei,
    round(avg(tsi), 2) AS tsi_rerata,
    round(avg(index_pinjal), 2) AS index_pinjal_rerata,
    sum(COALESCE(jumlah_positif_leptospira, 0)) AS total_positif_leptospira,
    sum(COALESCE(jumlah_positif_pes, 0)) AS total_positif_pes,
    sum(COALESCE(jumlah_positif_hantavirus, 0)) AS total_positif_hantavirus,
    sum(COALESCE(rt, 0)) AS rt,
    sum(COALESCE(rn, 0)) AS rn,
    sum(COALESCE(mm, 0)) AS mm,
    sum(COALESCE(jenis_lainnya, 0)) AS jenis_lainnya,
    sum(COALESCE(jml_trap_dipasang, 0)) AS jml_trap_dipasang,
    sum(COALESCE(jml_trap_tertangkap, 0)) AS jml_trap_tertangkap
   FROM vektor_tikus t
  WHERE (tgl_survei IS NOT NULL)
  GROUP BY (YEAR(tgl_survei)), (MONTH(tgl_survei)), kode_wilker;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_vektor_tikus_mingguan` AS
SELECT t.mw_tahun AS tahun_epid,
    t.mw_minggu AS minggu_epid,
    t.kode_wilker,
    count(*) AS jml_survei,
    round(avg(t.tsi), 2) AS tsi_rerata,
    round(avg(t.index_pinjal), 2) AS index_pinjal_rerata,
    sum(COALESCE(t.jumlah_positif_leptospira, 0)) AS total_positif_leptospira,
    sum(COALESCE(t.jumlah_positif_pes, 0)) AS total_positif_pes,
    sum(COALESCE(t.jumlah_positif_hantavirus, 0)) AS total_positif_hantavirus,
    sum(COALESCE(t.rt, 0)) AS rt,
    sum(COALESCE(t.rn, 0)) AS rn,
    sum(COALESCE(t.mm, 0)) AS mm,
    sum(COALESCE(t.jenis_lainnya, 0)) AS jenis_lainnya,
    sum(COALESCE(t.jml_trap_dipasang, 0)) AS jml_trap_dipasang,
    sum(COALESCE(t.jml_trap_tertangkap, 0)) AS jml_trap_tertangkap
   FROM (SELECT t.*, mmwr_tahun(t.tgl_survei) AS mw_tahun, mmwr_minggu(t.tgl_survei) AS mw_minggu FROM vektor_tikus t WHERE t.tgl_survei IS NOT NULL) t
  GROUP BY t.mw_tahun, t.mw_minggu, t.kode_wilker;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_wilayah_kerja_rat_guard` AS
SELECT DISTINCT wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja
   FROM rat_guard
  ORDER BY wilayah_kerja;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_wilayah_kerja_sanitasi` AS
SELECT DISTINCT tpp.wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja
   FROM tpp
UNION
 SELECT DISTINCT ttu.wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja
   FROM ttu
UNION
 SELECT DISTINCT pab.wilayah_kerja COLLATE utf8mb4_nopad_bin AS wilayah_kerja
   FROM pab
  ORDER BY 1;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW `view_wilayah_kerja_skdr` AS
SELECT DISTINCT wilayah_kerja
   FROM skdr_mingguan
  ORDER BY wilayah_kerja;

-- ---------------------------------------------------------------------
-- PROSEDUR status_lapor_* (terjemahan fungsi bertabel Postgres yang dipanggil lewat supabase.rpc)
-- Pemanggilan: CALL status_lapor_mingguan(2026, 12);  CALL status_lapor_bulanan(2026, 3);
-- Hasil: result set (kode_wilker, kegiatan, jumlah). Dengan mysql2, baris ada pada elemen pertama
-- hasil `execute`/`query` (rows[0]); elemen kedua adalah ResultSetHeader.
-- ---------------------------------------------------------------------
DELIMITER //

CREATE OR REPLACE PROCEDURE `status_lapor_bulanan`(IN p_tahun INT, IN p_bulan INT)
  READS SQL DATA SQL SECURITY INVOKER
BEGIN
  SELECT kode_wilker AS kode_wilker, 'DBD' AS kegiatan, COUNT(*) AS jumlah
  FROM vektor_dbd
  WHERE YEAR(tgl_survei) = p_tahun AND MONTH(tgl_survei) = p_bulan
    AND kode_wilker IN ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  GROUP BY kode_wilker

  UNION ALL

  SELECT kode_wilker, 'Tikus', COUNT(*)
  FROM vektor_tikus
  WHERE YEAR(tgl_survei) = p_tahun AND MONTH(tgl_survei) = p_bulan
    AND kode_wilker IN ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  GROUP BY kode_wilker

  UNION ALL

  SELECT kode_wilker, 'Anoph', COUNT(*)
  FROM vektor_anopheles
  WHERE YEAR(tgl_survei) = p_tahun AND MONTH(tgl_survei) = p_bulan
    AND kode_wilker IN ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  GROUP BY kode_wilker

  UNION ALL

  -- Lalat: pecahan dari vektor_diare, jenis_kegiatan = 'lalat'
  SELECT kode_wilker, 'Lalat', COUNT(*)
  FROM vektor_diare
  WHERE YEAR(tgl_kegiatan) = p_tahun AND MONTH(tgl_kegiatan) = p_bulan
    AND LOWER(jenis_kegiatan) = 'lalat'
    AND kode_wilker IN ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  GROUP BY kode_wilker

  UNION ALL

  -- Kecoa: pecahan dari vektor_diare, jenis_kegiatan = 'kecoa'
  SELECT kode_wilker, 'Kecoa', COUNT(*)
  FROM vektor_diare
  WHERE YEAR(tgl_kegiatan) = p_tahun AND MONTH(tgl_kegiatan) = p_bulan
    AND LOWER(jenis_kegiatan) = 'kecoa'
    AND kode_wilker IN ('WK01','WK02','WK03','WK04','WK05','WK06','WK07')
  GROUP BY kode_wilker

  UNION ALL

  -- TPP: wilayah_kerja berupa nama pendek, dipetakan ke kode_wilker
  SELECT
    CASE t.wk
      WHEN 'Samarinda' THEN 'WK01' WHEN 'Tanjung Santan' THEN 'WK02' WHEN 'Tanjung Laut' THEN 'WK03'
      WHEN 'Lhoktuan' THEN 'WK04' WHEN 'Sangatta' THEN 'WK05' WHEN 'Sangkulirang' THEN 'WK06'
      WHEN 'APT Pranoto' THEN 'WK07'
    END,
    'TPP', COUNT(*)
  FROM (SELECT wilayah_kerja COLLATE utf8mb4_nopad_bin AS wk FROM tpp
        WHERE YEAR(tanggal_kegiatan) = p_tahun AND MONTH(tanggal_kegiatan) = p_bulan
          AND wilayah_kerja COLLATE utf8mb4_nopad_bin IN ('Samarinda','Tanjung Santan','Tanjung Laut','Lhoktuan','Sangatta','Sangkulirang','APT Pranoto')) t
  GROUP BY t.wk

  UNION ALL

  -- TTU: wilayah_kerja berupa nama pendek, dipetakan ke kode_wilker
  SELECT
    CASE t.wk
      WHEN 'Samarinda' THEN 'WK01' WHEN 'Tanjung Santan' THEN 'WK02' WHEN 'Tanjung Laut' THEN 'WK03'
      WHEN 'Lhoktuan' THEN 'WK04' WHEN 'Sangatta' THEN 'WK05' WHEN 'Sangkulirang' THEN 'WK06'
      WHEN 'APT Pranoto' THEN 'WK07'
    END,
    'TTU', COUNT(*)
  FROM (SELECT wilayah_kerja COLLATE utf8mb4_nopad_bin AS wk FROM ttu
        WHERE YEAR(tanggal) = p_tahun AND MONTH(tanggal) = p_bulan
          AND wilayah_kerja COLLATE utf8mb4_nopad_bin IN ('Samarinda','Tanjung Santan','Tanjung Laut','Lhoktuan','Sangatta','Sangkulirang','APT Pranoto')) t
  GROUP BY t.wk

  UNION ALL

  -- PAB: wilayah_kerja berupa nama pendek, dipetakan ke kode_wilker
  SELECT
    CASE t.wk
      WHEN 'Samarinda' THEN 'WK01' WHEN 'Tanjung Santan' THEN 'WK02' WHEN 'Tanjung Laut' THEN 'WK03'
      WHEN 'Lhoktuan' THEN 'WK04' WHEN 'Sangatta' THEN 'WK05' WHEN 'Sangkulirang' THEN 'WK06'
      WHEN 'APT Pranoto' THEN 'WK07'
    END,
    'PAB', COUNT(*)
  FROM (SELECT wilayah_kerja COLLATE utf8mb4_nopad_bin AS wk FROM pab
        WHERE YEAR(tanggal) = p_tahun AND MONTH(tanggal) = p_bulan
          AND wilayah_kerja COLLATE utf8mb4_nopad_bin IN ('Samarinda','Tanjung Santan','Tanjung Laut','Lhoktuan','Sangatta','Sangkulirang','APT Pranoto')) t
  GROUP BY t.wk;
END//

CREATE OR REPLACE PROCEDURE `status_lapor_mingguan`(IN p_tahun INT, IN p_minggu INT)
  READS SQL DATA SQL SECURITY INVOKER
BEGIN
  -- Baris bertanggal NULL tidak ikut (mmwr_tahun/mmwr_minggu(NULL) = NULL, sama dengan LATERAL Postgres)
  SELECT a.kode_wilker AS kode_wilker, 'COP' AS kegiatan, COUNT(*) AS jumlah
  FROM wilker_nama_alias a
  JOIN kegiatan_cop c ON c.wilayah_kerja = a.wilayah_kerja_teks
  WHERE mmwr_tahun(c.tgl_kedatangan) = p_tahun AND mmwr_minggu(c.tgl_kedatangan) = p_minggu
    AND a.kode_wilker IN ('WK01','WK02','WK03','WK04','WK05','WK06')
  GROUP BY a.kode_wilker

  UNION ALL

  SELECT a.kode_wilker, 'PHQC', COUNT(*)
  FROM wilker_nama_alias a
  JOIN kegiatan_phqc p ON p.wilayah_kerja = a.wilayah_kerja_teks
  WHERE mmwr_tahun(p.tgl_keberangkatan) = p_tahun AND mmwr_minggu(p.tgl_keberangkatan) = p_minggu
    AND a.kode_wilker IN ('WK01','WK02','WK03','WK04','WK05','WK06')
  GROUP BY a.kode_wilker

  UNION ALL

  SELECT k.kode_wilker, 'Pesawat', COUNT(*)
  FROM kegiatan_pesawat k
  WHERE mmwr_tahun(k.tanggal) = p_tahun AND mmwr_minggu(k.tanggal) = p_minggu
    AND k.kode_wilker = 'WK07'
    AND k.status_data = 'final'
  GROUP BY k.kode_wilker;
END//

DELIMITER ;
