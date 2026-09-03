export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      buletin: {
        Row: {
          created_at: string
          id: string
          link_url: string
          nama_kegiatan: string
          tahun: number
          tipe_link: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_url: string
          nama_kegiatan: string
          tahun: number
          tipe_link: string
        }
        Update: {
          created_at?: string
          id?: string
          link_url?: string
          nama_kegiatan?: string
          tahun?: number
          tipe_link?: string
        }
        Relationships: []
      }
      fasilitas_foto: {
        Row: {
          caption: string | null
          created_at: string | null
          fasilitas_id: string
          id: string
          kategori: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          fasilitas_id: string
          id?: string
          kategori: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          fasilitas_id?: string
          id?: string
          kategori?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fasilitas_foto_fasilitas_id_fkey"
            columns: ["fasilitas_id"]
            isOneToOne: false
            referencedRelation: "fasilitas_pelabuhan"
            referencedColumns: ["id"]
          },
        ]
      }
      fasilitas_pelabuhan: {
        Row: {
          created_at: string | null
          deskripsi: string | null
          id: string
          kode_wilker: string
          lat: number
          lng: number
          nama: string
          tipe: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          kode_wilker: string
          lat: number
          lng: number
          nama: string
          tipe: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          kode_wilker?: string
          lat?: number
          lng?: number
          nama?: string
          tipe?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fasilitas_pelabuhan_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      foto_kegiatan: {
        Row: {
          deskripsi: string | null
          dibuat_pada: string
          diupload_oleh: string | null
          id: number
          jenis_kegiatan_id: number | null
          judul: string
          public_id: string
          url_gambar: string
        }
        Insert: {
          deskripsi?: string | null
          dibuat_pada?: string
          diupload_oleh?: string | null
          id?: never
          jenis_kegiatan_id?: number | null
          judul: string
          public_id: string
          url_gambar: string
        }
        Update: {
          deskripsi?: string | null
          dibuat_pada?: string
          diupload_oleh?: string | null
          id?: never
          jenis_kegiatan_id?: number | null
          judul?: string
          public_id?: string
          url_gambar?: string
        }
        Relationships: [
          {
            foreignKeyName: "foto_kegiatan_jenis_kegiatan_id_fkey"
            columns: ["jenis_kegiatan_id"]
            isOneToOne: false
            referencedRelation: "jenis_kegiatan_foto"
            referencedColumns: ["id"]
          },
        ]
      }
      hiv_data: {
        Row: {
          dibuat_pada: string
          id: number
          input_oleh: string | null
          jml_bersedia: number | null
          jml_diperiksa: number | null
          jml_dirujuk_vct: number | null
          jml_ditawarkan: number | null
          jml_konfirmasi_positif: number | null
          jml_reaktif: number | null
          kelompok_sasaran: string | null
          keterangan: string | null
          kode_wilker: string
          metode_skrining: string | null
          tgl_skrining: string
        }
        Insert: {
          dibuat_pada?: string
          id?: never
          input_oleh?: string | null
          jml_bersedia?: number | null
          jml_diperiksa?: number | null
          jml_dirujuk_vct?: number | null
          jml_ditawarkan?: number | null
          jml_konfirmasi_positif?: number | null
          jml_reaktif?: number | null
          kelompok_sasaran?: string | null
          keterangan?: string | null
          kode_wilker: string
          metode_skrining?: string | null
          tgl_skrining: string
        }
        Update: {
          dibuat_pada?: string
          id?: never
          input_oleh?: string | null
          jml_bersedia?: number | null
          jml_diperiksa?: number | null
          jml_dirujuk_vct?: number | null
          jml_ditawarkan?: number | null
          jml_konfirmasi_positif?: number | null
          jml_reaktif?: number | null
          kelompok_sasaran?: string | null
          keterangan?: string | null
          kode_wilker?: string
          metode_skrining?: string | null
          tgl_skrining?: string
        }
        Relationships: [
          {
            foreignKeyName: "hiv_data_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      hotspot_nasa_kaltim: {
        Row: {
          confidence: number | null
          confidence_asli: string | null
          dibuat_pada: string
          frp: number | null
          id: string
          jam_deteksi: string | null
          latitude: number
          longitude: number
          satelit: string | null
          sumber_source: string
          tanggal_deteksi: string
        }
        Insert: {
          confidence?: number | null
          confidence_asli?: string | null
          dibuat_pada?: string
          frp?: number | null
          id?: string
          jam_deteksi?: string | null
          latitude: number
          longitude: number
          satelit?: string | null
          sumber_source: string
          tanggal_deteksi: string
        }
        Update: {
          confidence?: number | null
          confidence_asli?: string | null
          dibuat_pada?: string
          frp?: number | null
          id?: string
          jam_deteksi?: string | null
          latitude?: number
          longitude?: number
          satelit?: string | null
          sumber_source?: string
          tanggal_deteksi?: string
        }
        Relationships: []
      }
      ispa_harian: {
        Row: {
          dibuat_pada: string
          id: string
          input_oleh: string | null
          kasus_ispa_anak: number
          kasus_ispa_dewasa: number
          keterangan: string | null
          kode_wilker: string
          tanggal: string
          zona: string | null
        }
        Insert: {
          dibuat_pada?: string
          id?: string
          input_oleh?: string | null
          kasus_ispa_anak?: number
          kasus_ispa_dewasa?: number
          keterangan?: string | null
          kode_wilker: string
          tanggal: string
          zona?: string | null
        }
        Update: {
          dibuat_pada?: string
          id?: string
          input_oleh?: string | null
          kasus_ispa_anak?: number
          kasus_ispa_dewasa?: number
          keterangan?: string | null
          kode_wilker?: string
          tanggal?: string
          zona?: string | null
        }
        Relationships: []
      }
      ispu_stasiun_harian: {
        Row: {
          co: number | null
          created_at: string
          id: string
          ispu_co: number | null
          ispu_kategori: string
          ispu_nilai: number
          ispu_no2: number | null
          ispu_o3: number | null
          ispu_parameter_kritis: string
          ispu_pm10: number | null
          ispu_pm25: number | null
          ispu_so2: number | null
          kabupaten_kota: string | null
          latitude: number
          longitude: number
          nama_stasiun: string
          no2: number | null
          o3: number | null
          openaq_location_id: number
          pm10: number | null
          pm25: number | null
          provinsi: string | null
          raw_response: Json | null
          so2: number | null
          sumber: string
          updated_at: string
          waktu_pengukuran: string
        }
        Insert: {
          co?: number | null
          created_at?: string
          id?: string
          ispu_co?: number | null
          ispu_kategori: string
          ispu_nilai: number
          ispu_no2?: number | null
          ispu_o3?: number | null
          ispu_parameter_kritis: string
          ispu_pm10?: number | null
          ispu_pm25?: number | null
          ispu_so2?: number | null
          kabupaten_kota?: string | null
          latitude: number
          longitude: number
          nama_stasiun: string
          no2?: number | null
          o3?: number | null
          openaq_location_id: number
          pm10?: number | null
          pm25?: number | null
          provinsi?: string | null
          raw_response?: Json | null
          so2?: number | null
          sumber?: string
          updated_at?: string
          waktu_pengukuran: string
        }
        Update: {
          co?: number | null
          created_at?: string
          id?: string
          ispu_co?: number | null
          ispu_kategori?: string
          ispu_nilai?: number
          ispu_no2?: number | null
          ispu_o3?: number | null
          ispu_parameter_kritis?: string
          ispu_pm10?: number | null
          ispu_pm25?: number | null
          ispu_so2?: number | null
          kabupaten_kota?: string | null
          latitude?: number
          longitude?: number
          nama_stasiun?: string
          no2?: number | null
          o3?: number | null
          openaq_location_id?: number
          pm10?: number | null
          pm25?: number | null
          provinsi?: string | null
          raw_response?: Json | null
          so2?: number | null
          sumber?: string
          updated_at?: string
          waktu_pengukuran?: string
        }
        Relationships: []
      }
      jenis_kegiatan_foto: {
        Row: {
          dibuat_pada: string
          id: number
          nama: string
        }
        Insert: {
          dibuat_pada?: string
          id?: number
          nama: string
        }
        Update: {
          dibuat_pada?: string
          id?: number
          nama?: string
        }
        Relationships: []
      }
      kegiatan_cop: {
        Row: {
          bendera_kapal: string | null
          daerah_terjangkit: string | null
          faktor_risiko: string | null
          id: string
          jml_abk_wna: number | null
          jml_abk_wni: number | null
          keberadaan_vektor: string | null
          kelengkapan_dokumen: string | null
          nama_kapal: string | null
          negara_kedatangan: string | null
          orang_sakit: string | null
          rba: string | null
          sanitasi: string | null
          tgl_kedatangan: string | null
          wilayah_kerja: string | null
        }
        Insert: {
          bendera_kapal?: string | null
          daerah_terjangkit?: string | null
          faktor_risiko?: string | null
          id?: string
          jml_abk_wna?: number | null
          jml_abk_wni?: number | null
          keberadaan_vektor?: string | null
          kelengkapan_dokumen?: string | null
          nama_kapal?: string | null
          negara_kedatangan?: string | null
          orang_sakit?: string | null
          rba?: string | null
          sanitasi?: string | null
          tgl_kedatangan?: string | null
          wilayah_kerja?: string | null
        }
        Update: {
          bendera_kapal?: string | null
          daerah_terjangkit?: string | null
          faktor_risiko?: string | null
          id?: string
          jml_abk_wna?: number | null
          jml_abk_wni?: number | null
          keberadaan_vektor?: string | null
          kelengkapan_dokumen?: string | null
          nama_kapal?: string | null
          negara_kedatangan?: string | null
          orang_sakit?: string | null
          rba?: string | null
          sanitasi?: string | null
          tgl_kedatangan?: string | null
          wilayah_kerja?: string | null
        }
        Relationships: []
      }
      kegiatan_pesawat: {
        Row: {
          created_at: string
          created_by: string | null
          crew_berangkat: number
          crew_datang: number
          iaos_female: number
          iaos_male: number
          id: string
          jenazah_female: number
          jenazah_male: number
          keberangkatan: string | null
          kedatangan: string | null
          kier_female: number
          kier_male: number
          kode_wilker: string
          maskapai: string
          penumpang_berangkat: number
          penumpang_datang: number
          sklt_female: number
          sklt_male: number
          status_data: string
          status_kirim: string | null
          tanggal: string
          td_laik_female: number
          td_laik_male: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crew_berangkat?: number
          crew_datang?: number
          iaos_female?: number
          iaos_male?: number
          id?: string
          jenazah_female?: number
          jenazah_male?: number
          keberangkatan?: string | null
          kedatangan?: string | null
          kier_female?: number
          kier_male?: number
          kode_wilker: string
          maskapai: string
          penumpang_berangkat?: number
          penumpang_datang?: number
          sklt_female?: number
          sklt_male?: number
          status_data?: string
          status_kirim?: string | null
          tanggal: string
          td_laik_female?: number
          td_laik_male?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crew_berangkat?: number
          crew_datang?: number
          iaos_female?: number
          iaos_male?: number
          id?: string
          jenazah_female?: number
          jenazah_male?: number
          keberangkatan?: string | null
          kedatangan?: string | null
          kier_female?: number
          kier_male?: number
          kode_wilker?: string
          maskapai?: string
          penumpang_berangkat?: number
          penumpang_datang?: number
          sklt_female?: number
          sklt_male?: number
          status_data?: string
          status_kirim?: string | null
          tanggal?: string
          td_laik_female?: number
          td_laik_male?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kegiatan_pesawat_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      kegiatan_pesawat_backup_juli_agustus: {
        Row: {
          created_at: string | null
          created_by: string | null
          crew_berangkat: number | null
          crew_datang: number | null
          iaos_female: number | null
          iaos_male: number | null
          id: string | null
          jenazah_female: number | null
          jenazah_male: number | null
          keberangkatan: string | null
          kedatangan: string | null
          kier_female: number | null
          kier_male: number | null
          kode_wilker: string | null
          maskapai: string | null
          penumpang_berangkat: number | null
          penumpang_datang: number | null
          sklt_female: number | null
          sklt_male: number | null
          status_data: string | null
          status_kirim: string | null
          tanggal: string | null
          td_laik_female: number | null
          td_laik_male: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          crew_berangkat?: number | null
          crew_datang?: number | null
          iaos_female?: number | null
          iaos_male?: number | null
          id?: string | null
          jenazah_female?: number | null
          jenazah_male?: number | null
          keberangkatan?: string | null
          kedatangan?: string | null
          kier_female?: number | null
          kier_male?: number | null
          kode_wilker?: string | null
          maskapai?: string | null
          penumpang_berangkat?: number | null
          penumpang_datang?: number | null
          sklt_female?: number | null
          sklt_male?: number | null
          status_data?: string | null
          status_kirim?: string | null
          tanggal?: string | null
          td_laik_female?: number | null
          td_laik_male?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          crew_berangkat?: number | null
          crew_datang?: number | null
          iaos_female?: number | null
          iaos_male?: number | null
          id?: string | null
          jenazah_female?: number | null
          jenazah_male?: number | null
          keberangkatan?: string | null
          kedatangan?: string | null
          kier_female?: number | null
          kier_male?: number | null
          kode_wilker?: string | null
          maskapai?: string | null
          penumpang_berangkat?: number | null
          penumpang_datang?: number | null
          sklt_female?: number | null
          sklt_male?: number | null
          status_data?: string | null
          status_kirim?: string | null
          tanggal?: string | null
          td_laik_female?: number | null
          td_laik_male?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kegiatan_phqc: {
        Row: {
          bendera: string | null
          id: number
          jml_abk_wna: number | null
          jml_abk_wni: number | null
          jml_penumpang_wna: number | null
          jml_penumpang_wni: number | null
          nama_kapal: string | null
          pelabuhan_kedatangan: string | null
          pelabuhan_tujuan: string | null
          rba: string | null
          tgl_keberangkatan: string | null
          tujuan_berlayar: string | null
          wilayah_kerja: string | null
        }
        Insert: {
          bendera?: string | null
          id?: number
          jml_abk_wna?: number | null
          jml_abk_wni?: number | null
          jml_penumpang_wna?: number | null
          jml_penumpang_wni?: number | null
          nama_kapal?: string | null
          pelabuhan_kedatangan?: string | null
          pelabuhan_tujuan?: string | null
          rba?: string | null
          tgl_keberangkatan?: string | null
          tujuan_berlayar?: string | null
          wilayah_kerja?: string | null
        }
        Update: {
          bendera?: string | null
          id?: number
          jml_abk_wna?: number | null
          jml_abk_wni?: number | null
          jml_penumpang_wna?: number | null
          jml_penumpang_wni?: number | null
          nama_kapal?: string | null
          pelabuhan_kedatangan?: string | null
          pelabuhan_tujuan?: string | null
          rba?: string | null
          tgl_keberangkatan?: string | null
          tujuan_berlayar?: string | null
          wilayah_kerja?: string | null
        }
        Relationships: []
      }
      klinik_binaan: {
        Row: {
          alamat_klinik: string | null
          created_at: string | null
          id: string
          jenis_fasilitas: string | null
          kabupaten_kota: string | null
          latitude: number | null
          longitude: number | null
          nama_klinik: string
          pemilik_pimpinan: string | null
          penanggung_jawab: string | null
          spreadsheet_id: string | null
          telepon: string | null
        }
        Insert: {
          alamat_klinik?: string | null
          created_at?: string | null
          id?: string
          jenis_fasilitas?: string | null
          kabupaten_kota?: string | null
          latitude?: number | null
          longitude?: number | null
          nama_klinik: string
          pemilik_pimpinan?: string | null
          penanggung_jawab?: string | null
          spreadsheet_id?: string | null
          telepon?: string | null
        }
        Update: {
          alamat_klinik?: string | null
          created_at?: string | null
          id?: string
          jenis_fasilitas?: string | null
          kabupaten_kota?: string | null
          latitude?: number | null
          longitude?: number | null
          nama_klinik?: string
          pemilik_pimpinan?: string | null
          penanggung_jawab?: string | null
          spreadsheet_id?: string | null
          telepon?: string | null
        }
        Relationships: []
      }
      kualitas_udara_harian: {
        Row: {
          catatan_evaluasi: string | null
          created_at: string | null
          created_by: string | null
          hcho: number | null
          id: string
          ispu_status: string | null
          kelembapan: number | null
          lokasi: string
          pm10: number | null
          pm25: number | null
          status_evaluasi: string | null
          suhu: number | null
          tanggal: string
          tvoc: number | null
        }
        Insert: {
          catatan_evaluasi?: string | null
          created_at?: string | null
          created_by?: string | null
          hcho?: number | null
          id?: string
          ispu_status?: string | null
          kelembapan?: number | null
          lokasi: string
          pm10?: number | null
          pm25?: number | null
          status_evaluasi?: string | null
          suhu?: number | null
          tanggal: string
          tvoc?: number | null
        }
        Update: {
          catatan_evaluasi?: string | null
          created_at?: string | null
          created_by?: string | null
          hcho?: number | null
          id?: string
          ispu_status?: string | null
          kelembapan?: number | null
          lokasi?: string
          pm10?: number | null
          pm25?: number | null
          status_evaluasi?: string | null
          suhu?: number | null
          tanggal?: string
          tvoc?: number | null
        }
        Relationships: []
      }
      kunjungan_tamu: {
        Row: {
          halaman: string | null
          id: number
          waktu: string
        }
        Insert: {
          halaman?: string | null
          id?: never
          waktu?: string
        }
        Update: {
          halaman?: string | null
          id?: never
          waktu?: string
        }
        Relationships: []
      }
      laporan_penyakit_emerging: {
        Row: {
          bulan: number
          dibuat_pada: string
          id: number
          jenis_periode: string
          jumlah_kasus: number
          jumlah_kematian: number
          minggu_epid: number
          negara: string
          penyakit: string
          sumber: string
          tahun_epid: number
        }
        Insert: {
          bulan?: number
          dibuat_pada?: string
          id?: never
          jenis_periode: string
          jumlah_kasus?: number
          jumlah_kematian?: number
          minggu_epid?: number
          negara: string
          penyakit: string
          sumber: string
          tahun_epid: number
        }
        Update: {
          bulan?: number
          dibuat_pada?: string
          id?: never
          jenis_periode?: string
          jumlah_kasus?: number
          jumlah_kematian?: number
          minggu_epid?: number
          negara?: string
          penyakit?: string
          sumber?: string
          tahun_epid?: number
        }
        Relationships: []
      }
      laporan_penyakit_nasional: {
        Row: {
          created_at: string
          id: string
          jumlah_kasus: number
          jumlah_kematian: number
          minggu_epid: number
          penyakit: string
          propinsi: string
          sumber: string
          tahun_epid: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jumlah_kasus?: number
          jumlah_kematian?: number
          minggu_epid: number
          penyakit: string
          propinsi: string
          sumber?: string
          tahun_epid: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jumlah_kasus?: number
          jumlah_kematian?: number
          minggu_epid?: number
          penyakit?: string
          propinsi?: string
          sumber?: string
          tahun_epid?: number
          updated_at?: string
        }
        Relationships: []
      }
      lokasi_kualitas_udara: {
        Row: {
          dibuat_pada: string
          id: string
          lokasi_induk: string | null
          nama: string
          sub_lokasi: string | null
          urutan: number
        }
        Insert: {
          dibuat_pada?: string
          id?: string
          lokasi_induk?: string | null
          nama: string
          sub_lokasi?: string | null
          urutan?: number
        }
        Update: {
          dibuat_pada?: string
          id?: string
          lokasi_induk?: string | null
          nama?: string
          sub_lokasi?: string | null
          urutan?: number
        }
        Relationships: []
      }
      malaria_migrasi: {
        Row: {
          dibuat_pada: string
          dirujuk_ke: string | null
          ditindaklanjuti: boolean | null
          id: number
          input_oleh: string | null
          jenis_plasmodium: string | null
          jenis_transportasi: string | null
          jml_demam: number | null
          jml_diperiksa: number | null
          jml_penumpang: number | null
          jml_positif_rdt: number | null
          jml_rdt_dilakukan: number | null
          keterangan: string | null
          kode_wilker: string
          no_kapal_pesawat: string | null
          rute_asal: string | null
          tgl_kedatangan: string
        }
        Insert: {
          dibuat_pada?: string
          dirujuk_ke?: string | null
          ditindaklanjuti?: boolean | null
          id?: never
          input_oleh?: string | null
          jenis_plasmodium?: string | null
          jenis_transportasi?: string | null
          jml_demam?: number | null
          jml_diperiksa?: number | null
          jml_penumpang?: number | null
          jml_positif_rdt?: number | null
          jml_rdt_dilakukan?: number | null
          keterangan?: string | null
          kode_wilker: string
          no_kapal_pesawat?: string | null
          rute_asal?: string | null
          tgl_kedatangan: string
        }
        Update: {
          dibuat_pada?: string
          dirujuk_ke?: string | null
          ditindaklanjuti?: boolean | null
          id?: never
          input_oleh?: string | null
          jenis_plasmodium?: string | null
          jenis_transportasi?: string | null
          jml_demam?: number | null
          jml_diperiksa?: number | null
          jml_penumpang?: number | null
          jml_positif_rdt?: number | null
          jml_rdt_dilakukan?: number | null
          keterangan?: string | null
          kode_wilker?: string
          no_kapal_pesawat?: string | null
          rute_asal?: string | null
          tgl_kedatangan?: string
        }
        Relationships: [
          {
            foreignKeyName: "malaria_migrasi_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      pab: {
        Row: {
          bakteriologis: string | null
          created_at: string | null
          fisik: string | null
          id: number
          jumlah_pab_diperiksa: number | null
          kimia: string | null
          nama_ttu: string
          tanggal: string
          wilayah_kerja: string
        }
        Insert: {
          bakteriologis?: string | null
          created_at?: string | null
          fisik?: string | null
          id?: never
          jumlah_pab_diperiksa?: number | null
          kimia?: string | null
          nama_ttu: string
          tanggal: string
          wilayah_kerja: string
        }
        Update: {
          bakteriologis?: string | null
          created_at?: string | null
          fisik?: string | null
          id?: never
          jumlah_pab_diperiksa?: number | null
          kimia?: string | null
          nama_ttu?: string
          tanggal?: string
          wilayah_kerja?: string
        }
        Relationships: []
      }
      pengaturan_ai: {
        Row: {
          aktif: boolean
          api_key: string
          base_url: string | null
          dibuat_pada: string
          id: number
          model: string
          nama_tampilan: string
          tipe_provider: string
          urutan_prioritas: number
        }
        Insert: {
          aktif?: boolean
          api_key: string
          base_url?: string | null
          dibuat_pada?: string
          id?: never
          model: string
          nama_tampilan: string
          tipe_provider: string
          urutan_prioritas?: number
        }
        Update: {
          aktif?: boolean
          api_key?: string
          base_url?: string | null
          dibuat_pada?: string
          id?: never
          model?: string
          nama_tampilan?: string
          tipe_provider?: string
          urutan_prioritas?: number
        }
        Relationships: []
      }
      pengaturan_klinik: {
        Row: {
          id: number
          standar_hari_vaksin: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          standar_hari_vaksin?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          standar_hari_vaksin?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pengawasan_klinik: {
        Row: {
          ada_vaksinator_bersertifikat: boolean | null
          alarm_suhu: boolean | null
          alur_pelayanan_terpasang: boolean | null
          anafilaktik_kit: boolean | null
          apotek_cold_chain_room: boolean | null
          avr: boolean | null
          catatan: string | null
          created_at: string | null
          form_pencatatan_suhu_manual: boolean | null
          freeze_tag: boolean | null
          genset: boolean | null
          id: string
          item_bermasalah: string[] | null
          jenis_pendingin_carrier: string | null
          jumlah_vaksinator: number | null
          klinik_id: string
          log_tag: boolean | null
          mou_limbah_ada: boolean | null
          mou_limbah_berlaku: boolean | null
          nama_petugas_1: string | null
          nama_petugas_2: string | null
          nama_petugas_3: string | null
          nama_petugas_klinik: string | null
          nomor_sio: string | null
          nomor_sip_dokter: string | null
          nomor_sip_perawat: string | null
          nomor_sip_pj: string | null
          papan_nama_ruangan_vaksinasi: boolean | null
          papan_nama_vaksinasi: boolean | null
          pendaftaran_komputer_jaringan: boolean | null
          pengelolaan_limbah_medis: boolean | null
          persentase_kepatuhan: number | null
          printer_passbook: boolean | null
          ruang_administrasi_komputer: boolean | null
          ruang_laboratorium: boolean | null
          ruang_periksa_screening: boolean | null
          ruang_tindakan: boolean | null
          ruang_tunggu_terpisah: boolean | null
          ruang_vaksinasi: boolean | null
          safety_box: boolean | null
          sio_ada: boolean | null
          sio_berlaku_sampai: string | null
          skor_kritikal_gagal: number | null
          skor_pendukung_gagal: number | null
          sop_pelayanan_vaksinasi: boolean | null
          sop_syok_anafilaktik: boolean | null
          status_kepatuhan: string | null
          submitted_by: string | null
          tanggal_kegiatan: string
          tempat_sampah_medis: boolean | null
          tempat_sampah_tertutup: boolean | null
          termometer: boolean | null
          toilet_urin: boolean | null
          vaccine_carrier: boolean | null
          vaccine_refrigerator_freezer: boolean | null
          waktu_mulai_layanan: string | null
          waktu_tutup_layanan: string | null
        }
        Insert: {
          ada_vaksinator_bersertifikat?: boolean | null
          alarm_suhu?: boolean | null
          alur_pelayanan_terpasang?: boolean | null
          anafilaktik_kit?: boolean | null
          apotek_cold_chain_room?: boolean | null
          avr?: boolean | null
          catatan?: string | null
          created_at?: string | null
          form_pencatatan_suhu_manual?: boolean | null
          freeze_tag?: boolean | null
          genset?: boolean | null
          id?: string
          item_bermasalah?: string[] | null
          jenis_pendingin_carrier?: string | null
          jumlah_vaksinator?: number | null
          klinik_id: string
          log_tag?: boolean | null
          mou_limbah_ada?: boolean | null
          mou_limbah_berlaku?: boolean | null
          nama_petugas_1?: string | null
          nama_petugas_2?: string | null
          nama_petugas_3?: string | null
          nama_petugas_klinik?: string | null
          nomor_sio?: string | null
          nomor_sip_dokter?: string | null
          nomor_sip_perawat?: string | null
          nomor_sip_pj?: string | null
          papan_nama_ruangan_vaksinasi?: boolean | null
          papan_nama_vaksinasi?: boolean | null
          pendaftaran_komputer_jaringan?: boolean | null
          pengelolaan_limbah_medis?: boolean | null
          persentase_kepatuhan?: number | null
          printer_passbook?: boolean | null
          ruang_administrasi_komputer?: boolean | null
          ruang_laboratorium?: boolean | null
          ruang_periksa_screening?: boolean | null
          ruang_tindakan?: boolean | null
          ruang_tunggu_terpisah?: boolean | null
          ruang_vaksinasi?: boolean | null
          safety_box?: boolean | null
          sio_ada?: boolean | null
          sio_berlaku_sampai?: string | null
          skor_kritikal_gagal?: number | null
          skor_pendukung_gagal?: number | null
          sop_pelayanan_vaksinasi?: boolean | null
          sop_syok_anafilaktik?: boolean | null
          status_kepatuhan?: string | null
          submitted_by?: string | null
          tanggal_kegiatan: string
          tempat_sampah_medis?: boolean | null
          tempat_sampah_tertutup?: boolean | null
          termometer?: boolean | null
          toilet_urin?: boolean | null
          vaccine_carrier?: boolean | null
          vaccine_refrigerator_freezer?: boolean | null
          waktu_mulai_layanan?: string | null
          waktu_tutup_layanan?: string | null
        }
        Update: {
          ada_vaksinator_bersertifikat?: boolean | null
          alarm_suhu?: boolean | null
          alur_pelayanan_terpasang?: boolean | null
          anafilaktik_kit?: boolean | null
          apotek_cold_chain_room?: boolean | null
          avr?: boolean | null
          catatan?: string | null
          created_at?: string | null
          form_pencatatan_suhu_manual?: boolean | null
          freeze_tag?: boolean | null
          genset?: boolean | null
          id?: string
          item_bermasalah?: string[] | null
          jenis_pendingin_carrier?: string | null
          jumlah_vaksinator?: number | null
          klinik_id?: string
          log_tag?: boolean | null
          mou_limbah_ada?: boolean | null
          mou_limbah_berlaku?: boolean | null
          nama_petugas_1?: string | null
          nama_petugas_2?: string | null
          nama_petugas_3?: string | null
          nama_petugas_klinik?: string | null
          nomor_sio?: string | null
          nomor_sip_dokter?: string | null
          nomor_sip_perawat?: string | null
          nomor_sip_pj?: string | null
          papan_nama_ruangan_vaksinasi?: boolean | null
          papan_nama_vaksinasi?: boolean | null
          pendaftaran_komputer_jaringan?: boolean | null
          pengelolaan_limbah_medis?: boolean | null
          persentase_kepatuhan?: number | null
          printer_passbook?: boolean | null
          ruang_administrasi_komputer?: boolean | null
          ruang_laboratorium?: boolean | null
          ruang_periksa_screening?: boolean | null
          ruang_tindakan?: boolean | null
          ruang_tunggu_terpisah?: boolean | null
          ruang_vaksinasi?: boolean | null
          safety_box?: boolean | null
          sio_ada?: boolean | null
          sio_berlaku_sampai?: string | null
          skor_kritikal_gagal?: number | null
          skor_pendukung_gagal?: number | null
          sop_pelayanan_vaksinasi?: boolean | null
          sop_syok_anafilaktik?: boolean | null
          status_kepatuhan?: string | null
          submitted_by?: string | null
          tanggal_kegiatan?: string
          tempat_sampah_medis?: boolean | null
          tempat_sampah_tertutup?: boolean | null
          termometer?: boolean | null
          toilet_urin?: boolean | null
          vaccine_carrier?: boolean | null
          vaccine_refrigerator_freezer?: boolean | null
          waktu_mulai_layanan?: string | null
          waktu_tutup_layanan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pengawasan_klinik_klinik_id_fkey"
            columns: ["klinik_id"]
            isOneToOne: false
            referencedRelation: "klinik_binaan"
            referencedColumns: ["id"]
          },
        ]
      }
      pengawasan_klinik_dokumen: {
        Row: {
          cloudinary_public_id: string
          cloudinary_url: string
          id: string
          jenis_dokumen: string
          pengawasan_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          cloudinary_public_id: string
          cloudinary_url: string
          id?: string
          jenis_dokumen: string
          pengawasan_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          cloudinary_public_id?: string
          cloudinary_url?: string
          id?: string
          jenis_dokumen?: string
          pengawasan_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pengawasan_klinik_dokumen_pengawasan_id_fkey"
            columns: ["pengawasan_id"]
            isOneToOne: false
            referencedRelation: "pengawasan_klinik"
            referencedColumns: ["id"]
          },
        ]
      }
      peraturan: {
        Row: {
          created_at: string | null
          deskripsi: string | null
          diunggah_oleh: string | null
          file_type: string
          file_url: string
          id: string
          judul: string
          kategori: string
          nama_file_asli: string
          nomor_peraturan: string | null
          tahun: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deskripsi?: string | null
          diunggah_oleh?: string | null
          file_type: string
          file_url: string
          id?: string
          judul: string
          kategori: string
          nama_file_asli: string
          nomor_peraturan?: string | null
          tahun?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deskripsi?: string | null
          diunggah_oleh?: string | null
          file_type?: string
          file_url?: string
          id?: string
          judul?: string
          kategori?: string
          nama_file_asli?: string
          nomor_peraturan?: string | null
          tahun?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          nama_lengkap: string | null
          role: string
          status: string
        }
        Insert: {
          id: string
          nama_lengkap?: string | null
          role: string
          status?: string
        }
        Update: {
          id?: string
          nama_lengkap?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      rat_guard: {
        Row: {
          created_at: string
          id: number
          jumlah_kapal: number
          pasang: number
          tanggal: string
          tidak_pasang: number
          wilayah_kerja: string
        }
        Insert: {
          created_at?: string
          id?: number
          jumlah_kapal?: number
          pasang?: number
          tanggal: string
          tidak_pasang?: number
          wilayah_kerja: string
        }
        Update: {
          created_at?: string
          id?: number
          jumlah_kapal?: number
          pasang?: number
          tanggal?: string
          tidak_pasang?: number
          wilayah_kerja?: string
        }
        Relationships: []
      }
      referensi_parameter_penyakit: {
        Row: {
          cara_penularan: string | null
          catatan: string | null
          id: number
          kategori: string
          masa_inkubasi_hari: number | null
          r0_default: number
          r0_max: number | null
          r0_min: number | null
          serial_interval_hari: number
          sumber_referensi: string | null
        }
        Insert: {
          cara_penularan?: string | null
          catatan?: string | null
          id?: number
          kategori: string
          masa_inkubasi_hari?: number | null
          r0_default: number
          r0_max?: number | null
          r0_min?: number | null
          serial_interval_hari: number
          sumber_referensi?: string | null
        }
        Update: {
          cara_penularan?: string | null
          catatan?: string | null
          id?: number
          kategori?: string
          masa_inkubasi_hari?: number | null
          r0_default?: number
          r0_max?: number | null
          r0_min?: number | null
          serial_interval_hari?: number
          sumber_referensi?: string | null
        }
        Relationships: []
      }
      referensi_populasi_wilker: {
        Row: {
          id: number
          jenis_wilker: string
          jumlah_ground_crew_terdaftar: number | null
          jumlah_petugas_kesehatan: number | null
          jumlah_petugas_non_kesehatan: number | null
          jumlah_tkbm_terdaftar: number | null
          kode_wilker: string | null
          populasi_kota_sekitar: number | null
          sumber_data: string | null
          updated_at: string | null
          wilayah_kerja: string | null
        }
        Insert: {
          id?: number
          jenis_wilker: string
          jumlah_ground_crew_terdaftar?: number | null
          jumlah_petugas_kesehatan?: number | null
          jumlah_petugas_non_kesehatan?: number | null
          jumlah_tkbm_terdaftar?: number | null
          kode_wilker?: string | null
          populasi_kota_sekitar?: number | null
          sumber_data?: string | null
          updated_at?: string | null
          wilayah_kerja?: string | null
        }
        Update: {
          id?: number
          jenis_wilker?: string
          jumlah_ground_crew_terdaftar?: number | null
          jumlah_petugas_kesehatan?: number | null
          jumlah_petugas_non_kesehatan?: number | null
          jumlah_tkbm_terdaftar?: number | null
          kode_wilker?: string | null
          populasi_kota_sekitar?: number | null
          sumber_data?: string | null
          updated_at?: string | null
          wilayah_kerja?: string | null
        }
        Relationships: []
      }
      riwayat_analisis_ai: {
        Row: {
          anomali: string | null
          dibuat_oleh: string | null
          dibuat_pada: string
          id: number
          konteks: string
          metrik: string | null
          periode_key: string
          provider_dipakai: string
          rekomendasi: string | null
          ringkasan: string
          tipe: string
          wilayah_kerja: string | null
        }
        Insert: {
          anomali?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          id?: never
          konteks: string
          metrik?: string | null
          periode_key: string
          provider_dipakai: string
          rekomendasi?: string | null
          ringkasan: string
          tipe?: string
          wilayah_kerja?: string | null
        }
        Update: {
          anomali?: string | null
          dibuat_oleh?: string | null
          dibuat_pada?: string
          id?: never
          konteks?: string
          metrik?: string | null
          periode_key?: string
          provider_dipakai?: string
          rekomendasi?: string | null
          ringkasan?: string
          tipe?: string
          wilayah_kerja?: string | null
        }
        Relationships: []
      }
      simulasi_wabah_kapal: {
        Row: {
          abk_bergejala: number
          created_at: string | null
          daftar_kota_tujuan_lanjutan: Json
          dibuat_oleh: string | null
          durasi_kontak_jam: number | null
          efektivitas_isolasi_persen: number | null
          estimasi_kasus_impor_kota: number | null
          hasil_kurva_kapal: Json | null
          hasil_kurva_tkbm: Json | null
          id: string
          jumlah_petugas_kesehatan: number | null
          jumlah_petugas_non_kesehatan: number | null
          jumlah_tkbm: number | null
          kategori_penyakit_id: number | null
          kegiatan_cop_id: string | null
          nama_kapal: string
          penggunaan_apd_persen: number | null
          r_efektif_kapal: number | null
          r_efektif_tanpa_isolasi: number | null
          r_efektif_tkbm: number | null
          r0_override: number | null
          rekomendasi_kebijakan: string | null
          risiko_petugas: Json | null
          tanggal_kejadian: string
          total_abk: number
          wilayah_kerja: string
        }
        Insert: {
          abk_bergejala: number
          created_at?: string | null
          daftar_kota_tujuan_lanjutan?: Json
          dibuat_oleh?: string | null
          durasi_kontak_jam?: number | null
          efektivitas_isolasi_persen?: number | null
          estimasi_kasus_impor_kota?: number | null
          hasil_kurva_kapal?: Json | null
          hasil_kurva_tkbm?: Json | null
          id?: string
          jumlah_petugas_kesehatan?: number | null
          jumlah_petugas_non_kesehatan?: number | null
          jumlah_tkbm?: number | null
          kategori_penyakit_id?: number | null
          kegiatan_cop_id?: string | null
          nama_kapal: string
          penggunaan_apd_persen?: number | null
          r_efektif_kapal?: number | null
          r_efektif_tanpa_isolasi?: number | null
          r_efektif_tkbm?: number | null
          r0_override?: number | null
          rekomendasi_kebijakan?: string | null
          risiko_petugas?: Json | null
          tanggal_kejadian: string
          total_abk: number
          wilayah_kerja: string
        }
        Update: {
          abk_bergejala?: number
          created_at?: string | null
          daftar_kota_tujuan_lanjutan?: Json
          dibuat_oleh?: string | null
          durasi_kontak_jam?: number | null
          efektivitas_isolasi_persen?: number | null
          estimasi_kasus_impor_kota?: number | null
          hasil_kurva_kapal?: Json | null
          hasil_kurva_tkbm?: Json | null
          id?: string
          jumlah_petugas_kesehatan?: number | null
          jumlah_petugas_non_kesehatan?: number | null
          jumlah_tkbm?: number | null
          kategori_penyakit_id?: number | null
          kegiatan_cop_id?: string | null
          nama_kapal?: string
          penggunaan_apd_persen?: number | null
          r_efektif_kapal?: number | null
          r_efektif_tanpa_isolasi?: number | null
          r_efektif_tkbm?: number | null
          r0_override?: number | null
          rekomendasi_kebijakan?: string | null
          risiko_petugas?: Json | null
          tanggal_kejadian?: string
          total_abk?: number
          wilayah_kerja?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulasi_wabah_kapal_kategori_penyakit_id_fkey"
            columns: ["kategori_penyakit_id"]
            isOneToOne: false
            referencedRelation: "referensi_parameter_penyakit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulasi_wabah_kapal_kegiatan_cop_id_fkey"
            columns: ["kegiatan_cop_id"]
            isOneToOne: false
            referencedRelation: "kegiatan_cop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulasi_wabah_kapal_kegiatan_cop_id_fkey"
            columns: ["kegiatan_cop_id"]
            isOneToOne: false
            referencedRelation: "view_kegiatan_cop_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      simulasi_wabah_pesawat: {
        Row: {
          created_at: string | null
          daftar_kota_tujuan_lanjutan: Json | null
          dibuat_oleh: string | null
          durasi_penerbangan_jam: number | null
          estimasi_kontak_erat: number | null
          id: string
          jumlah_bergejala: number
          jumlah_ground_crew: number | null
          kategori_penyakit_id: number | null
          kegiatan_pesawat_id: string | null
          kode_wilker: string
          nomor_penerbangan: string | null
          penggunaan_apd_persen: number | null
          radius_kontak_baris: number | null
          rekomendasi_kebijakan: string | null
          risiko_ground_crew: Json | null
          tanggal_kejadian: string
          total_kru: number
          total_penumpang: number
        }
        Insert: {
          created_at?: string | null
          daftar_kota_tujuan_lanjutan?: Json | null
          dibuat_oleh?: string | null
          durasi_penerbangan_jam?: number | null
          estimasi_kontak_erat?: number | null
          id?: string
          jumlah_bergejala: number
          jumlah_ground_crew?: number | null
          kategori_penyakit_id?: number | null
          kegiatan_pesawat_id?: string | null
          kode_wilker: string
          nomor_penerbangan?: string | null
          penggunaan_apd_persen?: number | null
          radius_kontak_baris?: number | null
          rekomendasi_kebijakan?: string | null
          risiko_ground_crew?: Json | null
          tanggal_kejadian: string
          total_kru: number
          total_penumpang: number
        }
        Update: {
          created_at?: string | null
          daftar_kota_tujuan_lanjutan?: Json | null
          dibuat_oleh?: string | null
          durasi_penerbangan_jam?: number | null
          estimasi_kontak_erat?: number | null
          id?: string
          jumlah_bergejala?: number
          jumlah_ground_crew?: number | null
          kategori_penyakit_id?: number | null
          kegiatan_pesawat_id?: string | null
          kode_wilker?: string
          nomor_penerbangan?: string | null
          penggunaan_apd_persen?: number | null
          radius_kontak_baris?: number | null
          rekomendasi_kebijakan?: string | null
          risiko_ground_crew?: Json | null
          tanggal_kejadian?: string
          total_kru?: number
          total_penumpang?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulasi_wabah_pesawat_kategori_penyakit_id_fkey"
            columns: ["kategori_penyakit_id"]
            isOneToOne: false
            referencedRelation: "referensi_parameter_penyakit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulasi_wabah_pesawat_kegiatan_pesawat_id_fkey"
            columns: ["kegiatan_pesawat_id"]
            isOneToOne: false
            referencedRelation: "kegiatan_pesawat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulasi_wabah_pesawat_kegiatan_pesawat_id_fkey"
            columns: ["kegiatan_pesawat_id"]
            isOneToOne: false
            referencedRelation: "v_kegiatan_pesawat_rekap"
            referencedColumns: ["id"]
          },
        ]
      }
      skdr_jenis_penyakit: {
        Row: {
          jenis_penyakit: string
          nomor: number
        }
        Insert: {
          jenis_penyakit: string
          nomor: number
        }
        Update: {
          jenis_penyakit?: string
          nomor?: number
        }
        Relationships: []
      }
      skdr_mingguan: {
        Row: {
          created_at: string | null
          id: number
          jenis_penyakit_id: number
          jumlah_kasus: number
          minggu_epid: number
          tahun_epid: number
          updated_at: string | null
          wilayah_kerja: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          jenis_penyakit_id: number
          jumlah_kasus?: number
          minggu_epid: number
          tahun_epid: number
          updated_at?: string | null
          wilayah_kerja: string
        }
        Update: {
          created_at?: string | null
          id?: number
          jenis_penyakit_id?: number
          jumlah_kasus?: number
          minggu_epid?: number
          tahun_epid?: number
          updated_at?: string | null
          wilayah_kerja?: string
        }
        Relationships: [
          {
            foreignKeyName: "skdr_mingguan_jenis_penyakit_id_fkey"
            columns: ["jenis_penyakit_id"]
            isOneToOne: false
            referencedRelation: "skdr_jenis_penyakit"
            referencedColumns: ["nomor"]
          },
        ]
      }
      statistik_kunjungan: {
        Row: {
          created_at: string
          id: number
          ip_address: string | null
          keterangan: string | null
          kota: string | null
          negara: string | null
          role: string
          tipe: string
          user_id: string | null
          wilayah: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          ip_address?: string | null
          keterangan?: string | null
          kota?: string | null
          negara?: string | null
          role?: string
          tipe: string
          user_id?: string | null
          wilayah?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          ip_address?: string | null
          keterangan?: string | null
          kota?: string | null
          negara?: string | null
          role?: string
          tipe?: string
          user_id?: string | null
          wilayah?: string | null
        }
        Relationships: []
      }
      tb_data: {
        Row: {
          dibuat_pada: string
          id: number
          input_oleh: string | null
          jml_diperiksa_tcm: number | null
          jml_kontak_diperiksa: number | null
          jml_kontak_erat: number | null
          jml_mulai_pengobatan: number | null
          jml_positif_tcm: number | null
          jml_suspek: number | null
          kategori_pasien: string | null
          kelompok_sasaran: string | null
          keterangan: string | null
          kode_wilker: string
          sensitivitas_oat: string | null
          tgl_penemuan: string
        }
        Insert: {
          dibuat_pada?: string
          id?: never
          input_oleh?: string | null
          jml_diperiksa_tcm?: number | null
          jml_kontak_diperiksa?: number | null
          jml_kontak_erat?: number | null
          jml_mulai_pengobatan?: number | null
          jml_positif_tcm?: number | null
          jml_suspek?: number | null
          kategori_pasien?: string | null
          kelompok_sasaran?: string | null
          keterangan?: string | null
          kode_wilker: string
          sensitivitas_oat?: string | null
          tgl_penemuan: string
        }
        Update: {
          dibuat_pada?: string
          id?: never
          input_oleh?: string | null
          jml_diperiksa_tcm?: number | null
          jml_kontak_diperiksa?: number | null
          jml_kontak_erat?: number | null
          jml_mulai_pengobatan?: number | null
          jml_positif_tcm?: number | null
          jml_suspek?: number | null
          kategori_pasien?: string | null
          kelompok_sasaran?: string | null
          keterangan?: string | null
          kode_wilker?: string
          sensitivitas_oat?: string | null
          tgl_penemuan?: string
        }
        Relationships: [
          {
            foreignKeyName: "tb_data_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      tpp: {
        Row: {
          bakteriologis: string | null
          borax: string | null
          created_at: string | null
          formaldehyde: string | null
          hy_rise: string | null
          id: number
          inspeksi_kesehatan_lingkungan: string | null
          jumlah_sampel: number | null
          keterangan: string | null
          metyl_yellow: string | null
          nama_tpp: string
          rodamin_b: string | null
          tanggal_kegiatan: string
          wilayah_kerja: string
        }
        Insert: {
          bakteriologis?: string | null
          borax?: string | null
          created_at?: string | null
          formaldehyde?: string | null
          hy_rise?: string | null
          id?: never
          inspeksi_kesehatan_lingkungan?: string | null
          jumlah_sampel?: number | null
          keterangan?: string | null
          metyl_yellow?: string | null
          nama_tpp: string
          rodamin_b?: string | null
          tanggal_kegiatan: string
          wilayah_kerja: string
        }
        Update: {
          bakteriologis?: string | null
          borax?: string | null
          created_at?: string | null
          formaldehyde?: string | null
          hy_rise?: string | null
          id?: never
          inspeksi_kesehatan_lingkungan?: string | null
          jumlah_sampel?: number | null
          keterangan?: string | null
          metyl_yellow?: string | null
          nama_tpp?: string
          rodamin_b?: string | null
          tanggal_kegiatan?: string
          wilayah_kerja?: string
        }
        Relationships: []
      }
      ttu: {
        Row: {
          created_at: string | null
          getaran_diruang_kerja: string | null
          hasil: string | null
          id: number
          instalasi: string | null
          kebisingan: string | null
          lingkungan_luar_halaman: string | null
          nama_ttu: string
          pemeliharaan_jamban_kamar_mandi: string | null
          pencahayaan: string | null
          pengelolaan_limbah: string | null
          pengendalian_vektor_penyakit: string | null
          penyehatan_air: string | null
          penyehatan_udara_ruang: string | null
          ruang_bangunan: string | null
          tanggal: string
          wilayah_kerja: string
        }
        Insert: {
          created_at?: string | null
          getaran_diruang_kerja?: string | null
          hasil?: string | null
          id?: never
          instalasi?: string | null
          kebisingan?: string | null
          lingkungan_luar_halaman?: string | null
          nama_ttu: string
          pemeliharaan_jamban_kamar_mandi?: string | null
          pencahayaan?: string | null
          pengelolaan_limbah?: string | null
          pengendalian_vektor_penyakit?: string | null
          penyehatan_air?: string | null
          penyehatan_udara_ruang?: string | null
          ruang_bangunan?: string | null
          tanggal: string
          wilayah_kerja: string
        }
        Update: {
          created_at?: string | null
          getaran_diruang_kerja?: string | null
          hasil?: string | null
          id?: never
          instalasi?: string | null
          kebisingan?: string | null
          lingkungan_luar_halaman?: string | null
          nama_ttu?: string
          pemeliharaan_jamban_kamar_mandi?: string | null
          pencahayaan?: string | null
          pengelolaan_limbah?: string | null
          pengendalian_vektor_penyakit?: string | null
          penyehatan_air?: string | null
          penyehatan_udara_ruang?: string | null
          ruang_bangunan?: string | null
          tanggal?: string
          wilayah_kerja?: string
        }
        Relationships: []
      }
      vektor_anopheles: {
        Row: {
          cuaca: string | null
          dibuat_pada: string
          fase_bulan: string | null
          id: number
          jml_jam_tangkap: number | null
          jml_nyamuk: number | null
          jumlah_cidukan: number | null
          jumlah_jenis_larva: number | null
          jumlah_larva: number | null
          keadaan_tempat_perindukan: string | null
          kelembapan_pct: number | null
          kode_wilker: string
          macam_tempat_perindukan: string | null
          mbr: number | null
          metode_tangkap: string | null
          mhd: number | null
          spesies: string | null
          spesies_larva: string | null
          suhu_c: number | null
          tgl_survei: string
          tipe_pengamatan: string
          zona: string | null
        }
        Insert: {
          cuaca?: string | null
          dibuat_pada?: string
          fase_bulan?: string | null
          id?: never
          jml_jam_tangkap?: number | null
          jml_nyamuk?: number | null
          jumlah_cidukan?: number | null
          jumlah_jenis_larva?: number | null
          jumlah_larva?: number | null
          keadaan_tempat_perindukan?: string | null
          kelembapan_pct?: number | null
          kode_wilker: string
          macam_tempat_perindukan?: string | null
          mbr?: number | null
          metode_tangkap?: string | null
          mhd?: number | null
          spesies?: string | null
          spesies_larva?: string | null
          suhu_c?: number | null
          tgl_survei: string
          tipe_pengamatan: string
          zona?: string | null
        }
        Update: {
          cuaca?: string | null
          dibuat_pada?: string
          fase_bulan?: string | null
          id?: never
          jml_jam_tangkap?: number | null
          jml_nyamuk?: number | null
          jumlah_cidukan?: number | null
          jumlah_jenis_larva?: number | null
          jumlah_larva?: number | null
          keadaan_tempat_perindukan?: string | null
          kelembapan_pct?: number | null
          kode_wilker?: string
          macam_tempat_perindukan?: string | null
          mbr?: number | null
          metode_tangkap?: string | null
          mhd?: number | null
          spesies?: string | null
          spesies_larva?: string | null
          suhu_c?: number | null
          tgl_survei?: string
          tipe_pengamatan?: string
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_anopheles_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      vektor_dbd: {
        Row: {
          abj: number | null
          bi: number | null
          ci: number | null
          container_diperiksa: number | null
          container_positif: number | null
          curah_hujan_mm: number | null
          dibuat_pada: string
          hi: number | null
          id: number
          jml_insektisida_fogging_ml: number | null
          jml_positif_jentik: number
          jml_rumah_diperiksa: number
          kode_wilker: string
          larvasida_gram: number | null
          luas_wilayah_fogging_ha: number | null
          minggu_epid: string | null
          sub_lokasi: string | null
          tgl_survei: string
          tindakan_pengendalian: string | null
          zona: string | null
        }
        Insert: {
          abj?: number | null
          bi?: number | null
          ci?: number | null
          container_diperiksa?: number | null
          container_positif?: number | null
          curah_hujan_mm?: number | null
          dibuat_pada?: string
          hi?: number | null
          id?: number
          jml_insektisida_fogging_ml?: number | null
          jml_positif_jentik?: number
          jml_rumah_diperiksa?: number
          kode_wilker: string
          larvasida_gram?: number | null
          luas_wilayah_fogging_ha?: number | null
          minggu_epid?: string | null
          sub_lokasi?: string | null
          tgl_survei: string
          tindakan_pengendalian?: string | null
          zona?: string | null
        }
        Update: {
          abj?: number | null
          bi?: number | null
          ci?: number | null
          container_diperiksa?: number | null
          container_positif?: number | null
          curah_hujan_mm?: number | null
          dibuat_pada?: string
          hi?: number | null
          id?: number
          jml_insektisida_fogging_ml?: number | null
          jml_positif_jentik?: number
          jml_rumah_diperiksa?: number
          kode_wilker?: string
          larvasida_gram?: number | null
          luas_wilayah_fogging_ha?: number | null
          minggu_epid?: string | null
          sub_lokasi?: string | null
          tgl_survei?: string
          tindakan_pengendalian?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_dbd_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      vektor_diare: {
        Row: {
          cuaca: string | null
          curah_hujan_mm: number | null
          dibuat_pada: string
          fly_index: number | null
          hasil_pengamatan: string | null
          id: number
          input_oleh: string | null
          insektisida_terpakai_ml: number | null
          jenis_kegiatan: string
          kelembapan_pct: number | null
          kepadatan_kecoa_per_m2: number | null
          keterangan: string | null
          kode_wilker: string
          lokasi: string | null
          luas_area_semprot_m2: number | null
          nilai_hasil_pengamatan: number
          suhu_c: number | null
          tgl_kegiatan: string
          tindakan_pengendalian: string | null
        }
        Insert: {
          cuaca?: string | null
          curah_hujan_mm?: number | null
          dibuat_pada?: string
          fly_index?: number | null
          hasil_pengamatan?: string | null
          id?: never
          input_oleh?: string | null
          insektisida_terpakai_ml?: number | null
          jenis_kegiatan: string
          kelembapan_pct?: number | null
          kepadatan_kecoa_per_m2?: number | null
          keterangan?: string | null
          kode_wilker: string
          lokasi?: string | null
          luas_area_semprot_m2?: number | null
          nilai_hasil_pengamatan: number
          suhu_c?: number | null
          tgl_kegiatan: string
          tindakan_pengendalian?: string | null
        }
        Update: {
          cuaca?: string | null
          curah_hujan_mm?: number | null
          dibuat_pada?: string
          fly_index?: number | null
          hasil_pengamatan?: string | null
          id?: never
          input_oleh?: string | null
          insektisida_terpakai_ml?: number | null
          jenis_kegiatan?: string
          kelembapan_pct?: number | null
          kepadatan_kecoa_per_m2?: number | null
          keterangan?: string | null
          kode_wilker?: string
          lokasi?: string | null
          luas_area_semprot_m2?: number | null
          nilai_hasil_pengamatan?: number
          suhu_c?: number | null
          tgl_kegiatan?: string
          tindakan_pengendalian?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_diare_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      vektor_tikus: {
        Row: {
          area_survei: string | null
          dibuat_pada: string
          hasil_hantavirus: string | null
          hasil_leptospira: string | null
          hasil_pes: string | null
          id: number
          index_pinjal: number | null
          input_oleh: string | null
          jenis_lainnya: number | null
          jenis_trap: string | null
          jml_pinjal_ditemukan: number | null
          jml_trap_dipasang: number
          jml_trap_tertangkap: number
          jumlah_positif_hantavirus: number | null
          jumlah_positif_leptospira: number | null
          jumlah_positif_pes: number | null
          keterangan: string | null
          kode_wilker: string
          minggu_epid: string | null
          mm: number | null
          rn: number | null
          rt: number | null
          spesies_dominan: string | null
          tgl_survei: string
          tsi: number | null
          uji_lab: string | null
        }
        Insert: {
          area_survei?: string | null
          dibuat_pada?: string
          hasil_hantavirus?: string | null
          hasil_leptospira?: string | null
          hasil_pes?: string | null
          id?: never
          index_pinjal?: number | null
          input_oleh?: string | null
          jenis_lainnya?: number | null
          jenis_trap?: string | null
          jml_pinjal_ditemukan?: number | null
          jml_trap_dipasang?: number
          jml_trap_tertangkap?: number
          jumlah_positif_hantavirus?: number | null
          jumlah_positif_leptospira?: number | null
          jumlah_positif_pes?: number | null
          keterangan?: string | null
          kode_wilker: string
          minggu_epid?: string | null
          mm?: number | null
          rn?: number | null
          rt?: number | null
          spesies_dominan?: string | null
          tgl_survei: string
          tsi?: number | null
          uji_lab?: string | null
        }
        Update: {
          area_survei?: string | null
          dibuat_pada?: string
          hasil_hantavirus?: string | null
          hasil_leptospira?: string | null
          hasil_pes?: string | null
          id?: never
          index_pinjal?: number | null
          input_oleh?: string | null
          jenis_lainnya?: number | null
          jenis_trap?: string | null
          jml_pinjal_ditemukan?: number | null
          jml_trap_dipasang?: number
          jml_trap_tertangkap?: number
          jumlah_positif_hantavirus?: number | null
          jumlah_positif_leptospira?: number | null
          jumlah_positif_pes?: number | null
          keterangan?: string | null
          kode_wilker?: string
          minggu_epid?: string | null
          mm?: number | null
          rn?: number | null
          rt?: number | null
          spesies_dominan?: string | null
          tgl_survei?: string
          tsi?: number | null
          uji_lab?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_tikus_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      wilayah_ispa: {
        Row: {
          dibuat_pada: string
          id: string
          kode_wilker: string
          label: string
          urutan: number
          zona: string | null
        }
        Insert: {
          dibuat_pada?: string
          id?: string
          kode_wilker: string
          label: string
          urutan?: number
          zona?: string | null
        }
        Update: {
          dibuat_pada?: string
          id?: string
          kode_wilker?: string
          label?: string
          urutan?: number
          zona?: string | null
        }
        Relationships: []
      }
      wilker_nama_alias: {
        Row: {
          kode_wilker: string
          wilayah_kerja_teks: string
        }
        Insert: {
          kode_wilker: string
          wilayah_kerja_teks: string
        }
        Update: {
          kode_wilker?: string
          wilayah_kerja_teks?: string
        }
        Relationships: [
          {
            foreignKeyName: "wilker_nama_alias_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      wilker_ref: {
        Row: {
          catatan: string | null
          jenis: string
          kode: string
          lat: number
          lng: number
          nama: string
          sub_lokasi: string[] | null
        }
        Insert: {
          catatan?: string | null
          jenis: string
          kode: string
          lat: number
          lng: number
          nama: string
          sub_lokasi?: string[] | null
        }
        Update: {
          catatan?: string | null
          jenis?: string
          kode?: string
          lat?: number
          lng?: number
          nama?: string
          sub_lokasi?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      v_kegiatan_pesawat_rekap: {
        Row: {
          crew_berangkat: number | null
          crew_datang: number | null
          epi_week: number | null
          iaos_total: number | null
          id: string | null
          jenazah_total: number | null
          keberangkatan: string | null
          kedatangan: string | null
          kier_total: number | null
          kode_wilker: string | null
          maskapai: string | null
          nama_wilker: string | null
          penumpang_berangkat: number | null
          penumpang_datang: number | null
          sklt_total: number | null
          status_data: string | null
          tahun: number | null
          tanggal: string | null
          td_laik_total: number | null
          total_sertifikat_female: number | null
          total_sertifikat_male: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kegiatan_pesawat_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      v_nasional_emerging_mingguan: {
        Row: {
          minggu_epid: number | null
          penyakit: string | null
          tahun_epid: number | null
          total_kasus: number | null
          total_kematian: number | null
        }
        Relationships: []
      }
      v_nasional_emerging_per_propinsi: {
        Row: {
          penyakit: string | null
          propinsi: string | null
          tahun_epid: number | null
          total_kasus: number | null
          total_kematian: number | null
        }
        Relationships: []
      }
      view_bulanan_kategori: {
        Row: {
          bulan: number | null
          jumlah: number | null
          kategori: string | null
          nilai: string | null
          tahun: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_bulanan_kategori_phqc: {
        Row: {
          bulan: number | null
          jumlah: number | null
          kategori: string | null
          nilai: string | null
          tahun: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_bulanan_penyakit_emerging: {
        Row: {
          bulan: number | null
          negara: string | null
          penyakit: string | null
          tahun_epid: number | null
          total_kasus: number | null
          total_kematian: number | null
        }
        Relationships: []
      }
      view_bulanan_ringkasan: {
        Row: {
          bulan: number | null
          jumlah_kapal: number | null
          tahun: number | null
          total_abk: number | null
          total_abk_wna: number | null
          total_abk_wni: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_bulanan_ringkasan_phqc: {
        Row: {
          bulan: number | null
          jumlah_kapal: number | null
          tahun: number | null
          total_abk: number | null
          total_abk_wna: number | null
          total_abk_wni: number | null
          total_penumpang: number | null
          total_penumpang_wna: number | null
          total_penumpang_wni: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_hiv_mingguan: {
        Row: {
          kode_wilker: string | null
          minggu_epid: number | null
          tahun_epid: number | null
          total_diperiksa: number | null
          total_konfirmasi_positif: number | null
          total_reaktif: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hiv_data_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      view_hotspot_kaltim_bulanan: {
        Row: {
          bulan: number | null
          confidence_rerata: number | null
          frp_rerata: number | null
          jumlah_hotspot: number | null
          tahun: number | null
        }
        Relationships: []
      }
      view_hotspot_kaltim_mingguan: {
        Row: {
          confidence_rerata: number | null
          frp_rerata: number | null
          jumlah_hotspot: number | null
          minggu_epid: number | null
          tahun_epid: number | null
        }
        Relationships: []
      }
      view_karhutla_ispa_bulanan: {
        Row: {
          bulan: number | null
          jml_input: number | null
          kode_wilker: string | null
          tahun: number | null
          total_kasus_anak: number | null
          total_kasus_dewasa: number | null
          total_kasus_ispa: number | null
          zona: string | null
        }
        Relationships: []
      }
      view_karhutla_ispa_mingguan: {
        Row: {
          jml_input: number | null
          kode_wilker: string | null
          minggu_epid: number | null
          tahun_epid: number | null
          total_kasus_anak: number | null
          total_kasus_dewasa: number | null
          total_kasus_ispa: number | null
          zona: string | null
        }
        Relationships: []
      }
      view_kegiatan_cop_enriched: {
        Row: {
          bendera_kapal: string | null
          bulan_kalender: number | null
          daerah_terjangkit: string | null
          faktor_risiko: string | null
          id: string | null
          jml_abk_wna: number | null
          jml_abk_wni: number | null
          keberadaan_vektor: string | null
          kelengkapan_dokumen: string | null
          minggu_epid: number | null
          nama_kapal: string | null
          negara_kedatangan: string | null
          orang_sakit: string | null
          rba: string | null
          sanitasi: string | null
          tahun_epid: number | null
          tahun_kalender: number | null
          tgl_kedatangan: string | null
          total_abk: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_kegiatan_phqc_enriched: {
        Row: {
          bendera: string | null
          bulan_kalender: number | null
          id: number | null
          jml_abk_wna: number | null
          jml_abk_wni: number | null
          jml_penumpang_wna: number | null
          jml_penumpang_wni: number | null
          minggu_epid: number | null
          nama_kapal: string | null
          pelabuhan_kedatangan: string | null
          pelabuhan_tujuan: string | null
          rba: string | null
          tahun_epid: number | null
          tahun_kalender: number | null
          tgl_keberangkatan: string | null
          total_abk: number | null
          total_penumpang: number | null
          tujuan_berlayar: string | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_kualitas_udara_bulanan: {
        Row: {
          bulan: number | null
          jml_input: number | null
          jml_tms: number | null
          lokasi: string | null
          pm10_rerata: number | null
          pm25_rerata: number | null
          suhu_rerata: number | null
          tahun: number | null
        }
        Relationships: []
      }
      view_kualitas_udara_mingguan: {
        Row: {
          jml_input: number | null
          jml_tms: number | null
          lokasi: string | null
          minggu_epid: number | null
          pm10_rerata: number | null
          pm25_rerata: number | null
          suhu_rerata: number | null
          tahun_epid: number | null
        }
        Relationships: []
      }
      view_malaria_mingguan: {
        Row: {
          kode_wilker: string | null
          minggu_epid: number | null
          tahun_epid: number | null
          total_diperiksa: number | null
          total_penumpang: number | null
          total_positif_rdt: number | null
        }
        Relationships: [
          {
            foreignKeyName: "malaria_migrasi_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      view_mingguan_kategori: {
        Row: {
          jumlah: number | null
          kategori: string | null
          minggu_epid: number | null
          nilai: string | null
          tahun_epid: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_mingguan_kategori_phqc: {
        Row: {
          jumlah: number | null
          kategori: string | null
          minggu_epid: number | null
          nilai: string | null
          tahun_epid: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_mingguan_penyakit_emerging: {
        Row: {
          minggu_epid: number | null
          negara: string | null
          penyakit: string | null
          tahun_epid: number | null
          total_kasus: number | null
          total_kematian: number | null
        }
        Relationships: []
      }
      view_mingguan_ringkasan: {
        Row: {
          jumlah_kapal: number | null
          minggu_epid: number | null
          tahun_epid: number | null
          total_abk: number | null
          total_abk_wna: number | null
          total_abk_wni: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_mingguan_ringkasan_phqc: {
        Row: {
          jumlah_kapal: number | null
          minggu_epid: number | null
          tahun_epid: number | null
          total_abk: number | null
          total_abk_wna: number | null
          total_abk_wni: number | null
          total_penumpang: number | null
          total_penumpang_wna: number | null
          total_penumpang_wni: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_pab_bulanan: {
        Row: {
          bulan: number | null
          jumlah_ms: number | null
          jumlah_pemeriksaan: number | null
          jumlah_tms: number | null
          tahun: number | null
          tms_bakteriologis: number | null
          tms_fisik: number | null
          tms_kimia: number | null
          total_pab_diperiksa: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_pab_mingguan: {
        Row: {
          jumlah_ms: number | null
          jumlah_pemeriksaan: number | null
          jumlah_tms: number | null
          minggu: number | null
          tahun: number | null
          tms_bakteriologis: number | null
          tms_fisik: number | null
          tms_kimia: number | null
          total_pab_diperiksa: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_pesawat_kota_bulanan: {
        Row: {
          arah: string | null
          bulan: number | null
          jumlah_penerbangan: number | null
          kota: string | null
          tahun: number | null
          total_penumpang: number | null
        }
        Relationships: []
      }
      view_pesawat_maskapai_bulanan: {
        Row: {
          arah: string | null
          bulan: number | null
          jumlah_penerbangan: number | null
          maskapai: string | null
          tahun: number | null
          total_penumpang: number | null
        }
        Relationships: []
      }
      view_rat_guard_bulanan: {
        Row: {
          bulan: number | null
          jumlah_kapal: number | null
          pasang: number | null
          persentase_kepatuhan: number | null
          tahun: number | null
          tidak_pasang: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_rat_guard_mingguan: {
        Row: {
          jumlah_kapal: number | null
          minggu_epid: number | null
          pasang: number | null
          persentase_kepatuhan: number | null
          tahun: number | null
          tidak_pasang: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_skdr_alert_mingguan: {
        Row: {
          ambang_atas: number | null
          id: number | null
          jenis_penyakit: string | null
          jenis_penyakit_id: number | null
          jumlah_kasus: number | null
          minggu_epid: number | null
          rata2_4minggu: number | null
          sd_4minggu: number | null
          status_alert: boolean | null
          tahun_epid: number | null
          wilayah_kerja: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skdr_mingguan_jenis_penyakit_id_fkey"
            columns: ["jenis_penyakit_id"]
            isOneToOne: false
            referencedRelation: "skdr_jenis_penyakit"
            referencedColumns: ["nomor"]
          },
        ]
      }
      view_tb_mingguan: {
        Row: {
          kode_wilker: string | null
          minggu_epid: number | null
          tahun_epid: number | null
          total_diperiksa_tcm: number | null
          total_positif_tcm: number | null
          total_suspek: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_data_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      view_tpp_bulanan: {
        Row: {
          bulan: number | null
          ikl_ms: number | null
          ikl_tms: number | null
          jumlah_ms: number | null
          jumlah_tms: number | null
          jumlah_tpp_diperiksa: number | null
          ms_bakteriologis: number | null
          ms_borax: number | null
          ms_formaldehyde: number | null
          ms_hy_rise: number | null
          ms_metyl_yellow: number | null
          ms_rodamin_b: number | null
          tahun: number | null
          tms_bakteriologis: number | null
          tms_borax: number | null
          tms_formaldehyde: number | null
          tms_hy_rise: number | null
          tms_metyl_yellow: number | null
          tms_rodamin_b: number | null
          total_sampel: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_tpp_mingguan: {
        Row: {
          ikl_ms: number | null
          ikl_tms: number | null
          jumlah_ms: number | null
          jumlah_tms: number | null
          jumlah_tpp_diperiksa: number | null
          minggu: number | null
          ms_bakteriologis: number | null
          ms_borax: number | null
          ms_formaldehyde: number | null
          ms_hy_rise: number | null
          ms_metyl_yellow: number | null
          ms_rodamin_b: number | null
          tahun: number | null
          tms_bakteriologis: number | null
          tms_borax: number | null
          tms_formaldehyde: number | null
          tms_hy_rise: number | null
          tms_metyl_yellow: number | null
          tms_rodamin_b: number | null
          total_sampel: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_ttu_bulanan: {
        Row: {
          bulan: number | null
          jumlah_diperiksa: number | null
          jumlah_ms: number | null
          jumlah_tms: number | null
          tahun: number | null
          tms_getaran_diruang_kerja: number | null
          tms_instalasi: number | null
          tms_kebisingan: number | null
          tms_lingkungan_luar_halaman: number | null
          tms_pemeliharaan_jamban_kamar_mandi: number | null
          tms_pencahayaan: number | null
          tms_pengelolaan_limbah: number | null
          tms_pengendalian_vektor_penyakit: number | null
          tms_penyehatan_air: number | null
          tms_penyehatan_udara_ruang: number | null
          tms_ruang_bangunan: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_ttu_mingguan: {
        Row: {
          jumlah_diperiksa: number | null
          jumlah_ms: number | null
          jumlah_tms: number | null
          minggu: number | null
          tahun: number | null
          tms_getaran_diruang_kerja: number | null
          tms_instalasi: number | null
          tms_kebisingan: number | null
          tms_lingkungan_luar_halaman: number | null
          tms_pemeliharaan_jamban_kamar_mandi: number | null
          tms_pencahayaan: number | null
          tms_pengelolaan_limbah: number | null
          tms_pengendalian_vektor_penyakit: number | null
          tms_penyehatan_air: number | null
          tms_penyehatan_udara_ruang: number | null
          tms_ruang_bangunan: number | null
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_vektor_anopheles_mingguan: {
        Row: {
          jml_survei: number | null
          kelembapan_rerata: number | null
          kode_wilker: string | null
          mbr_rerata: number | null
          mhd_rerata: number | null
          minggu_epid: number | null
          suhu_rerata: number | null
          tahun_epid: number | null
          tipe_pengamatan: string | null
          total_cidukan: number | null
          total_larva: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_anopheles_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      view_vektor_dbd_mingguan: {
        Row: {
          abj_rerata: number | null
          bi_rerata: number | null
          ci_rerata: number | null
          curah_hujan_rerata: number | null
          hi_rerata: number | null
          jml_survei: number | null
          kode_wilker: string | null
          minggu_epid: number | null
          tahun_epid: number | null
          total_positif_jentik: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_dbd_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      view_vektor_diare_bulanan: {
        Row: {
          bulan: number | null
          cuaca_dominan: string | null
          curah_hujan_rerata: number | null
          fly_index_rerata: number | null
          insektisida_rerata: number | null
          jenis_kegiatan: string | null
          jml_memenuhi_syarat: number | null
          jml_pengamatan: number | null
          kelembapan_rerata: number | null
          kepadatan_kecoa_rerata: number | null
          kode_wilker: string | null
          luas_area_rerata: number | null
          suhu_rerata: number | null
          tahun: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_diare_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      view_vektor_diare_mingguan: {
        Row: {
          cuaca_dominan: string | null
          curah_hujan_rerata: number | null
          fly_index_rerata: number | null
          insektisida_rerata: number | null
          jenis_kegiatan: string | null
          jml_memenuhi_syarat: number | null
          jml_pengamatan: number | null
          kelembapan_rerata: number | null
          kepadatan_kecoa_rerata: number | null
          kode_wilker: string | null
          luas_area_rerata: number | null
          minggu_epid: number | null
          suhu_rerata: number | null
          tahun_epid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_diare_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      view_vektor_tikus_bulanan: {
        Row: {
          bulan: number | null
          index_pinjal_rerata: number | null
          jenis_lainnya: number | null
          jml_survei: number | null
          jml_trap_dipasang: number | null
          jml_trap_tertangkap: number | null
          kode_wilker: string | null
          mm: number | null
          rn: number | null
          rt: number | null
          tahun: number | null
          total_positif_hantavirus: number | null
          total_positif_leptospira: number | null
          total_positif_pes: number | null
          tsi_rerata: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_tikus_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      view_vektor_tikus_mingguan: {
        Row: {
          index_pinjal_rerata: number | null
          jenis_lainnya: number | null
          jml_survei: number | null
          jml_trap_dipasang: number | null
          jml_trap_tertangkap: number | null
          kode_wilker: string | null
          minggu_epid: number | null
          mm: number | null
          rn: number | null
          rt: number | null
          tahun_epid: number | null
          total_positif_hantavirus: number | null
          total_positif_leptospira: number | null
          total_positif_pes: number | null
          tsi_rerata: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vektor_tikus_kode_wilker_fkey"
            columns: ["kode_wilker"]
            isOneToOne: false
            referencedRelation: "wilker_ref"
            referencedColumns: ["kode"]
          },
        ]
      }
      view_wilayah_kerja_rat_guard: {
        Row: {
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_wilayah_kerja_sanitasi: {
        Row: {
          wilayah_kerja: string | null
        }
        Relationships: []
      }
      view_wilayah_kerja_skdr: {
        Row: {
          wilayah_kerja: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      epi_week_start: {
        Args: { p_minggu: number; p_tahun: number }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      mmwr_week: {
        Args: { d: string }
        Returns: {
          minggu_epid: number
          tahun_epid: number
        }[]
      }
      status_lapor_bulanan: {
        Args: { p_bulan: number; p_tahun: number }
        Returns: {
          jumlah: number
          kegiatan: string
          kode_wilker: string
        }[]
      }
      status_lapor_mingguan: {
        Args: { p_minggu: number; p_tahun: number }
        Returns: {
          jumlah: number
          kegiatan: string
          kode_wilker: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
