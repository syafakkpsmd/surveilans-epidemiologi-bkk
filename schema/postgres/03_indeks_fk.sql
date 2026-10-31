-- schema/postgres/03_indeks_fk.sql  (DIBUAT OTOMATIS; jangan sunting tangan)
-- Indeks non-unik dan FOREIGN KEY. Dipasang SETELAH data masuk. IF NOT EXISTS untuk indeks; FK dibungkus agar bisa diulang.

CREATE INDEX IF NOT EXISTS "auth_sesi_idx_sesi_berakhir" ON "auth_sesi" ("berakhir_pada");
CREATE INDEX IF NOT EXISTS "auth_sesi_idx_sesi_user" ON "auth_sesi" ("user_id");
CREATE INDEX IF NOT EXISTS "data_hiv_vct_idx_hiv_vct_tanggal" ON "data_hiv_vct" ("tanggal_kegiatan");
CREATE INDEX IF NOT EXISTS "data_hiv_vct_idx_kode_wilker" ON "data_hiv_vct" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "data_icv_idx_data_icv_nik" ON "data_icv" ("nik");
CREATE INDEX IF NOT EXISTS "data_penumpang_kapal_idx_kode_wilker" ON "data_penumpang_kapal" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "fasilitas_foto_idx_fasilitas_foto_fasilitas" ON "fasilitas_foto" ("fasilitas_id");
CREATE INDEX IF NOT EXISTS "fasilitas_pelabuhan_idx_fasilitas_pelabuhan_kode_wilker" ON "fasilitas_pelabuhan" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "foto_kegiatan_idx_foto_kegiatan_jenis" ON "foto_kegiatan" ("jenis_kegiatan_id");
CREATE INDEX IF NOT EXISTS "hiv_data_idx_kode_wilker" ON "hiv_data" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "hotspot_nasa_kaltim_idx_hotspot_confidence" ON "hotspot_nasa_kaltim" ("confidence");
CREATE INDEX IF NOT EXISTS "hotspot_nasa_kaltim_idx_hotspot_tanggal_deteksi" ON "hotspot_nasa_kaltim" ("tanggal_deteksi");
CREATE INDEX IF NOT EXISTS "ispu_stasiun_harian_idx_ispu_stasiun_harian_waktu" ON "ispu_stasiun_harian" ("waktu_pengukuran");
CREATE INDEX IF NOT EXISTS "kegiatan_cop_idx_kegiatan_cop_tgl_kedatangan" ON "kegiatan_cop" ("tgl_kedatangan");
CREATE INDEX IF NOT EXISTS "kegiatan_pesawat_idx_kegiatan_pesawat_maskapai" ON "kegiatan_pesawat" ("maskapai");
CREATE INDEX IF NOT EXISTS "kegiatan_pesawat_idx_kegiatan_pesawat_status_data" ON "kegiatan_pesawat" ("status_data");
CREATE INDEX IF NOT EXISTS "kegiatan_pesawat_idx_kegiatan_pesawat_tanggal" ON "kegiatan_pesawat" ("tanggal");
CREATE INDEX IF NOT EXISTS "kegiatan_pesawat_idx_kegiatan_pesawat_wilker_tanggal" ON "kegiatan_pesawat" ("kode_wilker", "tanggal");
CREATE INDEX IF NOT EXISTS "kegiatan_phqc_idx_kegiatan_phqc_tgl_keberangkatan" ON "kegiatan_phqc" ("tgl_keberangkatan");
CREATE INDEX IF NOT EXISTS "kegiatan_phqc_idx_kegiatan_phqc_wilayah_kerja" ON "kegiatan_phqc" ("wilayah_kerja");
CREATE INDEX IF NOT EXISTS "kier_kesehatan_idx_kier_kesimpulan" ON "kier_kesehatan" ("kesimpulan");
CREATE INDEX IF NOT EXISTS "kier_kesehatan_idx_kier_tgl_periksa" ON "kier_kesehatan" ("tanggal_pemeriksaan");
CREATE INDEX IF NOT EXISTS "kier_kesehatan_idx_kier_wilker" ON "kier_kesehatan" ("wilayah_kerja");
CREATE INDEX IF NOT EXISTS "kier_kesehatan_idx_kode_wilker" ON "kier_kesehatan" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "kunjungan_poliklinik_idx_kode_wilker" ON "kunjungan_poliklinik" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "kunjungan_poliklinik_idx_poli_diagnosa" ON "kunjungan_poliklinik" ("diagnosa");
CREATE INDEX IF NOT EXISTS "kunjungan_poliklinik_idx_poli_tanggal" ON "kunjungan_poliklinik" ("tanggal_pemeriksaan");
CREATE INDEX IF NOT EXISTS "laporan_penyakit_emerging_idx_lpe_bulanan" ON "laporan_penyakit_emerging" ("jenis_periode", "tahun_epid", "bulan", "penyakit", "negara");
CREATE INDEX IF NOT EXISTS "laporan_penyakit_emerging_idx_lpe_mingguan" ON "laporan_penyakit_emerging" ("jenis_periode", "tahun_epid", "minggu_epid", "penyakit", "negara");
CREATE INDEX IF NOT EXISTS "laporan_penyakit_nasional_idx_lpn_penyakit_tahun_minggu" ON "laporan_penyakit_nasional" ("penyakit", "tahun_epid", "minggu_epid");
CREATE INDEX IF NOT EXISTS "laporan_penyakit_nasional_idx_lpn_propinsi" ON "laporan_penyakit_nasional" ("propinsi");
CREATE INDEX IF NOT EXISTS "malaria_migrasi_idx_malaria_migrasi_kode_wilker" ON "malaria_migrasi" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "master_pelabuhan_negara_idx_master_pelabuhan_negara" ON "master_pelabuhan_negara" ("negara");
CREATE INDEX IF NOT EXISTS "migrasi_malaria_idx_kode_wilker" ON "migrasi_malaria" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "pengawasan_klinik_idx_pengawasan_klinik_klinik_id" ON "pengawasan_klinik" ("klinik_id");
CREATE INDEX IF NOT EXISTS "pengawasan_klinik_idx_pengawasan_klinik_status" ON "pengawasan_klinik" ("status_kepatuhan");
CREATE INDEX IF NOT EXISTS "pengawasan_klinik_idx_pengawasan_klinik_tanggal" ON "pengawasan_klinik" ("tanggal_kegiatan");
CREATE INDEX IF NOT EXISTS "pengawasan_klinik_dokumen_idx_pengawasan_klinik_dok_1ab367fd" ON "pengawasan_klinik_dokumen" ("pengawasan_id");
CREATE INDEX IF NOT EXISTS "pengawasan_klinik_perbaikan_foto_idx_perbaikan_foto" ON "pengawasan_klinik_perbaikan_foto" ("perbaikan_id");
CREATE INDEX IF NOT EXISTS "posko_klb_harian_idx_kode_wilker" ON "posko_klb_harian" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "posko_penyakit_harian_idx_kode_wilker" ON "posko_penyakit_harian" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "posko_ptm_harian_idx_kode_wilker" ON "posko_ptm_harian" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "riwayat_analisis_ai_idx_riwayat_ai_lookup" ON "riwayat_analisis_ai" ("konteks", "periode_key", "wilayah_kerja", "dibuat_pada");
CREATE INDEX IF NOT EXISTS "riwayat_analisis_ai_idx_riwayat_analisis_ai_cache_lookup" ON "riwayat_analisis_ai" ("konteks", "periode_key", "wilayah_kerja", "tipe", "dibuat_pada");
CREATE INDEX IF NOT EXISTS "riwayat_analisis_ai_idx_riwayat_analisis_ai_cache_l_0a038531" ON "riwayat_analisis_ai" ("konteks", "periode_key", "wilayah_kerja", "tipe", "metrik", "dibuat_pada");
CREATE INDEX IF NOT EXISTS "siaos_idx_kode_wilker" ON "siaos" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "simulasi_wabah_kapal_idx_simulasi_wabah_kapal_cop" ON "simulasi_wabah_kapal" ("kegiatan_cop_id");
CREATE INDEX IF NOT EXISTS "simulasi_wabah_kapal_idx_simulasi_wabah_kapal_kategori" ON "simulasi_wabah_kapal" ("kategori_penyakit_id");
CREATE INDEX IF NOT EXISTS "simulasi_wabah_pesawat_idx_simulasi_wabah_pesawat_kategori" ON "simulasi_wabah_pesawat" ("kategori_penyakit_id");
CREATE INDEX IF NOT EXISTS "simulasi_wabah_pesawat_idx_simulasi_wabah_pesawat_kegiatan" ON "simulasi_wabah_pesawat" ("kegiatan_pesawat_id");
CREATE INDEX IF NOT EXISTS "skdr_mingguan_idx_skdr_mingguan_jenis_penyakit" ON "skdr_mingguan" ("jenis_penyakit_id");
CREATE INDEX IF NOT EXISTS "skdr_mingguan_idx_skdr_mingguan_wilayah_penyakit" ON "skdr_mingguan" ("wilayah_kerja", "jenis_penyakit_id", "tahun_epid", "minggu_epid");
CREATE INDEX IF NOT EXISTS "sklt_penumpang_idx_kode_wilker" ON "sklt_penumpang" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "sklt_penumpang_idx_sklt_laik" ON "sklt_penumpang" ("status_laik");
CREATE INDEX IF NOT EXISTS "sklt_penumpang_idx_sklt_rute" ON "sklt_penumpang" ("rute");
CREATE INDEX IF NOT EXISTS "sklt_penumpang_idx_sklt_tanggal" ON "sklt_penumpang" ("tanggal");
CREATE INDEX IF NOT EXISTS "statistik_kunjungan_idx_statistik_created_at" ON "statistik_kunjungan" ("created_at");
CREATE INDEX IF NOT EXISTS "statistik_kunjungan_idx_statistik_tipe" ON "statistik_kunjungan" ("tipe");
CREATE INDEX IF NOT EXISTS "stok_vaksin_idx_stok_vaksin_tanggal" ON "stok_vaksin" ("tanggal");
CREATE INDEX IF NOT EXISTS "tb_data_idx_kode_wilker" ON "tb_data" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "tb_data_idx_tb_data_nik" ON "tb_data" ("nik");
CREATE INDEX IF NOT EXISTS "tb_data_idx_tb_data_tanggal" ON "tb_data" ("tanggal_pelaksanaan");
CREATE INDEX IF NOT EXISTS "tb_data_idx_tb_data_terduga" ON "tb_data" ("terduga_tbc");
CREATE INDEX IF NOT EXISTS "tb_data_idx_tb_data_terkonfirmasi" ON "tb_data" ("terkonfirmasi_tbc");
CREATE INDEX IF NOT EXISTS "upload_riwayat_idx_upload_riwayat_modul" ON "upload_riwayat" ("modul", "dibuat_pada");
CREATE INDEX IF NOT EXISTS "vektor_anopheles_idx_vektor_anopheles_kode_wilker" ON "vektor_anopheles" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "vektor_dbd_idx_vektor_dbd_wilker_sub_lokasi" ON "vektor_dbd" ("kode_wilker", "sub_lokasi");
CREATE INDEX IF NOT EXISTS "vektor_diare_idx_vektor_diare_kode_wilker" ON "vektor_diare" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "vektor_tikus_idx_vektor_tikus_kode_wilker" ON "vektor_tikus" ("kode_wilker");
CREATE INDEX IF NOT EXISTS "wilker_nama_alias_idx_wilker_nama_alias_kode" ON "wilker_nama_alias" ("kode_wilker");

DO $$ BEGIN
  ALTER TABLE "fasilitas_foto" ADD CONSTRAINT "fasilitas_foto_fk_fasilitas_foto_fasilitas_id" FOREIGN KEY ("fasilitas_id") REFERENCES "fasilitas_pelabuhan" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "fasilitas_pelabuhan" ADD CONSTRAINT "fasilitas_pelabuhan_fk_fasilitas_pelabuhan_kode_wilker" FOREIGN KEY ("kode_wilker") REFERENCES "wilker_ref" ("kode");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "foto_kegiatan" ADD CONSTRAINT "foto_kegiatan_fk_foto_kegiatan_jenis_kegiatan_id" FOREIGN KEY ("jenis_kegiatan_id") REFERENCES "jenis_kegiatan_foto" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "kegiatan_pesawat" ADD CONSTRAINT "kegiatan_pesawat_fk_kegiatan_pesawat_kode_wilker" FOREIGN KEY ("kode_wilker") REFERENCES "wilker_ref" ("kode");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "malaria_migrasi" ADD CONSTRAINT "malaria_migrasi_fk_malaria_migrasi_kode_wilker" FOREIGN KEY ("kode_wilker") REFERENCES "wilker_ref" ("kode");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pengawasan_klinik" ADD CONSTRAINT "pengawasan_klinik_fk_pengawasan_klinik_klinik_id" FOREIGN KEY ("klinik_id") REFERENCES "klinik_binaan" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pengawasan_klinik_dokumen" ADD CONSTRAINT "pengawasan_klinik_dokumen_fk_pengawasan_klinik_doku_80e4eead" FOREIGN KEY ("pengawasan_id") REFERENCES "pengawasan_klinik" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "simulasi_wabah_kapal" ADD CONSTRAINT "simulasi_wabah_kapal_fk_simulasi_wabah_kapal_katego_c115ec8a" FOREIGN KEY ("kategori_penyakit_id") REFERENCES "referensi_parameter_penyakit" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "simulasi_wabah_kapal" ADD CONSTRAINT "simulasi_wabah_kapal_fk_simulasi_wabah_kapal_kegiatan_cop_id" FOREIGN KEY ("kegiatan_cop_id") REFERENCES "kegiatan_cop" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "simulasi_wabah_pesawat" ADD CONSTRAINT "simulasi_wabah_pesawat_fk_simulasi_wabah_pesawat_ka_08fd65fc" FOREIGN KEY ("kategori_penyakit_id") REFERENCES "referensi_parameter_penyakit" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "simulasi_wabah_pesawat" ADD CONSTRAINT "simulasi_wabah_pesawat_fk_simulasi_wabah_pesawat_ke_e0974e48" FOREIGN KEY ("kegiatan_pesawat_id") REFERENCES "kegiatan_pesawat" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "skdr_mingguan" ADD CONSTRAINT "skdr_mingguan_fk_skdr_mingguan_jenis_penyakit_id" FOREIGN KEY ("jenis_penyakit_id") REFERENCES "skdr_jenis_penyakit" ("nomor");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "vektor_anopheles" ADD CONSTRAINT "vektor_anopheles_fk_vektor_anopheles_kode_wilker" FOREIGN KEY ("kode_wilker") REFERENCES "wilker_ref" ("kode");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "vektor_dbd" ADD CONSTRAINT "vektor_dbd_fk_vektor_dbd_kode_wilker" FOREIGN KEY ("kode_wilker") REFERENCES "wilker_ref" ("kode");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "vektor_diare" ADD CONSTRAINT "vektor_diare_fk_vektor_diare_kode_wilker" FOREIGN KEY ("kode_wilker") REFERENCES "wilker_ref" ("kode");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "vektor_tikus" ADD CONSTRAINT "vektor_tikus_fk_vektor_tikus_kode_wilker" FOREIGN KEY ("kode_wilker") REFERENCES "wilker_ref" ("kode");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "wilker_nama_alias" ADD CONSTRAINT "wilker_nama_alias_fk_wilker_nama_alias_kode_wilker" FOREIGN KEY ("kode_wilker") REFERENCES "wilker_ref" ("kode");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
