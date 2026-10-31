-- schema/postgres/04_view.sql  (DIBUAT OTOMATIS; definisi view = ASLI Supabase, 42 view)
-- Dikecualikan: view_hiv_mingguan, view_tb_mingguan (bergantung pada tabel dummy Supabase yang dibuang). Dijalankan SETELAH 01 dan 03.

CREATE OR REPLACE VIEW "v_kegiatan_pesawat_rekap" AS
SELECT kp.id,
    kp.kode_wilker,
    wr.nama AS nama_wilker,
    kp.tanggal,
    ew.minggu_epid AS epi_week,
    ew.tahun_epid AS tahun,
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
     CROSS JOIN LATERAL mmwr_week(kp.tanggal) ew(tahun_epid, minggu_epid));

CREATE OR REPLACE VIEW "v_nasional_emerging_mingguan" AS
SELECT penyakit,
    tahun_epid,
    minggu_epid,
    sum(jumlah_kasus) AS total_kasus,
    sum(jumlah_kematian) AS total_kematian
   FROM laporan_penyakit_nasional
  GROUP BY penyakit, tahun_epid, minggu_epid
  ORDER BY penyakit, tahun_epid, minggu_epid;

CREATE OR REPLACE VIEW "v_nasional_emerging_per_propinsi" AS
SELECT penyakit,
    propinsi,
    tahun_epid,
    sum(jumlah_kasus) AS total_kasus,
    sum(jumlah_kematian) AS total_kematian
   FROM laporan_penyakit_nasional
  GROUP BY penyakit, propinsi, tahun_epid
  ORDER BY penyakit, tahun_epid, (sum(jumlah_kasus)) DESC;

CREATE OR REPLACE VIEW "view_kegiatan_cop_enriched" AS
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
    mw.tahun_epid,
    mw.minggu_epid,
    (EXTRACT(year FROM k.tgl_kedatangan))::integer AS tahun_kalender,
    (EXTRACT(month FROM k.tgl_kedatangan))::integer AS bulan_kalender,
    (COALESCE(k.jml_abk_wna, 0) + COALESCE(k.jml_abk_wni, 0)) AS total_abk
   FROM (kegiatan_cop k
     CROSS JOIN LATERAL mmwr_week(k.tgl_kedatangan) mw(tahun_epid, minggu_epid))
  WHERE (k.tgl_kedatangan IS NOT NULL);

CREATE OR REPLACE VIEW "view_bulanan_kategori" AS
SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'negara_kedatangan'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.negara_kedatangan), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.negara_kedatangan
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'rba'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.rba), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.rba
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'faktor_risiko'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.faktor_risiko), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.faktor_risiko
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'kelengkapan_dokumen'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.kelengkapan_dokumen), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.kelengkapan_dokumen
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'daerah_terjangkit'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.daerah_terjangkit), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.daerah_terjangkit
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'keberadaan_vektor'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.keberadaan_vektor), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.keberadaan_vektor
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_kalender AS tahun,
    view_kegiatan_cop_enriched.bulan_kalender AS bulan,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'bendera_kapal'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.bendera_kapal), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_kalender, view_kegiatan_cop_enriched.bulan_kalender, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.bendera_kapal;

CREATE OR REPLACE VIEW "view_kegiatan_phqc_enriched" AS
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
    mw.tahun_epid,
    mw.minggu_epid,
    (EXTRACT(year FROM k.tgl_keberangkatan))::integer AS tahun_kalender,
    (EXTRACT(month FROM k.tgl_keberangkatan))::integer AS bulan_kalender,
    (COALESCE(k.jml_abk_wna, 0) + COALESCE(k.jml_abk_wni, 0)) AS total_abk,
    (COALESCE(k.jml_penumpang_wna, 0) + COALESCE(k.jml_penumpang_wni, 0)) AS total_penumpang
   FROM (kegiatan_phqc k
     CROSS JOIN LATERAL mmwr_week(k.tgl_keberangkatan) mw(tahun_epid, minggu_epid))
  WHERE (k.tgl_keberangkatan IS NOT NULL);

CREATE OR REPLACE VIEW "view_bulanan_kategori_phqc" AS
SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'bendera'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.bendera), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.bendera
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'rba'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.rba), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.rba
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'tujuan_berlayar'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.tujuan_berlayar), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.tujuan_berlayar
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_kedatangan'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.pelabuhan_kedatangan), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_kedatangan
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_kalender AS tahun,
    view_kegiatan_phqc_enriched.bulan_kalender AS bulan,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_tujuan'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.pelabuhan_tujuan), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_kalender, view_kegiatan_phqc_enriched.bulan_kalender, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_tujuan;

CREATE OR REPLACE VIEW "view_mingguan_penyakit_emerging" AS
WITH dasar AS (
         SELECT laporan_penyakit_emerging.tahun_epid,
            laporan_penyakit_emerging.minggu_epid,
            laporan_penyakit_emerging.penyakit,
            laporan_penyakit_emerging.negara,
            laporan_penyakit_emerging.jumlah_kasus,
            laporan_penyakit_emerging.jumlah_kematian,
            (laporan_penyakit_emerging.sumber ~~ 'OWID%'::text) AS dari_owid
           FROM laporan_penyakit_emerging
          WHERE (laporan_penyakit_emerging.jenis_periode = 'mingguan'::text)
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

CREATE OR REPLACE VIEW "view_bulanan_penyakit_emerging" AS
WITH asli_dasar AS (
         SELECT laporan_penyakit_emerging.tahun_epid,
            laporan_penyakit_emerging.bulan,
            laporan_penyakit_emerging.penyakit,
            laporan_penyakit_emerging.negara,
            laporan_penyakit_emerging.jumlah_kasus,
            laporan_penyakit_emerging.jumlah_kematian,
            (laporan_penyakit_emerging.sumber ~~ 'OWID%'::text) AS dari_owid
           FROM laporan_penyakit_emerging
          WHERE (laporan_penyakit_emerging.jenis_periode = 'bulanan'::text)
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
         SELECT (EXTRACT(year FROM (epi_week_start(view_mingguan_penyakit_emerging.tahun_epid, view_mingguan_penyakit_emerging.minggu_epid) + 4)))::integer AS tahun_epid,
            (EXTRACT(month FROM (epi_week_start(view_mingguan_penyakit_emerging.tahun_epid, view_mingguan_penyakit_emerging.minggu_epid) + 4)))::integer AS bulan,
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

CREATE OR REPLACE VIEW "view_bulanan_ringkasan" AS
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

CREATE OR REPLACE VIEW "view_bulanan_ringkasan_phqc" AS
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

CREATE OR REPLACE VIEW "view_hotspot_kaltim_bulanan" AS
SELECT (EXTRACT(year FROM tanggal_deteksi))::integer AS tahun,
    (EXTRACT(month FROM tanggal_deteksi))::integer AS bulan,
    count(*) AS jumlah_hotspot,
    avg(confidence) AS confidence_rerata,
    avg(frp) AS frp_rerata
   FROM hotspot_nasa_kaltim
  GROUP BY ((EXTRACT(year FROM tanggal_deteksi))::integer), ((EXTRACT(month FROM tanggal_deteksi))::integer);

CREATE OR REPLACE VIEW "view_hotspot_kaltim_mingguan" AS
SELECT (EXTRACT(isoyear FROM tanggal_deteksi))::integer AS tahun_epid,
    (EXTRACT(week FROM tanggal_deteksi))::integer AS minggu_epid,
    count(*) AS jumlah_hotspot,
    avg(confidence) AS confidence_rerata,
    avg(frp) AS frp_rerata
   FROM hotspot_nasa_kaltim
  GROUP BY ((EXTRACT(isoyear FROM tanggal_deteksi))::integer), ((EXTRACT(week FROM tanggal_deteksi))::integer);

CREATE OR REPLACE VIEW "view_karhutla_ispa_bulanan" AS
SELECT (EXTRACT(year FROM tanggal))::integer AS tahun,
    (EXTRACT(month FROM tanggal))::integer AS bulan,
    kode_wilker,
    zona,
    sum((kasus_ispa_anak + kasus_ispa_dewasa)) AS total_kasus_ispa,
    sum(kasus_ispa_anak) AS total_kasus_anak,
    sum(kasus_ispa_dewasa) AS total_kasus_dewasa,
    count(*) AS jml_input
   FROM ispa_harian
  GROUP BY ((EXTRACT(year FROM tanggal))::integer), ((EXTRACT(month FROM tanggal))::integer), kode_wilker, zona;

CREATE OR REPLACE VIEW "view_karhutla_ispa_mingguan" AS
SELECT (EXTRACT(isoyear FROM tanggal))::integer AS tahun_epid,
    (EXTRACT(week FROM tanggal))::integer AS minggu_epid,
    kode_wilker,
    zona,
    sum((kasus_ispa_anak + kasus_ispa_dewasa)) AS total_kasus_ispa,
    sum(kasus_ispa_anak) AS total_kasus_anak,
    sum(kasus_ispa_dewasa) AS total_kasus_dewasa,
    count(*) AS jml_input
   FROM ispa_harian
  GROUP BY ((EXTRACT(isoyear FROM tanggal))::integer), ((EXTRACT(week FROM tanggal))::integer), kode_wilker, zona;

CREATE OR REPLACE VIEW "view_kualitas_udara_bulanan" AS
SELECT (EXTRACT(year FROM tanggal))::integer AS tahun,
    (EXTRACT(month FROM tanggal))::integer AS bulan,
    lokasi,
    avg(pm25) AS pm25_rerata,
    avg(pm10) AS pm10_rerata,
    avg(suhu) AS suhu_rerata,
    count(*) FILTER (WHERE (status_evaluasi = 'TMS'::text)) AS jml_tms,
    count(*) AS jml_input
   FROM kualitas_udara_harian
  GROUP BY ((EXTRACT(year FROM tanggal))::integer), ((EXTRACT(month FROM tanggal))::integer), lokasi;

CREATE OR REPLACE VIEW "view_kualitas_udara_mingguan" AS
SELECT (EXTRACT(isoyear FROM tanggal))::integer AS tahun_epid,
    (EXTRACT(week FROM tanggal))::integer AS minggu_epid,
    lokasi,
    avg(pm25) AS pm25_rerata,
    avg(pm10) AS pm10_rerata,
    avg(suhu) AS suhu_rerata,
    count(*) FILTER (WHERE (status_evaluasi = 'TMS'::text)) AS jml_tms,
    count(*) AS jml_input
   FROM kualitas_udara_harian
  GROUP BY ((EXTRACT(isoyear FROM tanggal))::integer), ((EXTRACT(week FROM tanggal))::integer), lokasi;

CREATE OR REPLACE VIEW "view_malaria_mingguan" AS
SELECT w.tahun_epid,
    w.minggu_epid,
    m.kode_wilker,
    sum(m.jml_diperiksa) AS total_diperiksa,
    sum(m.jml_positif_rdt) AS total_positif_rdt,
    sum(m.jml_penumpang) AS total_penumpang
   FROM (malaria_migrasi m
     CROSS JOIN LATERAL mmwr_week(m.tgl_kedatangan) w(tahun_epid, minggu_epid))
  GROUP BY w.tahun_epid, w.minggu_epid, m.kode_wilker;

CREATE OR REPLACE VIEW "view_mingguan_kategori" AS
SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'negara_kedatangan'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.negara_kedatangan), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.negara_kedatangan
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'rba'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.rba), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.rba
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'faktor_risiko'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.faktor_risiko), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.faktor_risiko
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'kelengkapan_dokumen'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.kelengkapan_dokumen), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.kelengkapan_dokumen
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'daerah_terjangkit'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.daerah_terjangkit), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.daerah_terjangkit
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'keberadaan_vektor'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.keberadaan_vektor), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.keberadaan_vektor
UNION ALL
 SELECT view_kegiatan_cop_enriched.tahun_epid,
    view_kegiatan_cop_enriched.minggu_epid,
    view_kegiatan_cop_enriched.wilayah_kerja,
    'bendera_kapal'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_cop_enriched.bendera_kapal), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_cop_enriched
  GROUP BY view_kegiatan_cop_enriched.tahun_epid, view_kegiatan_cop_enriched.minggu_epid, view_kegiatan_cop_enriched.wilayah_kerja, view_kegiatan_cop_enriched.bendera_kapal;

CREATE OR REPLACE VIEW "view_mingguan_kategori_phqc" AS
SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'bendera'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.bendera), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.bendera
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'rba'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.rba), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.rba
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'tujuan_berlayar'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.tujuan_berlayar), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.tujuan_berlayar
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_kedatangan'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.pelabuhan_kedatangan), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_kedatangan
UNION ALL
 SELECT view_kegiatan_phqc_enriched.tahun_epid,
    view_kegiatan_phqc_enriched.minggu_epid,
    view_kegiatan_phqc_enriched.wilayah_kerja,
    'pelabuhan_tujuan'::text AS kategori,
    COALESCE(NULLIF(TRIM(BOTH FROM view_kegiatan_phqc_enriched.pelabuhan_tujuan), ''::text), 'Tidak Diisi'::text) AS nilai,
    count(*) AS jumlah
   FROM view_kegiatan_phqc_enriched
  GROUP BY view_kegiatan_phqc_enriched.tahun_epid, view_kegiatan_phqc_enriched.minggu_epid, view_kegiatan_phqc_enriched.wilayah_kerja, view_kegiatan_phqc_enriched.pelabuhan_tujuan;

CREATE OR REPLACE VIEW "view_mingguan_ringkasan" AS
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

CREATE OR REPLACE VIEW "view_mingguan_ringkasan_phqc" AS
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

CREATE OR REPLACE VIEW "view_pab_bulanan" AS
SELECT (EXTRACT(year FROM tanggal))::integer AS tahun,
    (EXTRACT(month FROM tanggal))::integer AS bulan,
    wilayah_kerja,
    (count(*))::integer AS jumlah_pemeriksaan,
    (sum(COALESCE(jumlah_pab_diperiksa, 0)))::integer AS total_pab_diperiksa,
    (count(*) FILTER (WHERE ((COALESCE(fisik, 'memenuhi'::text) ~~* 'memenuhi%'::text) AND (COALESCE(kimia, 'memenuhi'::text) ~~* 'memenuhi%'::text) AND (COALESCE(bakteriologis, 'memenuhi'::text) ~~* 'memenuhi%'::text))))::integer AS jumlah_ms,
    (count(*) FILTER (WHERE ((fisik ~~* 'tidak memenuhi%'::text) OR (kimia ~~* 'tidak memenuhi%'::text) OR (bakteriologis ~~* 'tidak memenuhi%'::text))))::integer AS jumlah_tms,
    (count(*) FILTER (WHERE (fisik ~~* 'tidak memenuhi%'::text)))::integer AS tms_fisik,
    (count(*) FILTER (WHERE (kimia ~~* 'tidak memenuhi%'::text)))::integer AS tms_kimia,
    (count(*) FILTER (WHERE (bakteriologis ~~* 'tidak memenuhi%'::text)))::integer AS tms_bakteriologis,
    (count(*) FILTER (WHERE (fisik ~~* 'memenuhi%'::text)))::integer AS ms_fisik,
    (count(*) FILTER (WHERE (kimia ~~* 'memenuhi%'::text)))::integer AS ms_kimia,
    (count(*) FILTER (WHERE (bakteriologis ~~* 'memenuhi%'::text)))::integer AS ms_bakteriologis
   FROM pab p
  GROUP BY ((EXTRACT(year FROM tanggal))::integer), ((EXTRACT(month FROM tanggal))::integer), wilayah_kerja;

CREATE OR REPLACE VIEW "view_pab_mingguan" AS
SELECT mw.tahun_epid AS tahun,
    mw.minggu_epid AS minggu,
    p.wilayah_kerja,
    (count(*))::integer AS jumlah_pemeriksaan,
    (sum(COALESCE(p.jumlah_pab_diperiksa, 0)))::integer AS total_pab_diperiksa,
    (count(*) FILTER (WHERE ((COALESCE(p.fisik, 'memenuhi'::text) ~~* 'memenuhi%'::text) AND (COALESCE(p.kimia, 'memenuhi'::text) ~~* 'memenuhi%'::text) AND (COALESCE(p.bakteriologis, 'memenuhi'::text) ~~* 'memenuhi%'::text))))::integer AS jumlah_ms,
    (count(*) FILTER (WHERE ((p.fisik ~~* 'tidak memenuhi%'::text) OR (p.kimia ~~* 'tidak memenuhi%'::text) OR (p.bakteriologis ~~* 'tidak memenuhi%'::text))))::integer AS jumlah_tms,
    (count(*) FILTER (WHERE (p.fisik ~~* 'tidak memenuhi%'::text)))::integer AS tms_fisik,
    (count(*) FILTER (WHERE (p.kimia ~~* 'tidak memenuhi%'::text)))::integer AS tms_kimia,
    (count(*) FILTER (WHERE (p.bakteriologis ~~* 'tidak memenuhi%'::text)))::integer AS tms_bakteriologis,
    (count(*) FILTER (WHERE (p.fisik ~~* 'memenuhi%'::text)))::integer AS ms_fisik,
    (count(*) FILTER (WHERE (p.kimia ~~* 'memenuhi%'::text)))::integer AS ms_kimia,
    (count(*) FILTER (WHERE (p.bakteriologis ~~* 'memenuhi%'::text)))::integer AS ms_bakteriologis
   FROM (pab p
     CROSS JOIN LATERAL mmwr_week(p.tanggal) mw(tahun_epid, minggu_epid))
  GROUP BY mw.tahun_epid, mw.minggu_epid, p.wilayah_kerja;

CREATE OR REPLACE VIEW "view_pesawat_kota_bulanan" AS
SELECT tahun_ekstrak.tahun,
    tahun_ekstrak.bulan,
    'kedatangan'::text AS arah,
        CASE
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'YIA - SIB'::text) THEN 'YOGYAKARTA'::text
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'MHU-MHU'::text) THEN 'MUARA WAHAU'::text
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'LNU - AAP -TRK'::text) THEN 'MALINAU'::text
            ELSE kegiatan_pesawat.kedatangan
        END AS kota,
    count(*) AS jumlah_penerbangan,
    sum(COALESCE(kegiatan_pesawat.penumpang_datang, 0)) AS total_penumpang
   FROM kegiatan_pesawat,
    LATERAL ( SELECT (EXTRACT(year FROM kegiatan_pesawat.tanggal))::integer AS tahun,
            (EXTRACT(month FROM kegiatan_pesawat.tanggal))::integer AS bulan) tahun_ekstrak
  WHERE ((kegiatan_pesawat.kedatangan IS NOT NULL) AND (kegiatan_pesawat.kedatangan <> ''::text))
  GROUP BY tahun_ekstrak.tahun, tahun_ekstrak.bulan,
        CASE
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'YIA - SIB'::text) THEN 'YOGYAKARTA'::text
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'MHU-MHU'::text) THEN 'MUARA WAHAU'::text
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.kedatangan) = 'LNU - AAP -TRK'::text) THEN 'MALINAU'::text
            ELSE kegiatan_pesawat.kedatangan
        END
UNION ALL
 SELECT tahun_ekstrak.tahun,
    tahun_ekstrak.bulan,
    'keberangkatan'::text AS arah,
        CASE
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'YIA - SIB'::text) THEN 'SURABAYA'::text
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'MHU-MHU'::text) THEN 'MUARA WAHAU'::text
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'LNU - AAP -TRK'::text) THEN 'TARAKAN'::text
            ELSE kegiatan_pesawat.keberangkatan
        END AS kota,
    count(*) AS jumlah_penerbangan,
    sum(COALESCE(kegiatan_pesawat.penumpang_berangkat, 0)) AS total_penumpang
   FROM kegiatan_pesawat,
    LATERAL ( SELECT (EXTRACT(year FROM kegiatan_pesawat.tanggal))::integer AS tahun,
            (EXTRACT(month FROM kegiatan_pesawat.tanggal))::integer AS bulan) tahun_ekstrak
  WHERE ((kegiatan_pesawat.keberangkatan IS NOT NULL) AND (kegiatan_pesawat.keberangkatan <> ''::text))
  GROUP BY tahun_ekstrak.tahun, tahun_ekstrak.bulan,
        CASE
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'YIA - SIB'::text) THEN 'SURABAYA'::text
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'MHU-MHU'::text) THEN 'MUARA WAHAU'::text
            WHEN (TRIM(BOTH FROM kegiatan_pesawat.keberangkatan) = 'LNU - AAP -TRK'::text) THEN 'TARAKAN'::text
            ELSE kegiatan_pesawat.keberangkatan
        END;

CREATE OR REPLACE VIEW "view_pesawat_maskapai_bulanan" AS
SELECT tahun_ekstrak.tahun,
    tahun_ekstrak.bulan,
    'kedatangan'::text AS arah,
    kegiatan_pesawat.maskapai,
    count(*) AS jumlah_penerbangan,
    sum(COALESCE(kegiatan_pesawat.penumpang_datang, 0)) AS total_penumpang
   FROM kegiatan_pesawat,
    LATERAL ( SELECT (EXTRACT(year FROM kegiatan_pesawat.tanggal))::integer AS tahun,
            (EXTRACT(month FROM kegiatan_pesawat.tanggal))::integer AS bulan) tahun_ekstrak
  WHERE ((kegiatan_pesawat.maskapai IS NOT NULL) AND (kegiatan_pesawat.maskapai <> ''::text))
  GROUP BY tahun_ekstrak.tahun, tahun_ekstrak.bulan, kegiatan_pesawat.maskapai
UNION ALL
 SELECT tahun_ekstrak.tahun,
    tahun_ekstrak.bulan,
    'keberangkatan'::text AS arah,
    kegiatan_pesawat.maskapai,
    count(*) AS jumlah_penerbangan,
    sum(COALESCE(kegiatan_pesawat.penumpang_berangkat, 0)) AS total_penumpang
   FROM kegiatan_pesawat,
    LATERAL ( SELECT (EXTRACT(year FROM kegiatan_pesawat.tanggal))::integer AS tahun,
            (EXTRACT(month FROM kegiatan_pesawat.tanggal))::integer AS bulan) tahun_ekstrak
  WHERE ((kegiatan_pesawat.maskapai IS NOT NULL) AND (kegiatan_pesawat.maskapai <> ''::text))
  GROUP BY tahun_ekstrak.tahun, tahun_ekstrak.bulan, kegiatan_pesawat.maskapai;

CREATE OR REPLACE VIEW "view_rat_guard_bulanan" AS
SELECT (EXTRACT(year FROM tanggal))::integer AS tahun,
    (EXTRACT(month FROM tanggal))::integer AS bulan,
    wilayah_kerja,
    sum(jumlah_kapal) AS jumlah_kapal,
    sum(pasang) AS pasang,
    sum(tidak_pasang) AS tidak_pasang,
        CASE
            WHEN (sum(jumlah_kapal) > 0) THEN round((((sum(pasang))::numeric / (sum(jumlah_kapal))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS persentase_kepatuhan
   FROM rat_guard
  GROUP BY (EXTRACT(year FROM tanggal)), (EXTRACT(month FROM tanggal)), wilayah_kerja;

CREATE OR REPLACE VIEW "view_rat_guard_mingguan" AS
SELECT mw.tahun_epid AS tahun,
    mw.minggu_epid,
    rat_guard.wilayah_kerja,
    sum(rat_guard.jumlah_kapal) AS jumlah_kapal,
    sum(rat_guard.pasang) AS pasang,
    sum(rat_guard.tidak_pasang) AS tidak_pasang,
        CASE
            WHEN (sum(rat_guard.jumlah_kapal) > 0) THEN round((((sum(rat_guard.pasang))::numeric / (sum(rat_guard.jumlah_kapal))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS persentase_kepatuhan
   FROM (rat_guard
     CROSS JOIN LATERAL mmwr_week(rat_guard.tanggal) mw(tahun_epid, minggu_epid))
  GROUP BY mw.tahun_epid, mw.minggu_epid, rat_guard.wilayah_kerja;

CREATE OR REPLACE VIEW "view_skdr_alert_mingguan" AS
SELECT s.id,
    s.tahun_epid,
    s.minggu_epid,
    s.wilayah_kerja,
    s.jenis_penyakit_id,
    jp.jenis_penyakit,
    s.jumlah_kasus,
    round(avg(s.jumlah_kasus) OVER w, 2) AS rata2_4minggu,
    round(COALESCE(stddev_pop(s.jumlah_kasus) OVER w, (0)::numeric), 2) AS sd_4minggu,
    round((avg(s.jumlah_kasus) OVER w + ((2)::numeric * COALESCE(stddev_pop(s.jumlah_kasus) OVER w, (0)::numeric))), 2) AS ambang_atas,
        CASE
            WHEN (((s.jumlah_kasus)::numeric > (avg(s.jumlah_kasus) OVER w + ((2)::numeric * COALESCE(stddev_pop(s.jumlah_kasus) OVER w, (0)::numeric)))) AND (s.jumlah_kasus > 0)) THEN true
            ELSE false
        END AS status_alert
   FROM (skdr_mingguan s
     JOIN skdr_jenis_penyakit jp ON ((jp.nomor = s.jenis_penyakit_id)))
  WINDOW w AS (PARTITION BY s.wilayah_kerja, s.jenis_penyakit_id ORDER BY s.tahun_epid, s.minggu_epid ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING)
  ORDER BY s.wilayah_kerja, s.jenis_penyakit_id, s.tahun_epid, s.minggu_epid;

CREATE OR REPLACE VIEW "view_tpp_bulanan" AS
SELECT (EXTRACT(year FROM tanggal_kegiatan))::integer AS tahun,
    (EXTRACT(month FROM tanggal_kegiatan))::integer AS bulan,
    wilayah_kerja,
    (count(*))::integer AS jumlah_tpp_diperiksa,
    (sum(COALESCE(jumlah_sampel, 0)))::integer AS total_sampel,
    (count(*) FILTER (WHERE ((inspeksi_kesehatan_lingkungan = 'Memenuhi Syarat'::text) AND (COALESCE(formaldehyde, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(borax, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(metyl_yellow, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(rodamin_b, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(bakteriologis, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(hy_rise, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text))))::integer AS jumlah_ms,
    (count(*) FILTER (WHERE ((inspeksi_kesehatan_lingkungan = 'Tidak Memenuhi Syarat'::text) OR (formaldehyde = 'Tidak Memenuhi Syarat'::text) OR (borax = 'Tidak Memenuhi Syarat'::text) OR (metyl_yellow = 'Tidak Memenuhi Syarat'::text) OR (rodamin_b = 'Tidak Memenuhi Syarat'::text) OR (bakteriologis = 'Tidak Memenuhi Syarat'::text) OR (hy_rise = 'Tidak Memenuhi Syarat'::text))))::integer AS jumlah_tms,
    (count(*) FILTER (WHERE (inspeksi_kesehatan_lingkungan = 'Memenuhi Syarat'::text)))::integer AS ikl_ms,
    (count(*) FILTER (WHERE (inspeksi_kesehatan_lingkungan = 'Tidak Memenuhi Syarat'::text)))::integer AS ikl_tms,
    (count(*) FILTER (WHERE (formaldehyde = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_formaldehyde,
    (count(*) FILTER (WHERE (borax = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_borax,
    (count(*) FILTER (WHERE (metyl_yellow = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_metyl_yellow,
    (count(*) FILTER (WHERE (rodamin_b = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_rodamin_b,
    (count(*) FILTER (WHERE (bakteriologis = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_bakteriologis,
    (count(*) FILTER (WHERE (hy_rise = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_hy_rise,
    (count(*) FILTER (WHERE (formaldehyde = 'Memenuhi Syarat'::text)))::integer AS ms_formaldehyde,
    (count(*) FILTER (WHERE (borax = 'Memenuhi Syarat'::text)))::integer AS ms_borax,
    (count(*) FILTER (WHERE (metyl_yellow = 'Memenuhi Syarat'::text)))::integer AS ms_metyl_yellow,
    (count(*) FILTER (WHERE (rodamin_b = 'Memenuhi Syarat'::text)))::integer AS ms_rodamin_b,
    (count(*) FILTER (WHERE (bakteriologis = 'Memenuhi Syarat'::text)))::integer AS ms_bakteriologis,
    (count(*) FILTER (WHERE (hy_rise = 'Memenuhi Syarat'::text)))::integer AS ms_hy_rise
   FROM tpp
  GROUP BY ((EXTRACT(year FROM tanggal_kegiatan))::integer), ((EXTRACT(month FROM tanggal_kegiatan))::integer), wilayah_kerja;

CREATE OR REPLACE VIEW "view_tpp_mingguan" AS
SELECT mw.tahun_epid AS tahun,
    mw.minggu_epid AS minggu,
    t.wilayah_kerja,
    (count(*))::integer AS jumlah_tpp_diperiksa,
    (sum(COALESCE(t.jumlah_sampel, 0)))::integer AS total_sampel,
    (count(*) FILTER (WHERE ((t.inspeksi_kesehatan_lingkungan = 'Memenuhi Syarat'::text) AND (COALESCE(t.formaldehyde, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(t.borax, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(t.metyl_yellow, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(t.rodamin_b, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(t.bakteriologis, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text) AND (COALESCE(t.hy_rise, 'Memenuhi Syarat'::text) = 'Memenuhi Syarat'::text))))::integer AS jumlah_ms,
    (count(*) FILTER (WHERE ((t.inspeksi_kesehatan_lingkungan = 'Tidak Memenuhi Syarat'::text) OR (t.formaldehyde = 'Tidak Memenuhi Syarat'::text) OR (t.borax = 'Tidak Memenuhi Syarat'::text) OR (t.metyl_yellow = 'Tidak Memenuhi Syarat'::text) OR (t.rodamin_b = 'Tidak Memenuhi Syarat'::text) OR (t.bakteriologis = 'Tidak Memenuhi Syarat'::text) OR (t.hy_rise = 'Tidak Memenuhi Syarat'::text))))::integer AS jumlah_tms,
    (count(*) FILTER (WHERE (t.inspeksi_kesehatan_lingkungan = 'Memenuhi Syarat'::text)))::integer AS ikl_ms,
    (count(*) FILTER (WHERE (t.inspeksi_kesehatan_lingkungan = 'Tidak Memenuhi Syarat'::text)))::integer AS ikl_tms,
    (count(*) FILTER (WHERE (t.formaldehyde = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_formaldehyde,
    (count(*) FILTER (WHERE (t.borax = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_borax,
    (count(*) FILTER (WHERE (t.metyl_yellow = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_metyl_yellow,
    (count(*) FILTER (WHERE (t.rodamin_b = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_rodamin_b,
    (count(*) FILTER (WHERE (t.bakteriologis = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_bakteriologis,
    (count(*) FILTER (WHERE (t.hy_rise = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_hy_rise,
    (count(*) FILTER (WHERE (t.formaldehyde = 'Memenuhi Syarat'::text)))::integer AS ms_formaldehyde,
    (count(*) FILTER (WHERE (t.borax = 'Memenuhi Syarat'::text)))::integer AS ms_borax,
    (count(*) FILTER (WHERE (t.metyl_yellow = 'Memenuhi Syarat'::text)))::integer AS ms_metyl_yellow,
    (count(*) FILTER (WHERE (t.rodamin_b = 'Memenuhi Syarat'::text)))::integer AS ms_rodamin_b,
    (count(*) FILTER (WHERE (t.bakteriologis = 'Memenuhi Syarat'::text)))::integer AS ms_bakteriologis,
    (count(*) FILTER (WHERE (t.hy_rise = 'Memenuhi Syarat'::text)))::integer AS ms_hy_rise
   FROM (tpp t
     CROSS JOIN LATERAL mmwr_week(t.tanggal_kegiatan) mw(tahun_epid, minggu_epid))
  GROUP BY mw.tahun_epid, mw.minggu_epid, t.wilayah_kerja;

CREATE OR REPLACE VIEW "view_ttu_bulanan" AS
SELECT (EXTRACT(year FROM tanggal))::integer AS tahun,
    (EXTRACT(month FROM tanggal))::integer AS bulan,
    wilayah_kerja,
    (count(*))::integer AS jumlah_diperiksa,
    (count(*) FILTER (WHERE (hasil = 'Memenuhi Syarat'::text)))::integer AS jumlah_ms,
    (count(*) FILTER (WHERE (hasil = 'Tidak Memenuhi Syarat'::text)))::integer AS jumlah_tms,
    (count(*) FILTER (WHERE (lingkungan_luar_halaman = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_lingkungan_luar_halaman,
    (count(*) FILTER (WHERE (ruang_bangunan = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_ruang_bangunan,
    (count(*) FILTER (WHERE (penyehatan_air = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_penyehatan_air,
    (count(*) FILTER (WHERE (penyehatan_udara_ruang = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_penyehatan_udara_ruang,
    (count(*) FILTER (WHERE (pengelolaan_limbah = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_pengelolaan_limbah,
    (count(*) FILTER (WHERE (pencahayaan = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_pencahayaan,
    (count(*) FILTER (WHERE (kebisingan = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_kebisingan,
    (count(*) FILTER (WHERE (getaran_diruang_kerja = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_getaran_diruang_kerja,
    (count(*) FILTER (WHERE (pengendalian_vektor_penyakit = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_pengendalian_vektor_penyakit,
    (count(*) FILTER (WHERE (instalasi = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_instalasi,
    (count(*) FILTER (WHERE (pemeliharaan_jamban_kamar_mandi = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_pemeliharaan_jamban_kamar_mandi
   FROM ttu
  GROUP BY ((EXTRACT(year FROM tanggal))::integer), ((EXTRACT(month FROM tanggal))::integer), wilayah_kerja;

CREATE OR REPLACE VIEW "view_ttu_mingguan" AS
SELECT mw.tahun_epid AS tahun,
    mw.minggu_epid AS minggu,
    t.wilayah_kerja,
    (count(*))::integer AS jumlah_diperiksa,
    (count(*) FILTER (WHERE (t.hasil = 'Memenuhi Syarat'::text)))::integer AS jumlah_ms,
    (count(*) FILTER (WHERE (t.hasil = 'Tidak Memenuhi Syarat'::text)))::integer AS jumlah_tms,
    (count(*) FILTER (WHERE (t.lingkungan_luar_halaman = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_lingkungan_luar_halaman,
    (count(*) FILTER (WHERE (t.ruang_bangunan = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_ruang_bangunan,
    (count(*) FILTER (WHERE (t.penyehatan_air = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_penyehatan_air,
    (count(*) FILTER (WHERE (t.penyehatan_udara_ruang = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_penyehatan_udara_ruang,
    (count(*) FILTER (WHERE (t.pengelolaan_limbah = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_pengelolaan_limbah,
    (count(*) FILTER (WHERE (t.pencahayaan = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_pencahayaan,
    (count(*) FILTER (WHERE (t.kebisingan = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_kebisingan,
    (count(*) FILTER (WHERE (t.getaran_diruang_kerja = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_getaran_diruang_kerja,
    (count(*) FILTER (WHERE (t.pengendalian_vektor_penyakit = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_pengendalian_vektor_penyakit,
    (count(*) FILTER (WHERE (t.instalasi = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_instalasi,
    (count(*) FILTER (WHERE (t.pemeliharaan_jamban_kamar_mandi = 'Tidak Memenuhi Syarat'::text)))::integer AS tms_pemeliharaan_jamban_kamar_mandi
   FROM (ttu t
     CROSS JOIN LATERAL mmwr_week(t.tanggal) mw(tahun_epid, minggu_epid))
  GROUP BY mw.tahun_epid, mw.minggu_epid, t.wilayah_kerja;

CREATE OR REPLACE VIEW "view_vektor_anopheles_mingguan" AS
SELECT w.tahun_epid,
    w.minggu_epid,
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
     CROSS JOIN LATERAL mmwr_week(a.tgl_survei) w(tahun_epid, minggu_epid))
  GROUP BY w.tahun_epid, w.minggu_epid, a.kode_wilker, a.tipe_pengamatan;

CREATE OR REPLACE VIEW "view_vektor_dbd_mingguan" AS
SELECT w.tahun_epid,
    w.minggu_epid,
    d.kode_wilker,
    count(*) AS jml_survei,
    round(avg(d.hi), 2) AS hi_rerata,
    round(avg(d.ci), 2) AS ci_rerata,
    round(avg(d.abj), 2) AS abj_rerata,
    sum(d.jml_positif_jentik) AS total_positif_jentik,
    round(avg(d.curah_hujan_mm), 1) AS curah_hujan_rerata,
    round(avg(d.bi), 2) AS bi_rerata
   FROM (vektor_dbd d
     CROSS JOIN LATERAL mmwr_week(d.tgl_survei) w(tahun_epid, minggu_epid))
  GROUP BY w.tahun_epid, w.minggu_epid, d.kode_wilker;

CREATE OR REPLACE VIEW "view_vektor_diare_bulanan" AS
SELECT (EXTRACT(year FROM tgl_kegiatan))::integer AS tahun,
    (EXTRACT(month FROM tgl_kegiatan))::integer AS bulan,
    kode_wilker,
    jenis_kegiatan,
    count(*) AS jml_pengamatan,
    round(avg(fly_index), 2) AS fly_index_rerata,
    round(avg(kepadatan_kecoa_per_m2), 2) AS kepadatan_kecoa_rerata,
    count(*) FILTER (WHERE (hasil_pengamatan = 'Memenuhi Syarat'::text)) AS jml_memenuhi_syarat,
    round(avg(suhu_c), 2) AS suhu_rerata,
    round(avg(kelembapan_pct), 2) AS kelembapan_rerata,
    round(avg(curah_hujan_mm), 2) AS curah_hujan_rerata,
    round(avg(insektisida_terpakai_ml), 2) AS insektisida_rerata,
    round(avg(luas_area_semprot_m2), 2) AS luas_area_rerata,
    mode() WITHIN GROUP (ORDER BY cuaca) FILTER (WHERE (cuaca IS NOT NULL)) AS cuaca_dominan
   FROM vektor_diare d
  GROUP BY ((EXTRACT(year FROM tgl_kegiatan))::integer), ((EXTRACT(month FROM tgl_kegiatan))::integer), kode_wilker, jenis_kegiatan;

CREATE OR REPLACE VIEW "view_vektor_diare_mingguan" AS
SELECT w.tahun_epid,
    w.minggu_epid,
    d.kode_wilker,
    d.jenis_kegiatan,
    count(*) AS jml_pengamatan,
    round(avg(d.fly_index), 2) AS fly_index_rerata,
    round(avg(d.kepadatan_kecoa_per_m2), 2) AS kepadatan_kecoa_rerata,
    count(*) FILTER (WHERE (d.hasil_pengamatan = 'Memenuhi Syarat'::text)) AS jml_memenuhi_syarat,
    round(avg(d.suhu_c), 2) AS suhu_rerata,
    round(avg(d.kelembapan_pct), 2) AS kelembapan_rerata,
    round(avg(d.curah_hujan_mm), 2) AS curah_hujan_rerata,
    round(avg(d.insektisida_terpakai_ml), 2) AS insektisida_rerata,
    round(avg(d.luas_area_semprot_m2), 2) AS luas_area_rerata,
    mode() WITHIN GROUP (ORDER BY d.cuaca) FILTER (WHERE (d.cuaca IS NOT NULL)) AS cuaca_dominan
   FROM (vektor_diare d
     CROSS JOIN LATERAL mmwr_week(d.tgl_kegiatan) w(tahun_epid, minggu_epid))
  GROUP BY w.tahun_epid, w.minggu_epid, d.kode_wilker, d.jenis_kegiatan;

CREATE OR REPLACE VIEW "view_vektor_tikus_bulanan" AS
SELECT (EXTRACT(year FROM tgl_survei))::integer AS tahun,
    (EXTRACT(month FROM tgl_survei))::integer AS bulan,
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
  GROUP BY (EXTRACT(year FROM tgl_survei)), (EXTRACT(month FROM tgl_survei)), kode_wilker;

CREATE OR REPLACE VIEW "view_vektor_tikus_mingguan" AS
SELECT w.tahun_epid,
    w.minggu_epid,
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
     CROSS JOIN LATERAL mmwr_week(t.tgl_survei) w(tahun_epid, minggu_epid))
  GROUP BY w.tahun_epid, w.minggu_epid, t.kode_wilker;

CREATE OR REPLACE VIEW "view_wilayah_kerja_rat_guard" AS
SELECT DISTINCT wilayah_kerja
   FROM rat_guard
  ORDER BY wilayah_kerja;

CREATE OR REPLACE VIEW "view_wilayah_kerja_sanitasi" AS
SELECT DISTINCT tpp.wilayah_kerja
   FROM tpp
UNION
 SELECT DISTINCT ttu.wilayah_kerja
   FROM ttu
UNION
 SELECT DISTINCT pab.wilayah_kerja
   FROM pab
  ORDER BY 1;

CREATE OR REPLACE VIEW "view_wilayah_kerja_skdr" AS
SELECT DISTINCT wilayah_kerja
   FROM skdr_mingguan
  ORDER BY wilayah_kerja;
