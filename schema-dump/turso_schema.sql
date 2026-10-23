-- Skema Turso (tanpa data) - dibuat 2026-10-23T06:08:01.723Z

-- table: data_hiv_vct
CREATE TABLE data_hiv_vct (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wilker TEXT NOT NULL,              -- nama sheet = nama wilayah kerja
  no_baris INTEGER NOT NULL,         -- kolom "No" di sheet, kunci upsert
  tanggal_kegiatan TEXT NOT NULL,    -- format YYYY-MM-DD
  nik TEXT,
  nama TEXT,
  sex TEXT,
  tanggal_lahir TEXT,                -- format YYYY-MM-DD
  alamat TEXT,
  status_perkawinan TEXT,
  kunjungan TEXT,
  hasil TEXT,
  jenis_reagen TEXT,
  hubungan_beresiko TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(wilker, no_baris)
);

-- table: data_icv
CREATE TABLE data_icv (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spreadsheet_id TEXT NOT NULL,
  nama_klinik TEXT,
  no_baris INTEGER NOT NULL,
  nik TEXT,
  raw_json TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(spreadsheet_id, no_baris)
);

-- table: data_penumpang_kapal
CREATE TABLE data_penumpang_kapal (  id INTEGER PRIMARY KEY AUTOINCREMENT,  wilker TEXT NOT NULL,  no_baris INTEGER NOT NULL,  tanggal_tiba TEXT NOT NULL,  nama_kapal TEXT,  abk_datang INTEGER DEFAULT 0,  abk_berangkat INTEGER DEFAULT 0,  penumpang_datang INTEGER DEFAULT 0,  penumpang_berangkat INTEGER DEFAULT 0,  keterangan TEXT,  updated_at TEXT DEFAULT (datetime('now')), tanggal_berangkat TEXT, siaos TEXT,  UNIQUE(wilker, no_baris));

-- table: hiv_data
CREATE TABLE hiv_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wilayah_kerja TEXT NOT NULL,
  no_baris INTEGER NOT NULL,
  tanggal_kegiatan TEXT,
  nik TEXT,
  nama TEXT,
  sex TEXT,
  tanggal_lahir TEXT,
  alamat TEXT,
  status_perkawinan TEXT,
  kunjungan TEXT,
  hasil TEXT,
  jenis_reagen TEXT,
  hubungan_berisiko TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(wilayah_kerja, no_baris)
);

-- table: kier_kesehatan
CREATE TABLE kier_kesehatan (
      kunci_unik TEXT PRIMARY KEY,       -- wilayah_kerja + '|' + no_baris
      wilayah_kerja TEXT,
      no_baris INTEGER,
      nama TEXT,
      tanggal_lahir TEXT,
      jenis_kelamin TEXT,
      alamat TEXT,
      tujuan_pemeriksaan TEXT,
      tanggal_pemeriksaan TEXT,
      kesimpulan TEXT,
      tempat_terbit TEXT,
      updated_at TEXT
    );

-- table: kunjungan_poliklinik
CREATE TABLE kunjungan_poliklinik (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wilayah_kerja TEXT NOT NULL,
    no_baris INTEGER NOT NULL,
    no_urut TEXT,
    tanggal_pemeriksaan TEXT,
    nama TEXT,
    jenis_kelamin TEXT,
    usia INTEGER,
    usia_mentah TEXT,
    diagnosa TEXT,
    keterangan TEXT,
    updated_at TEXT DEFAULT (datetime('now')), kategori_pasien TEXT,
    UNIQUE(wilayah_kerja, no_baris)
);

-- table: migrasi_malaria
CREATE TABLE migrasi_malaria (
      id TEXT PRIMARY KEY,
      wilayah_kerja TEXT,
    nama_kapal_pesawat TEXT,
    tanggal_kegiatan TEXT,
    nama_lengkap TEXT,
    tanggal_lahir TEXT,
    jenis_kelamin TEXT,
    umur INTEGER,
    pekerjaan TEXT,
    pendidikan_terakhir TEXT,
    alamat_asal TEXT,
    alamat_tujuan TEXT,
    pernah_sakit_malaria TEXT,
    tahu_penyakit_malaria TEXT,
    tahu_gejala_malaria TEXT,
    sekitar_pernah_sakit_malaria TEXT,
    pernah_dapat_informasi_malaria TEXT,
    sekitar_dekat_dengan TEXT,
    punya_ternak TEXT,
    tempat_buang_hajat TEXT,
    pakai_baju_panjang_repellent TEXT,
    pakai_saat_tidur TEXT,
    tempat_berobat TEXT,
    hasil_rdt TEXT,
      updated_at TEXT
    );

-- table: pengawasan_klinik_link_perbaikan
CREATE TABLE pengawasan_klinik_link_perbaikan (
  pengawasan_id TEXT PRIMARY KEY,
  token         TEXT NOT NULL UNIQUE,
  aktif         INTEGER NOT NULL DEFAULT 1,
  dibuat_pada   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- table: pengawasan_klinik_perbaikan
CREATE TABLE pengawasan_klinik_perbaikan (
  id                TEXT PRIMARY KEY,
  pengawasan_id     TEXT NOT NULL,
  item_key          TEXT NOT NULL,
  keterangan        TEXT,
  tanggal_perbaikan TEXT,
  diisi_pada        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (pengawasan_id, item_key)
);

-- table: pengawasan_klinik_perbaikan_foto
CREATE TABLE pengawasan_klinik_perbaikan_foto (
  id            TEXT PRIMARY KEY,
  perbaikan_id  TEXT NOT NULL,
  isi_foto      BLOB NOT NULL,
  ukuran_byte   INTEGER NOT NULL,
  diunggah_pada TEXT NOT NULL DEFAULT (datetime('now'))
);

-- table: pengawasan_klinik_rekomendasi
CREATE TABLE pengawasan_klinik_rekomendasi (
  pengawasan_id TEXT PRIMARY KEY,
  nama_file     TEXT NOT NULL,
  ukuran_byte   INTEGER NOT NULL,
  isi_pdf       BLOB NOT NULL,
  diunggah_pada TEXT NOT NULL DEFAULT (datetime('now'))
);

-- table: posko_klb_harian
CREATE TABLE posko_klb_harian (
  posko         TEXT    NOT NULL CHECK (posko IN ('nataru', 'idul_fitri')),
  tahun         INTEGER NOT NULL,
  tanggal       TEXT    NOT NULL,
  wilayah_kerja TEXT    NOT NULL CHECK (wilayah_kerja IN ('Samarinda', 'APT Pranoto', 'Lhoktuan')),
  jumlah_klb    INTEGER NOT NULL DEFAULT 0,
  keterangan    TEXT,
  diperbarui    TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (posko, tahun, tanggal, wilayah_kerja)
);

-- table: posko_penyakit_harian
CREATE TABLE posko_penyakit_harian (
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

-- table: posko_periode
CREATE TABLE posko_periode (
  posko           TEXT    NOT NULL CHECK (posko IN ('nataru', 'idul_fitri')),
  tahun           INTEGER NOT NULL,
  nama            TEXT    NOT NULL,
  tanggal_mulai   TEXT    NOT NULL,  -- YYYY-MM-DD
  tanggal_selesai TEXT    NOT NULL,  -- YYYY-MM-DD
  PRIMARY KEY (posko, tahun)
);

-- table: posko_ptm_harian
CREATE TABLE posko_ptm_harian (
  posko         TEXT    NOT NULL CHECK (posko IN ('nataru', 'idul_fitri')),
  tahun         INTEGER NOT NULL,
  tanggal       TEXT    NOT NULL,
  wilayah_kerja TEXT    NOT NULL CHECK (wilayah_kerja IN ('Samarinda', 'APT Pranoto', 'Lhoktuan')),
  jenis_ptm     TEXT    NOT NULL,
  jumlah_kasus  INTEGER NOT NULL DEFAULT 0,
  diperbarui    TEXT    NOT NULL DEFAULT (datetime('now')), jumlah_lk INTEGER NOT NULL DEFAULT 0, jumlah_pr INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (posko, tahun, tanggal, wilayah_kerja, jenis_ptm)
);

-- table: siaos
CREATE TABLE siaos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wilayah_kerja TEXT NOT NULL,
      no INTEGER,
      tanggal TEXT,
      no_surat TEXT,
      nama TEXT,
      pelayaran TEXT,
      maskapai TEXT,
      pelabuhan TEXT,
      jenis_kelamin TEXT,
      usia INTEGER,
      satuan_usia TEXT,
      diagnosa TEXT,
      butuh_bantuan_medis TEXT,
      ambulance TEXT,
      kondisi_lanjut_perjalanan TEXT,
      perlu_kursi_dorong TEXT,
      perlu_bantuan_makanan_medikasi TEXT,
      synced_at TEXT,
      UNIQUE(wilayah_kerja, no_surat)
    );

-- table: sklt_penumpang
CREATE TABLE sklt_penumpang (id INTEGER PRIMARY KEY AUTOINCREMENT, kunci_unik TEXT NOT NULL UNIQUE, wilayah_kerja TEXT NOT NULL DEFAULT 'APT Pranoto', no_baris INTEGER, no_urut INTEGER, tanggal TEXT, nama TEXT, maskapai TEXT, rute TEXT, rute_kode TEXT, jenis_kelamin TEXT, umur INTEGER, diagnosis TEXT, status_laik TEXT, no_registrasi TEXT, jenis_penyakit TEXT, gcs TEXT, nadi INTEGER, suhu REAL, hamil TEXT, pendamping TEXT, fasilitas TEXT, updated_at TEXT DEFAULT (datetime('now')));

-- table: stok_vaksin
CREATE TABLE stok_vaksin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spreadsheet_id TEXT NOT NULL,
  nama_klinik TEXT,
  jenis_stok TEXT NOT NULL,
  no_baris INTEGER NOT NULL,
  tanggal TEXT,
  raw_json TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(spreadsheet_id, jenis_stok, no_baris)
);

-- table: tb_data
CREATE TABLE tb_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wilayah_kerja TEXT NOT NULL,
    no_baris INTEGER NOT NULL,
    no_urut TEXT,
    tanggal_pelaksanaan TEXT,
    nama_peserta TEXT,
    provinsi TEXT,
    kabupaten_kota TEXT,
    nik TEXT,
    pekerjaan TEXT,
    tanggal_lahir TEXT,
    jenis_kelamin TEXT,
    no_hp TEXT,
    riwayat_kontak_tbc TEXT,
    jenis_kontak_tbc TEXT,
    pernah_terdiagnosa_tbc TEXT,
    keterangan_riwayat_tbc TEXT,
    kekurangan_gizi TEXT,
    merokok TEXT,
    perokok_pasif TEXT,
    riwayat_dm TEXT,
    odhiv TEXT,
    lansia TEXT,
    ibu_hamil TEXT,
    hasil_skrining_gejala TEXT,
    terduga_tbc TEXT,
    tindak_lanjut_pemeriksaan TEXT,
    fasyankes_pemeriksaan TEXT,
    nomor_register_sitb TEXT,
    tanggal_hasil_diagnosis TEXT,
    hasil_pemeriksaan_diagnosis TEXT,
    jenis_pemeriksaan_diagnosis TEXT,
    terkonfirmasi_tbc TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(wilayah_kerja, no_baris)
);

-- index: idx_data_icv_nik
CREATE INDEX idx_data_icv_nik ON data_icv(nik);

-- index: idx_data_icv_spreadsheet
CREATE INDEX idx_data_icv_spreadsheet ON data_icv(spreadsheet_id);

-- index: idx_hiv_vct_tanggal
CREATE INDEX idx_hiv_vct_tanggal ON data_hiv_vct(tanggal_kegiatan);

-- index: idx_hiv_vct_wilker
CREATE INDEX idx_hiv_vct_wilker ON data_hiv_vct(wilker);

-- index: idx_kier_kesimpulan
CREATE INDEX idx_kier_kesimpulan ON kier_kesehatan(kesimpulan);

-- index: idx_kier_tgl_periksa
CREATE INDEX idx_kier_tgl_periksa ON kier_kesehatan(tanggal_pemeriksaan);

-- index: idx_kier_wilker
CREATE INDEX idx_kier_wilker ON kier_kesehatan(wilayah_kerja);

-- index: idx_perbaikan_foto
CREATE INDEX idx_perbaikan_foto ON pengawasan_klinik_perbaikan_foto (perbaikan_id);

-- index: idx_poli_diagnosa
CREATE INDEX idx_poli_diagnosa ON kunjungan_poliklinik(diagnosa);

-- index: idx_poli_tanggal
CREATE INDEX idx_poli_tanggal ON kunjungan_poliklinik(tanggal_pemeriksaan);

-- index: idx_poli_wilayah
CREATE INDEX idx_poli_wilayah ON kunjungan_poliklinik(wilayah_kerja);

-- index: idx_posko_penyakit_tanggal
CREATE INDEX idx_posko_penyakit_tanggal ON posko_penyakit_harian (posko, tahun, tanggal);

-- index: idx_posko_ptm_tanggal
CREATE INDEX idx_posko_ptm_tanggal ON posko_ptm_harian (posko, tahun, tanggal);

-- index: idx_sklt_laik
CREATE INDEX idx_sklt_laik ON sklt_penumpang (status_laik);

-- index: idx_sklt_rute
CREATE INDEX idx_sklt_rute ON sklt_penumpang (rute);

-- index: idx_sklt_tanggal
CREATE INDEX idx_sklt_tanggal ON sklt_penumpang (tanggal);

-- index: idx_stok_vaksin_spreadsheet
CREATE INDEX idx_stok_vaksin_spreadsheet ON stok_vaksin(spreadsheet_id, jenis_stok);

-- index: idx_stok_vaksin_tanggal
CREATE INDEX idx_stok_vaksin_tanggal ON stok_vaksin(tanggal);

-- index: idx_tb_data_nik
CREATE INDEX idx_tb_data_nik ON tb_data(nik);

-- index: idx_tb_data_tanggal
CREATE INDEX idx_tb_data_tanggal ON tb_data(tanggal_pelaksanaan);

-- index: idx_tb_data_terduga
CREATE INDEX idx_tb_data_terduga ON tb_data(terduga_tbc);

-- index: idx_tb_data_terkonfirmasi
CREATE INDEX idx_tb_data_terkonfirmasi ON tb_data(terkonfirmasi_tbc);

-- index: idx_tb_data_wilayah
CREATE INDEX idx_tb_data_wilayah ON tb_data(wilayah_kerja);

