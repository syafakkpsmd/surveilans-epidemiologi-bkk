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
          judul: string
          public_id: string
          url_gambar: string
        }
        Insert: {
          deskripsi?: string | null
          dibuat_pada?: string
          diupload_oleh?: string | null
          id?: never
          judul: string
          public_id: string
          url_gambar: string
        }
        Update: {
          deskripsi?: string | null
          dibuat_pada?: string
          diupload_oleh?: string | null
          id?: never
          judul?: string
          public_id?: string
          url_gambar?: string
        }
        Relationships: []
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
      vektor_anopheles: {
        Row: {
          cuaca: string | null
          dibuat_pada: string
          fase_bulan: string | null
          id: number
          input_oleh: string | null
          jml_jam_tangkap: number | null
          jml_nyamuk: number | null
          jumlah_cidukan: number | null
          jumlah_jenis_larva: number | null
          jumlah_larva: number | null
          keadaan_tempat_perindukan: string | null
          kelembapan_pct: number | null
          kode_wilker: string
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
          input_oleh?: string | null
          jml_jam_tangkap?: number | null
          jml_nyamuk?: number | null
          jumlah_cidukan?: number | null
          jumlah_jenis_larva?: number | null
          jumlah_larva?: number | null
          keadaan_tempat_perindukan?: string | null
          kelembapan_pct?: number | null
          kode_wilker: string
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
          input_oleh?: string | null
          jml_jam_tangkap?: number | null
          jml_nyamuk?: number | null
          jumlah_cidukan?: number | null
          jumlah_jenis_larva?: number | null
          jumlah_larva?: number | null
          keadaan_tempat_perindukan?: string | null
          kelembapan_pct?: number | null
          kode_wilker?: string
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
      view_vektor_anopheles_mingguan: {
        Row: {
          jml_survei: number | null
          kelembapan_rerata: number | null
          kode_wilker: string | null
          mbr_rerata: number | null
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
      view_vektor_diare_mingguan: {
        Row: {
          fly_index_rerata: number | null
          jenis_kegiatan: string | null
          jml_memenuhi_syarat: number | null
          jml_pengamatan: number | null
          kepadatan_kecoa_rerata: number | null
          kode_wilker: string | null
          minggu_epid: number | null
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
      view_vektor_tikus_mingguan: {
        Row: {
          index_pinjal_rerata: number | null
          jml_survei: number | null
          kode_wilker: string | null
          minggu_epid: number | null
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
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      mmwr_week: {
        Args: { d: string }
        Returns: {
          minggu_epid: number
          tahun_epid: number
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
