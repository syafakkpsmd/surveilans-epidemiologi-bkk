-- =====================================================================
-- 05_views.sql  (Tahap 4: 42 view Supabase diterjemahkan ke MariaDB 10.11)
-- Dibuat dari definisi view di supabase_schema.json oleh penerjemah otomatis + 4 penulisan ulang khusus.
-- Tidak termasuk view_hiv_mingguan dan view_tb_mingguan (tabel dummy HIV/TB Supabase dihapus atas permintaan pengguna).
--
-- Syarat: 02_supabase_tables.sql dan 04_fungsi_epid.sql sudah dijalankan.
-- Urutan: view yang hanya bergantung pada tabel (35) lebih dulu, lalu view yang bergantung pada view (7).
--
-- Padanan konstruksi PostgreSQL -> MariaDB:
--   CROSS JOIN LATERAL mmwr_week(X) w(...)     -> mmwr_tahun(X) / mmwr_minggu(X) + JOIN (SELECT 1) ON (X) IS NOT NULL
--                                                 (JOIN itu menggugurkan baris bertanggal NULL, sama seperti PostgreSQL)
--   LATERAL (SELECT EXTRACT(year..), EXTRACT(month..)) -> EXTRACT(YEAR/MONTH FROM X) langsung
--   agg(x) FILTER (WHERE c)                    -> agg(CASE WHEN c THEN x END)
--   EXTRACT(isoyear/week FROM d)               -> YEARWEEK(d, 3) DIV 100 / WEEK(d, 3)   (ISO 8601, sama dengan PostgreSQL)
--   mode() WITHIN GROUP (ORDER BY c)           -> subkueri berkorelasi (paling sering; seri -> nilai terkecil)
--   x::numeric                                 -> CAST(x AS DECIMAL(38,12)) (menjaga ketelitian pembagian)
--   x::text / ::integer / ::date, ~~           -> dihapus / LIKE
-- Hal yang BERBEDA secara perilaku dan perlu diverifikasi dengan data asli (alat pembanding):
--   * Pembandingan teks di MariaDB tidak peka huruf besar/kecil (utf8mb4_unicode_ci); di PostgreSQL peka.
--   * AVG()/ROUND() atas bilangan bulat: ketelitian desimal antar-mesin bisa berbeda di digit terakhir.
-- =====================================================================
SET NAMES utf8mb4;


-- tingkat 1
CREATE OR REPLACE VIEW `v_kegiatan_pesawat_rekap` AS
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
   FROM ((kegiatan_pesawat kp
     JOIN wilker_ref wr ON ((wr.kode = kp.kode_wilker)))
     JOIN (SELECT 1 AS _x) ew ON (kp.tanggal) IS NOT NULL);

-- tingkat 1
CREATE OR REPLACE VIEW `v_nasional_emerging_mingguan` AS
SELECT penyakit,
    tahun_epid,
    minggu_epid,
    sum(jumlah_kasus) AS total_kasus,
    sum(jumlah_kematian) AS total_kematian
   FROM laporan_penyakit_nasional
  GROUP BY penyakit, tahun_epid, minggu_epid
  ORDER BY penyakit, tahun_epid, minggu_epid;

-- tingkat 1
CREATE OR REPLACE VIEW `v_nasional_emerging_per_propinsi` AS
SELECT penyakit,
    propinsi,
    tahun_epid,
    sum(jumlah_kasus) AS total_kasus,
    sum(jumlah_kematian) AS total_kematian
   FROM laporan_penyakit_nasional
  GROUP BY penyakit, propinsi, tahun_epid
  ORDER BY penyakit, tahun_epid, (sum(jumlah_kasus)) DESC;

-- tingkat 1
CREATE OR REPLACE VIEW `view_hotspot_kaltim_bulanan` AS
SELECT (EXTRACT(YEAR FROM tanggal_deteksi)) AS tahun,
    (EXTRACT(MONTH FROM tanggal_deteksi)) AS bulan,
    count(*) AS jumlah_hotspot,
    avg(confidence) AS confidence_rerata,
    avg(frp) AS frp_rerata
   FROM hotspot_nasa_kaltim
  GROUP BY ((EXTRACT(YEAR FROM tanggal_deteksi))), ((EXTRACT(MONTH FROM tanggal_deteksi)));

-- tingkat 1
CREATE OR REPLACE VIEW `view_hotspot_kaltim_mingguan` AS
SELECT ((YEARWEEK(tanggal_deteksi, 3) DIV 100)) AS tahun_epid,
    (WEEK(tanggal_deteksi, 3)) AS minggu_epid,
    count(*) AS jumlah_hotspot,
    avg(confidence) AS confidence_rerata,
    avg(frp) AS frp_rerata
   FROM hotspot_nasa_kaltim
  GROUP BY (((YEARWEEK(tanggal_deteksi, 3) DIV 100))), ((WEEK(tanggal_deteksi, 3)));

-- tingkat 1
CREATE OR REPLACE VIEW `view_karhutla_ispa_bulanan` AS
SELECT (EXTRACT(YEAR FROM tanggal)) AS tahun,
    (EXTRACT(MONTH FROM tanggal)) AS bulan,
    kode_wilker,
    zona,
    sum((kasus_ispa_anak + kasus_ispa_dewasa)) AS total_kasus_ispa,
    sum(kasus_ispa_anak) AS total_kasus_anak,
    sum(kasus_ispa_dewasa) AS total_kasus_dewasa,
    count(*) AS jml_input
   FROM ispa_harian
  GROUP BY ((EXTRACT(YEAR FROM tanggal))), ((EXTRACT(MONTH FROM tanggal))), kode_wilker, zona;

-- tingkat 1
CREATE OR REPLACE VIEW `view_karhutla_ispa_mingguan` AS
SELECT ((YEARWEEK(tanggal, 3) DIV 100)) AS tahun_epid,
    (WEEK(tanggal, 3)) AS minggu_epid,
    kode_wilker,
    zona,
    sum((kasus_ispa_anak + kasus_ispa_dewasa)) AS total_kasus_ispa,
    sum(kasus_ispa_anak) AS total_kasus_anak,
    sum(kasus_ispa_dewasa) AS total_kasus_dewasa,
    count(*) AS jml_input
   FROM ispa_harian
  GROUP BY (((YEARWEEK(tanggal, 3) DIV 100))), ((WEEK(tanggal, 3))), kode_wilker, zona;

-- tingkat 1
CREATE OR REPLACE VIEW `view_kegiatan_cop_enriched` AS
SELECT k.id,
    k.wilayah_kerja,
    k.nama_kapal,
    k.bendera_kapal,
    k.negara_kedatangan,
    k.tgl_kedatangan,
    k.jml_abk_wna,
    k.jml_abk_wni,
    k.rba,
    k.faktor_risiko,
    k.daerah_terjangkit,
    k.kelengkapan_dokumen,
    k.orang_sakit,
    k.keberadaan_vektor,
    k.sanitasi,
    mmwr_tahun(k.tgl_kedatangan),
    mmwr_minggu(k.tgl_kedatangan),
    (EXTRACT(YEAR FROM k.tgl_kedatangan)) AS tahun_kalender,
    (EXTRACT(MONTH FROM k.tgl_kedatangan)) AS bulan_kalender,
    (COALESCE(k.jml_abk_wna, 0) + COALESCE(k.jml_abk_wni, 0)) AS total_abk
   FROM (kegiatan_cop k
     JOIN (SELECT 1 AS _x) mw ON (k.tgl_kedatangan) IS NOT NULL)
  WHERE (k.tgl_kedatangan IS NOT NULL);

-- tingkat 1
CREATE OR REPLACE VIEW `view_kegiatan_phqc_enriched` AS
SELECT k.id,
    k.wilayah_kerja,
    k.nama_kapal,
    k.bendera,
    k.pelabuhan_tujuan,
    k.tgl_keberangkatan,
    k.jml_abk_wna,
    k.jml_abk_wni,
    k.jml_penumpang_wna,
    k.jml_penumpang_wni,
    k.pelabuhan_kedatangan,
    k.rba,
    k.tujuan_berlayar,
    mmwr_tahun(k.tgl_keberangkatan),
    mmwr_minggu(k.tgl_keberangkatan),
    (EXTRACT(YEAR FROM k.tgl_keberangkatan)) AS tahun_kalender,
    (EXTRACT(MONTH FROM k.tgl_keberangkatan)) AS bulan_kalender,
    (COALESCE(k.jml_abk_wna, 0) + COALESCE(k.jml_abk_wni, 0)) AS total_abk,
    (COALESCE(k.jml_penumpang_wna, 0) + COALESCE(k.jml_penumpang_wni, 0)) AS total_penumpang
   FROM (kegiatan_phqc k
     JOIN (SELECT 1 AS _x) mw ON (k.tgl_keberangkatan) IS NOT NULL)
  WHERE (k.tgl_keberangkatan IS NOT NULL);

-- tingkat 1
CREATE OR REPLACE VIEW `view_kualitas_udara_bulanan` AS
SELECT (EXTRACT(YEAR FROM tanggal)) AS tahun,
    (EXTRACT(MONTH FROM tanggal)) AS bulan,
    lokasi,
    avg(pm25) AS pm25_rerata,
    avg(pm10) AS pm10_rerata,
    avg(suhu) AS suhu_rerata,
    COUNT(CASE WHEN (status_evaluasi = 'TMS') THEN 1 END) AS jml_tms,
    count(*) AS jml_input
   FROM kualitas_udara_harian
  GROUP BY ((EXTRACT(YEAR FROM tanggal))), ((EXTRACT(MONTH FROM tanggal))), lokasi;

-- tingkat 1
CREATE OR REPLACE VIEW `view_kualitas_udara_mingguan` AS
SELECT ((YEARWEEK(tanggal, 3) DIV 100)) AS tahun_epid,
    (WEEK(tanggal, 3)) AS minggu_epid,
    lokasi,
    avg(pm25) AS pm25_rerata,
    avg(pm10) AS pm10_rerata,
    avg(suhu) AS suhu_rerata,
    COUNT(CASE WHEN (status_evaluasi = 'TMS') THEN 1 END) AS jml_tms,
    count(*) AS jml_input
   FROM kualitas_udara_harian
  GROUP BY (((YEARWEEK(tanggal, 3) DIV 100))), ((WEEK(tanggal, 3))), lokasi;

-- tingkat 1
CREATE OR REPLACE VIEW `view_malaria_mingguan` AS
SELECT mmwr_tahun(m.tgl_kedatangan),
    mmwr_minggu(m.tgl_kedatangan),
    m.kode_wilker,
    sum(m.jml_diperiksa) AS total_diperiksa,
    sum(m.jml_positif_rdt) AS total_positif_rdt,
    sum(m.jml_penumpang) AS total_penumpang
   FROM (malaria_migrasi m
     JOIN (SELECT 1 AS _x) w ON (m.tgl_kedatangan) IS NOT NULL)
  GROUP BY mmwr_tahun(m.tgl_kedatangan), mmwr_minggu(m.tgl_kedatangan), m.kode_wilker;

-- tingkat 1
CREATE OR REPLACE VIEW `view_mingguan_penyakit_emerging` AS
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

-- tingkat 1
CREATE OR REPLACE VIEW `view_pab_bulanan` AS
SELECT (EXTRACT(YEAR FROM tanggal)) AS tahun,
    (EXTRACT(MONTH FROM tanggal)) AS bulan,
    wilayah_kerja,
    (count(*)) AS jumlah_pemeriksaan,
    (sum(COALESCE(jumlah_pab_diperiksa, 0))) AS total_pab_diperiksa,
    (COUNT(CASE WHEN ((COALESCE(fisik, 'memenuhi') ~~* 'memenuhi%') AND (COALESCE(kimia, 'memenuhi') ~~* 'memenuhi%') AND (COALESCE(bakteriologis, 'memenuhi') ~~* 'memenuhi%')) THEN 1 END)) AS jumlah_ms,
    (COUNT(CASE WHEN ((fisik ~~* 'tidak memenuhi%') OR (kimia ~~* 'tidak memenuhi%') OR (bakteriologis ~~* 'tidak memenuhi%')) THEN 1 END)) AS jumlah_tms,
    (COUNT(CASE WHEN (fisik ~~* 'tidak memenuhi%') THEN 1 END)) AS tms_fisik,
    (COUNT(CASE WHEN (kimia ~~* 'tidak memenuhi%') THEN 1 END)) AS tms_kimia,
    (COUNT(CASE WHEN (bakteriologis ~~* 'tidak memenuhi%') THEN 1 END)) AS tms_bakteriologis,
    (COUNT(CASE WHEN (fisik ~~* 'memenuhi%') THEN 1 END)) AS ms_fisik,
    (COUNT(CASE WHEN (kimia ~~* 'memenuhi%') THEN 1 END)) AS ms_kimia,
    (COUNT(CASE WHEN (bakteriologis ~~* 'memenuhi%') THEN 1 END)) AS ms_bakteriologis
   FROM pab p
  GROUP BY ((EXTRACT(YEAR FROM tanggal))), ((EXTRACT(MONTH FROM tanggal))), wilayah_kerja;

-- tingkat 1
CREATE OR REPLACE VIEW `view_pab_mingguan` AS
SELECT mmwr_tahun(p.tanggal) AS tahun,
    mmwr_minggu(p.tanggal) AS minggu,
    p.wilayah_kerja,
    (count(*)) AS jumlah_pemeriksaan,
    (sum(COALESCE(p.jumlah_pab_diperiksa, 0))) AS total_pab_diperiksa,
    (COUNT(CASE WHEN ((COALESCE(p.fisik, 'memenuhi') ~~* 'memenuhi%') AND (COALESCE(p.kimia, 'memenuhi') ~~* 'memenuhi%') AND (COALESCE(p.bakteriologis, 'memenuhi') ~~* 'memenuhi%')) THEN 1 END)) AS jumlah_ms,
    (COUNT(CASE WHEN ((p.fisik ~~* 'tidak memenuhi%') OR (p.kimia ~~* 'tidak memenuhi%') OR (p.bakteriologis ~~* 'tidak memenuhi%')) THEN 1 END)) AS jumlah_tms,
    (COUNT(CASE WHEN (p.fisik ~~* 'tidak memenuhi%') THEN 1 END)) AS tms_fisik,
    (COUNT(CASE WHEN (p.kimia ~~* 'tidak memenuhi%') THEN 1 END)) AS tms_kimia,
    (COUNT(CASE WHEN (p.bakteriologis ~~* 'tidak memenuhi%') THEN 1 END)) AS tms_bakteriologis,
    (COUNT(CASE WHEN (p.fisik ~~* 'memenuhi%') THEN 1 END)) AS ms_fisik,
    (COUNT(CASE WHEN (p.kimia ~~* 'memenuhi%') THEN 1 END)) AS ms_kimia,
    (COUNT(CASE WHEN (p.bakteriologis ~~* 'memenuhi%') THEN 1 END)) AS ms_bakteriologis
   FROM (pab p
     JOIN (SELECT 1 AS _x) mw ON (p.tanggal) IS NOT NULL)
  GROUP BY mmwr_tahun(p.tanggal), mmwr_minggu(p.tanggal), p.wilayah_kerja;

-- tingkat 1
CREATE OR REPLACE VIEW `view_pesawat_kota_bulanan` AS
SELECT EXTRACT(YEAR FROM kegiatan_pesawat.tanggal),
    EXTRACT(MONTH FROM kegiatan_pesawat.tanggal),
    'kedatangan' AS arah,
        CASE
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'YIA - SIB') THEN 'YOGYAKARTA'
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'MHU-MHU') THEN 'MUARA WAHAU'
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'LNU - AAP -TRK') THEN 'MALINAU'
            ELSE kegiatan_pesawat.kedatangan
        END AS kota,
    count(*) AS jumlah_penerbangan,
    sum(COALESCE(kegiatan_pesawat.penumpang_datang, 0)) AS total_penumpang
   FROM kegiatan_pesawat
  WHERE ((kegiatan_pesawat.kedatangan IS NOT NULL) AND (kegiatan_pesawat.kedatangan <> ''))
  GROUP BY EXTRACT(YEAR FROM kegiatan_pesawat.tanggal), EXTRACT(MONTH FROM kegiatan_pesawat.tanggal),
        CASE
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'YIA - SIB') THEN 'YOGYAKARTA'
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'MHU-MHU') THEN 'MUARA WAHAU'
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'LNU - AAP -TRK') THEN 'MALINAU'
            ELSE kegiatan_pesawat.kedatangan
        END
UNION ALL
 SELECT EXTRACT(YEAR FROM kegiatan_pesawat.tanggal),
    EXTRACT(MONTH FROM kegiatan_pesawat.tanggal),
    'keberangkatan' AS arah,
        CASE
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'YIA - SIB') THEN 'SURABAYA'
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'MHU-MHU') THEN 'MUARA WAHAU'
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'LNU - AAP -TRK') THEN 'TARAKAN'
            ELSE kegiatan_pesawat.keberangkatan
        END AS kota,
    count(*) AS jumlah_penerbangan,
    sum(COALESCE(kegiatan_pesawat.penumpang_berangkat, 0)) AS total_penumpang
   FROM kegiatan_pesawat
  WHERE ((kegiatan_pesawat.keberangkatan IS NOT NULL) AND (kegiatan_pesawat.keberangkatan <> ''))
  GROUP BY EXTRACT(YEAR FROM kegiatan_pesawat.tanggal), EXTRACT(MONTH FROM kegiatan_pesawat.tanggal),
        CASE
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'YIA - SIB') THEN 'SURABAYA'
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'MHU-MHU') THEN 'MUARA WAHAU'
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'LNU - AAP -TRK') THEN 'TARAKAN'
            ELSE kegiatan_pesawat.keberangkatan
        END;

-- tingkat 1
CREATE OR REPLACE VIEW `view_pesawat_maskapai_bulanan` AS
SELECT EXTRACT(YEAR FROM kegiatan_pesawat.tanggal),
    EXTRACT(MONTH FROM kegiatan_pesawat.tanggal),
    'kedatangan' AS arah,
    kegiatan_pesawat.maskapai,
    count(*) AS jumlah_penerbangan,
    sum(COALESCE(kegiatan_pesawat.penumpang_datang, 0)) AS total_penumpang
   FROM kegiatan_pesawat
  WHERE ((kegiatan_pesawat.maskapai IS NOT NULL) AND (kegiatan_pesawat.maskapai <> ''))
  GROUP BY EXTRACT(YEAR FROM kegiatan_pesawat.tanggal), EXTRACT(MONTH FROM kegiatan_pesawat.tanggal), kegiatan_pesawat.maskapai
UNION ALL
 SELECT EXTRACT(YEAR FROM kegiatan_pesawat.tanggal),
    EXTRACT(MONTH FROM kegiatan_pesawat.tanggal),
    'keberangkatan' AS arah,
    kegiatan_pesawat.maskapai,
    count(*) AS jumlah_penerbangan,
    sum(COALESCE(kegiatan_pesawat.penumpang_berangkat, 0)) AS total_penumpang
   FROM kegiatan_pesawat
  WHERE ((kegiatan_pesawat.maskapai IS NOT NULL) AND (kegiatan_pesawat.maskapai <> ''))
  GROUP BY EXTRACT(YEAR FROM kegiatan_pesawat.tanggal), EXTRACT(MONTH FROM kegiatan_pesawat.tanggal), kegiatan_pesawat.maskapai;

-- tingkat 1
CREATE OR REPLACE VIEW `view_rat_guard_bulanan` AS
SELECT (EXTRACT(YEAR FROM tanggal)) AS tahun,
    (EXTRACT(MONTH FROM tanggal)) AS bulan,
    wilayah_kerja,
    sum(jumlah_kapal) AS jumlah_kapal,
    sum(pasang) AS pasang,
    sum(tidak_pasang) AS tidak_pasang,
        CASE
            WHEN (sum(jumlah_kapal) > 0) THEN round(((CAST(sum(pasang) AS DECIMAL(38,12)) / CAST(sum(jumlah_kapal) AS DECIMAL(38,12))) * CAST(100 AS DECIMAL(38,12))), 1)
            ELSE CAST(0 AS DECIMAL(38,12))
        END AS persentase_kepatuhan
   FROM rat_guard
  GROUP BY (EXTRACT(YEAR FROM tanggal)), (EXTRACT(MONTH FROM tanggal)), wilayah_kerja;

-- tingkat 1
CREATE OR REPLACE VIEW `view_rat_guard_mingguan` AS
SELECT mmwr_tahun(rat_guard.tanggal) AS tahun,
    mmwr_minggu(rat_guard.tanggal),
    rat_guard.wilayah_kerja,
    sum(rat_guard.jumlah_kapal) AS jumlah_kapal,
    sum(rat_guard.pasang) AS pasang,
    sum(rat_guard.tidak_pasang) AS tidak_pasang,
        CASE
            WHEN (sum(rat_guard.jumlah_kapal) > 0) THEN round(((CAST(sum(rat_guard.pasang) AS DECIMAL(38,12)) / CAST(sum(rat_guard.jumlah_kapal) AS DECIMAL(38,12))) * CAST(100 AS DECIMAL(38,12))), 1)
            ELSE CAST(0 AS DECIMAL(38,12))
        END AS persentase_kepatuhan
   FROM (rat_guard
     JOIN (SELECT 1 AS _x) mw ON (rat_guard.tanggal) IS NOT NULL)
  GROUP BY mmwr_tahun(rat_guard.tanggal), mmwr_minggu(rat_guard.tanggal), rat_guard.wilayah_kerja;

-- tingkat 1
CREATE OR REPLACE VIEW `view_skdr_alert_mingguan` AS
SELECT s.id,
    s.tahun_epid,
    s.minggu_epid,
    s.wilayah_kerja,
    s.jenis_penyakit_id,
    jp.jenis_penyakit,
    s.jumlah_kasus,
    round(avg(CAST(s.jumlah_kasus AS DECIMAL(38,12))) OVER w, 2) AS rata2_4minggu,
    round(COALESCE(stddev_pop(s.jumlah_kasus) OVER w, CAST(0 AS DECIMAL(38,12))), 2) AS sd_4minggu,
    round((avg(CAST(s.jumlah_kasus AS DECIMAL(38,12))) OVER w + (CAST(2 AS DECIMAL(38,12)) * COALESCE(stddev_pop(s.jumlah_kasus) OVER w, CAST(0 AS DECIMAL(38,12))))), 2) AS ambang_atas,
        CASE
            WHEN ((CAST(s.jumlah_kasus AS DECIMAL(38,12)) > (avg(CAST(s.jumlah_kasus AS DECIMAL(38,12))) OVER w + (CAST(2 AS DECIMAL(38,12)) * COALESCE(stddev_pop(s.jumlah_kasus) OVER w, CAST(0 AS DECIMAL(38,12)))))) AND (s.jumlah_kasus > 0)) THEN true
            ELSE false
        END AS status_alert
   FROM (skdr_mingguan s
     JOIN skdr_jenis_penyakit jp ON ((jp.nomor = s.jenis_penyakit_id)))
  WINDOW w AS (PARTITION BY s.wilayah_kerja, s.jenis_penyakit_id ORDER BY s.tahun_epid, s.minggu_epid ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING)
  ORDER BY s.wilayah_kerja, s.jenis_penyakit_id, s.tahun_epid, s.minggu_epid;

-- tingkat 1
CREATE OR REPLACE VIEW `view_tpp_bulanan` AS
SELECT (EXTRACT(YEAR FROM tanggal_kegiatan)) AS tahun,
    (EXTRACT(MONTH FROM tanggal_kegiatan)) AS bulan,
    wilayah_kerja,
    (count(*)) AS jumlah_tpp_diperiksa,
    (sum(COALESCE(jumlah_sampel, 0))) AS total_sampel,
    (COUNT(CASE WHEN ((inspeksi_kesehatan_lingkungan = 'Memenuhi Syarat') AND (COALESCE(formaldehyde, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(borax, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(metyl_yellow, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(rodamin_b, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(bakteriologis, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(hy_rise, 'Memenuhi Syarat') = 'Memenuhi Syarat')) THEN 1 END)) AS jumlah_ms,
    (COUNT(CASE WHEN ((inspeksi_kesehatan_lingkungan = 'Tidak Memenuhi Syarat') OR (formaldehyde = 'Tidak Memenuhi Syarat') OR (borax = 'Tidak Memenuhi Syarat') OR (metyl_yellow = 'Tidak Memenuhi Syarat') OR (rodamin_b = 'Tidak Memenuhi Syarat') OR (bakteriologis = 'Tidak Memenuhi Syarat') OR (hy_rise = 'Tidak Memenuhi Syarat')) THEN 1 END)) AS jumlah_tms,
    (COUNT(CASE WHEN (inspeksi_kesehatan_lingkungan = 'Memenuhi Syarat') THEN 1 END)) AS ikl_ms,
    (COUNT(CASE WHEN (inspeksi_kesehatan_lingkungan = 'Tidak Memenuhi Syarat') THEN 1 END)) AS ikl_tms,
    (COUNT(CASE WHEN (formaldehyde = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_formaldehyde,
    (COUNT(CASE WHEN (borax = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_borax,
    (COUNT(CASE WHEN (metyl_yellow = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_metyl_yellow,
    (COUNT(CASE WHEN (rodamin_b = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_rodamin_b,
    (COUNT(CASE WHEN (bakteriologis = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_bakteriologis,
    (COUNT(CASE WHEN (hy_rise = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_hy_rise,
    (COUNT(CASE WHEN (formaldehyde = 'Memenuhi Syarat') THEN 1 END)) AS ms_formaldehyde,
    (COUNT(CASE WHEN (borax = 'Memenuhi Syarat') THEN 1 END)) AS ms_borax,
    (COUNT(CASE WHEN (metyl_yellow = 'Memenuhi Syarat') THEN 1 END)) AS ms_metyl_yellow,
    (COUNT(CASE WHEN (rodamin_b = 'Memenuhi Syarat') THEN 1 END)) AS ms_rodamin_b,
    (COUNT(CASE WHEN (bakteriologis = 'Memenuhi Syarat') THEN 1 END)) AS ms_bakteriologis,
    (COUNT(CASE WHEN (hy_rise = 'Memenuhi Syarat') THEN 1 END)) AS ms_hy_rise
   FROM tpp
  GROUP BY ((EXTRACT(YEAR FROM tanggal_kegiatan))), ((EXTRACT(MONTH FROM tanggal_kegiatan))), wilayah_kerja;

-- tingkat 1
CREATE OR REPLACE VIEW `view_tpp_mingguan` AS
SELECT mmwr_tahun(t.tanggal_kegiatan) AS tahun,
    mmwr_minggu(t.tanggal_kegiatan) AS minggu,
    t.wilayah_kerja,
    (count(*)) AS jumlah_tpp_diperiksa,
    (sum(COALESCE(t.jumlah_sampel, 0))) AS total_sampel,
    (COUNT(CASE WHEN ((t.inspeksi_kesehatan_lingkungan = 'Memenuhi Syarat') AND (COALESCE(t.formaldehyde, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.borax, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.metyl_yellow, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.rodamin_b, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.bakteriologis, 'Memenuhi Syarat') = 'Memenuhi Syarat') AND (COALESCE(t.hy_rise, 'Memenuhi Syarat') = 'Memenuhi Syarat')) THEN 1 END)) AS jumlah_ms,
    (COUNT(CASE WHEN ((t.inspeksi_kesehatan_lingkungan = 'Tidak Memenuhi Syarat') OR (t.formaldehyde = 'Tidak Memenuhi Syarat') OR (t.borax = 'Tidak Memenuhi Syarat') OR (t.metyl_yellow = 'Tidak Memenuhi Syarat') OR (t.rodamin_b = 'Tidak Memenuhi Syarat') OR (t.bakteriologis = 'Tidak Memenuhi Syarat') OR (t.hy_rise = 'Tidak Memenuhi Syarat')) THEN 1 END)) AS jumlah_tms,
    (COUNT(CASE WHEN (t.inspeksi_kesehatan_lingkungan = 'Memenuhi Syarat') THEN 1 END)) AS ikl_ms,
    (COUNT(CASE WHEN (t.inspeksi_kesehatan_lingkungan = 'Tidak Memenuhi Syarat') THEN 1 END)) AS ikl_tms,
    (COUNT(CASE WHEN (t.formaldehyde = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_formaldehyde,
    (COUNT(CASE WHEN (t.borax = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_borax,
    (COUNT(CASE WHEN (t.metyl_yellow = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_metyl_yellow,
    (COUNT(CASE WHEN (t.rodamin_b = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_rodamin_b,
    (COUNT(CASE WHEN (t.bakteriologis = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_bakteriologis,
    (COUNT(CASE WHEN (t.hy_rise = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_hy_rise,
    (COUNT(CASE WHEN (t.formaldehyde = 'Memenuhi Syarat') THEN 1 END)) AS ms_formaldehyde,
    (COUNT(CASE WHEN (t.borax = 'Memenuhi Syarat') THEN 1 END)) AS ms_borax,
    (COUNT(CASE WHEN (t.metyl_yellow = 'Memenuhi Syarat') THEN 1 END)) AS ms_metyl_yellow,
    (COUNT(CASE WHEN (t.rodamin_b = 'Memenuhi Syarat') THEN 1 END)) AS ms_rodamin_b,
    (COUNT(CASE WHEN (t.bakteriologis = 'Memenuhi Syarat') THEN 1 END)) AS ms_bakteriologis,
    (COUNT(CASE WHEN (t.hy_rise = 'Memenuhi Syarat') THEN 1 END)) AS ms_hy_rise
   FROM (tpp t
     JOIN (SELECT 1 AS _x) mw ON (t.tanggal_kegiatan) IS NOT NULL)
  GROUP BY mmwr_tahun(t.tanggal_kegiatan), mmwr_minggu(t.tanggal_kegiatan), t.wilayah_kerja;

-- tingkat 1
CREATE OR REPLACE VIEW `view_ttu_bulanan` AS
SELECT (EXTRACT(YEAR FROM tanggal)) AS tahun,
    (EXTRACT(MONTH FROM tanggal)) AS bulan,
    wilayah_kerja,
    (count(*)) AS jumlah_diperiksa,
    (COUNT(CASE WHEN (hasil = 'Memenuhi Syarat') THEN 1 END)) AS jumlah_ms,
    (COUNT(CASE WHEN (hasil = 'Tidak Memenuhi Syarat') THEN 1 END)) AS jumlah_tms,
    (COUNT(CASE WHEN (lingkungan_luar_halaman = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_lingkungan_luar_halaman,
    (COUNT(CASE WHEN (ruang_bangunan = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_ruang_bangunan,
    (COUNT(CASE WHEN (penyehatan_air = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_penyehatan_air,
    (COUNT(CASE WHEN (penyehatan_udara_ruang = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_penyehatan_udara_ruang,
    (COUNT(CASE WHEN (pengelolaan_limbah = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_pengelolaan_limbah,
    (COUNT(CASE WHEN (pencahayaan = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_pencahayaan,
    (COUNT(CASE WHEN (kebisingan = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_kebisingan,
    (COUNT(CASE WHEN (getaran_diruang_kerja = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_getaran_diruang_kerja,
    (COUNT(CASE WHEN (pengendalian_vektor_penyakit = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_pengendalian_vektor_penyakit,
    (COUNT(CASE WHEN (instalasi = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_instalasi,
    (COUNT(CASE WHEN (pemeliharaan_jamban_kamar_mandi = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_pemeliharaan_jamban_kamar_mandi
   FROM ttu
  GROUP BY ((EXTRACT(YEAR FROM tanggal))), ((EXTRACT(MONTH FROM tanggal))), wilayah_kerja;

-- tingkat 1
CREATE OR REPLACE VIEW `view_ttu_mingguan` AS
SELECT mmwr_tahun(t.tanggal) AS tahun,
    mmwr_minggu(t.tanggal) AS minggu,
    t.wilayah_kerja,
    (count(*)) AS jumlah_diperiksa,
    (COUNT(CASE WHEN (t.hasil = 'Memenuhi Syarat') THEN 1 END)) AS jumlah_ms,
    (COUNT(CASE WHEN (t.hasil = 'Tidak Memenuhi Syarat') THEN 1 END)) AS jumlah_tms,
    (COUNT(CASE WHEN (t.lingkungan_luar_halaman = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_lingkungan_luar_halaman,
    (COUNT(CASE WHEN (t.ruang_bangunan = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_ruang_bangunan,
    (COUNT(CASE WHEN (t.penyehatan_air = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_penyehatan_air,
    (COUNT(CASE WHEN (t.penyehatan_udara_ruang = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_penyehatan_udara_ruang,
    (COUNT(CASE WHEN (t.pengelolaan_limbah = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_pengelolaan_limbah,
    (COUNT(CASE WHEN (t.pencahayaan = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_pencahayaan,
    (COUNT(CASE WHEN (t.kebisingan = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_kebisingan,
    (COUNT(CASE WHEN (t.getaran_diruang_kerja = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_getaran_diruang_kerja,
    (COUNT(CASE WHEN (t.pengendalian_vektor_penyakit = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_pengendalian_vektor_penyakit,
    (COUNT(CASE WHEN (t.instalasi = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_instalasi,
    (COUNT(CASE WHEN (t.pemeliharaan_jamban_kamar_mandi = 'Tidak Memenuhi Syarat') THEN 1 END)) AS tms_pemeliharaan_jamban_kamar_mandi
   FROM (ttu t
     JOIN (SELECT 1 AS _x) mw ON (t.tanggal) IS NOT NULL)
  GROUP BY mmwr_tahun(t.tanggal), mmwr_minggu(t.tanggal), t.wilayah_kerja;

-- tingkat 1
CREATE OR REPLACE VIEW `view_vektor_anopheles_mingguan` AS
SELECT mmwr_tahun(a.tgl_survei),
    mmwr_minggu(a.tgl_survei),
    a.kode_wilker,
    a.tipe_pengamatan,
    count(*) AS jml_survei,
    round(avg(a.mbr), 3) AS mbr_rerata,
    round(avg(a.suhu_c), 1) AS suhu_rerata,
    round(avg(a.kelembapan_pct)) AS kelembapan_rerata,
    sum(a.jumlah_larva) AS total_larva,
    sum(a.jumlah_cidukan) AS total_cidukan,
    round(avg(a.mhd), 3) AS mhd_rerata
   FROM (vektor_anopheles a
     JOIN (SELECT 1 AS _x) w ON (a.tgl_survei) IS NOT NULL)
  GROUP BY mmwr_tahun(a.tgl_survei), mmwr_minggu(a.tgl_survei), a.kode_wilker, a.tipe_pengamatan;

-- tingkat 1
CREATE OR REPLACE VIEW `view_vektor_dbd_mingguan` AS
SELECT mmwr_tahun(d.tgl_survei),
    mmwr_minggu(d.tgl_survei),
    d.kode_wilker,
    count(*) AS jml_survei,
    round(avg(d.hi), 2) AS hi_rerata,
    round(avg(d.ci), 2) AS ci_rerata,
    round(avg(d.abj), 2) AS abj_rerata,
    sum(d.jml_positif_jentik) AS total_positif_jentik,
    round(avg(d.curah_hujan_mm), 1) AS curah_hujan_rerata,
    round(avg(d.bi), 2) AS bi_rerata
   FROM (vektor_dbd d
     JOIN (SELECT 1 AS _x) w ON (d.tgl_survei) IS NOT NULL)
  GROUP BY mmwr_tahun(d.tgl_survei), mmwr_minggu(d.tgl_survei), d.kode_wilker;

-- tingkat 1
CREATE OR REPLACE VIEW `view_vektor_diare_bulanan` AS
SELECT (EXTRACT(YEAR FROM tgl_kegiatan)) AS tahun,
    (EXTRACT(MONTH FROM tgl_kegiatan)) AS bulan,
    kode_wilker,
    jenis_kegiatan,
    count(*) AS jml_pengamatan,
    round(avg(fly_index), 2) AS fly_index_rerata,
    round(avg(kepadatan_kecoa_per_m2), 2) AS kepadatan_kecoa_rerata,
    COUNT(CASE WHEN (hasil_pengamatan = 'Memenuhi Syarat') THEN 1 END) AS jml_memenuhi_syarat,
    round(avg(suhu_c), 2) AS suhu_rerata,
    round(avg(kelembapan_pct), 2) AS kelembapan_rerata,
    round(avg(curah_hujan_mm), 2) AS curah_hujan_rerata,
    round(avg(insektisida_terpakai_ml), 2) AS insektisida_rerata,
    round(avg(luas_area_semprot_m2), 2) AS luas_area_rerata,
    (SELECT x.cuaca FROM vektor_diare x WHERE EXTRACT(YEAR FROM x.tgl_kegiatan) = EXTRACT(YEAR FROM d.tgl_kegiatan) AND EXTRACT(MONTH FROM x.tgl_kegiatan) = EXTRACT(MONTH FROM d.tgl_kegiatan) AND x.kode_wilker <=> d.kode_wilker AND x.jenis_kegiatan <=> d.jenis_kegiatan AND x.cuaca IS NOT NULL GROUP BY x.cuaca ORDER BY COUNT(*) DESC, x.cuaca ASC LIMIT 1) AS cuaca_dominan
   FROM vektor_diare d
  GROUP BY ((EXTRACT(YEAR FROM tgl_kegiatan))), ((EXTRACT(MONTH FROM tgl_kegiatan))), kode_wilker, jenis_kegiatan;

-- tingkat 1
CREATE OR REPLACE VIEW `view_vektor_diare_mingguan` AS
SELECT mmwr_tahun(d.tgl_kegiatan),
    mmwr_minggu(d.tgl_kegiatan),
    d.kode_wilker,
    d.jenis_kegiatan,
    count(*) AS jml_pengamatan,
    round(avg(d.fly_index), 2) AS fly_index_rerata,
    round(avg(d.kepadatan_kecoa_per_m2), 2) AS kepadatan_kecoa_rerata,
    COUNT(CASE WHEN (d.hasil_pengamatan = 'Memenuhi Syarat') THEN 1 END) AS jml_memenuhi_syarat,
    round(avg(d.suhu_c), 2) AS suhu_rerata,
    round(avg(d.kelembapan_pct), 2) AS kelembapan_rerata,
    round(avg(d.curah_hujan_mm), 2) AS curah_hujan_rerata,
    round(avg(d.insektisida_terpakai_ml), 2) AS insektisida_rerata,
    round(avg(d.luas_area_semprot_m2), 2) AS luas_area_rerata,
    (SELECT x.cuaca FROM vektor_diare x WHERE mmwr_tahun(x.tgl_kegiatan) = mmwr_tahun(d.tgl_kegiatan) AND mmwr_minggu(x.tgl_kegiatan) = mmwr_minggu(d.tgl_kegiatan) AND x.kode_wilker <=> d.kode_wilker AND x.jenis_kegiatan <=> d.jenis_kegiatan AND x.cuaca IS NOT NULL GROUP BY x.cuaca ORDER BY COUNT(*) DESC, x.cuaca ASC LIMIT 1) AS cuaca_dominan
   FROM (vektor_diare d
     JOIN (SELECT 1 AS _x) w ON (d.tgl_kegiatan) IS NOT NULL)
  GROUP BY mmwr_tahun(d.tgl_kegiatan), mmwr_minggu(d.tgl_kegiatan), d.kode_wilker, d.jenis_kegiatan;

-- tingkat 1
CREATE OR REPLACE VIEW `view_vektor_tikus_bulanan` AS
SELECT (EXTRACT(YEAR FROM tgl_survei)) AS tahun,
    (EXTRACT(MONTH FROM tgl_survei)) AS bulan,
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
  GROUP BY (EXTRACT(YEAR FROM tgl_survei)), (EXTRACT(MONTH FROM tgl_survei)), kode_wilker;

-- tingkat 1
CREATE OR REPLACE VIEW `view_vektor_tikus_mingguan` AS
SELECT mmwr_tahun(t.tgl_survei),
    mmwr_minggu(t.tgl_survei),
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
   FROM (vektor_tikus t
     JOIN (SELECT 1 AS _x) w ON (t.tgl_survei) IS NOT NULL)
  GROUP BY mmwr_tahun(t.tgl_survei), mmwr_minggu(t.tgl_survei), t.kode_wilker;

-- tingkat 1
CREATE OR REPLACE VIEW `view_wilayah_kerja_rat_guard` AS
SELECT DISTINCT wilayah_kerja
   FROM rat_guard
  ORDER BY wilayah_kerja;

-- tingkat 1
CREATE OR REPLACE VIEW `view_wilayah_kerja_sanitasi` AS
SELECT DISTINCT tpp.wilayah_kerja
   FROM tpp
UNION
 SELECT DISTINCT ttu.wilayah_kerja
   FROM ttu
UNION
 SELECT DISTINCT pab.wilayah_kerja
   FROM pab
  ORDER BY 1;

-- tingkat 1
CREATE OR REPLACE VIEW `view_wilayah_kerja_skdr` AS
SELECT DISTINCT wilayah_kerja
   FROM skdr_mingguan
  ORDER BY wilayah_kerja;

-- tingkat 2
CREATE OR REPLACE VIEW `view_bulanan_kategori` AS
SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'negara_kedatangan' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.negara_kedatangan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.negara_kedatangan
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'rba' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.rba), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.rba
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'faktor_risiko' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.faktor_risiko), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.faktor_risiko
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'kelengkapan_dokumen' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.kelengkapan_dokumen), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.kelengkapan_dokumen
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'daerah_terjangkit' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.daerah_terjangkit), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.daerah_terjangkit
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'keberadaan_vektor' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.keberadaan_vektor), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.keberadaan_vektor
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'bendera_kapal' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.bendera_kapal), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.bendera_kapal;

-- tingkat 2
CREATE OR REPLACE VIEW `view_bulanan_kategori_phqc` AS
SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'bendera' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.bendera), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.bendera
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'rba' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.rba), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.rba
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'tujuan_berlayar' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.tujuan_berlayar), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.tujuan_berlayar
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_kedatangan' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.pelabuhan_kedatangan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_kedatangan
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_tujuan' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.pelabuhan_tujuan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_tujuan;

-- tingkat 2
CREATE OR REPLACE VIEW `view_bulanan_penyakit_emerging` AS
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
         SELECT (EXTRACT(YEAR FROM DATE_ADD(epi_week_start(view_mingguan_penyakit_emerging.tahun_epid, view_mingguan_penyakit_emerging.minggu_epid), INTERVAL 4 DAY))) AS tahun_epid,
            (EXTRACT(MONTH FROM DATE_ADD(epi_week_start(view_mingguan_penyakit_emerging.tahun_epid, view_mingguan_penyakit_emerging.minggu_epid), INTERVAL 4 DAY))) AS bulan,
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

-- tingkat 2
CREATE OR REPLACE VIEW `view_bulanan_ringkasan` AS
SELECT tahun_kalender AS tahun,
    bulan_kalender AS bulan,
    wilayah_kerja,
    count(*) AS jumlah_kapal,
    sum(total_abk) AS total_abk,
    sum(COALESCE(jml_abk_wna, 0)) AS total_abk_wna,
    sum(COALESCE(jml_abk_wni, 0)) AS total_abk_wni
   FROM view_kegiatan_cop_enriched
  GROUP BY tahun_kalender, bulan_kalender, wilayah_kerja
  ORDER BY tahun_kalender, bulan_kalender, wilayah_kerja;

-- tingkat 2
CREATE OR REPLACE VIEW `view_bulanan_ringkasan_phqc` AS
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
  ORDER BY tahun_kalender, bulan_kalender, wilayah_kerja;

-- tingkat 2
CREATE OR REPLACE VIEW `view_mingguan_kategori` AS
SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'negara_kedatangan' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.negara_kedatangan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.negara_kedatangan
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'rba' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.rba), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.rba
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'faktor_risiko' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.faktor_risiko), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.faktor_risiko
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'kelengkapan_dokumen' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.kelengkapan_dokumen), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.kelengkapan_dokumen
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'daerah_terjangkit' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.daerah_terjangkit), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.daerah_terjangkit
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'keberadaan_vektor' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.keberadaan_vektor), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.keberadaan_vektor
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'bendera_kapal' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.bendera_kapal), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.bendera_kapal;

-- tingkat 2
CREATE OR REPLACE VIEW `view_mingguan_kategori_phqc` AS
SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'bendera' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.bendera), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.bendera
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'rba' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.rba), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.rba
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'tujuan_berlayar' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.tujuan_berlayar), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.tujuan_berlayar
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_kedatangan' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.pelabuhan_kedatangan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_kedatangan
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_tujuan' AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.pelabuhan_tujuan), ''), 'Tidak Diisi') AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_tujuan;

-- tingkat 2
CREATE OR REPLACE VIEW `view_mingguan_ringkasan` AS
SELECT tahun_epid,
    minggu_epid,
    wilayah_kerja,
    count(*) AS jumlah_kapal,
    sum(total_abk) AS total_abk,
    sum(COALESCE(jml_abk_wna, 0)) AS total_abk_wna,
    sum(COALESCE(jml_abk_wni, 0)) AS total_abk_wni
   FROM view_kegiatan_cop_enriched
  GROUP BY tahun_epid, minggu_epid, wilayah_kerja
  ORDER BY tahun_epid, minggu_epid, wilayah_kerja;

-- tingkat 2
CREATE OR REPLACE VIEW `view_mingguan_ringkasan_phqc` AS
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
  ORDER BY tahun_epid, minggu_epid, wilayah_kerja;
