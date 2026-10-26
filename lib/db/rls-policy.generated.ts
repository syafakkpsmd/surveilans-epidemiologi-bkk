// DIBANGKITKAN oleh scripts/migrate/buat-rls.mjs dari schema-dump/supabase_schema.json. JANGAN diedit manual.
// Setiap entri = policy RLS Supabase (permissive, digabung dengan OR). 'untuk' = role Postgres yang dikenai policy:
// 'anon' (belum login), 'authenticated' (sudah login) atau 'public' (keduanya).
export type AturanRls =
  | { untuk: string[]; t: 'semua' | 'login' | 'admin' | 'diri' | 'diri_atau_admin' | 'tolak' }
  | { untuk: string[]; t: 'role'; roles: string[] };
export type PerintahRls = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
export const POLICY_RLS: Record<string, Partial<Record<PerintahRls, AturanRls[]>>> =
{
  buletin: {
    SELECT: [
      { untuk: [ 'authenticated' ], t: 'semua' },
      { untuk: [ 'public' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    DELETE: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ]
  },
  fasilitas_foto: {
    SELECT: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin' ] },
      { untuk: [ 'public' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin' ] }
    ],
    UPDATE: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin' ] }
    ],
    DELETE: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin' ] }
    ]
  },
  fasilitas_pelabuhan: {
    SELECT: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin' ] },
      { untuk: [ 'public' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin' ] }
    ],
    UPDATE: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin' ] }
    ],
    DELETE: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin' ] }
    ]
  },
  foto_kegiatan: {
    DELETE: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'public' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  hiv_data: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  hotspot_nasa_kaltim: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  ispa_harian: {
    INSERT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ],
    DELETE: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ],
    UPDATE: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ]
  },
  ispu_stasiun_harian: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' },
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  jenis_kegiatan_foto: {
    SELECT: [
      { untuk: [ 'public' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'public' ], t: 'login' }
    ],
    UPDATE: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  kegiatan_cop: {
    INSERT: [
      { untuk: [ 'anon' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'anon' ], t: 'semua' },
      { untuk: [ 'public' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'anon' ], t: 'semua' }
    ]
  },
  kegiatan_pesawat: {
    INSERT: [
      { untuk: [ 'public' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'public' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  kegiatan_phqc: {
    INSERT: [
      { untuk: [ 'anon' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'anon' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  klinik_binaan: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  kualitas_udara_harian: {
    INSERT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ],
    DELETE: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ],
    UPDATE: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ]
  },
  kunjungan_tamu: {
    INSERT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  laporan_penyakit_emerging: {
    INSERT: [
      { untuk: [ 'anon' ], t: 'semua' },
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'petugas', 'admin' ] }
    ],
    UPDATE: [
      { untuk: [ 'anon' ], t: 'semua' },
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'petugas', 'admin' ] }
    ],
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  laporan_penyakit_nasional: {
    INSERT: [
      { untuk: [ 'public' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'public' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  lokasi_kualitas_udara: {
    DELETE: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  malaria_migrasi: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  pab: {
    INSERT: [
      { untuk: [ 'anon' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  pengawasan_klinik: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'anon' ], t: 'semua' }
    ]
  },
  pengawasan_klinik_dokumen: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' },
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'anon' ], t: 'semua' },
      { untuk: [ 'authenticated' ], t: 'semua' }
    ]
  },
  peraturan: {
    SELECT: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin', 'petugas' ] },
      { untuk: [ 'public' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'public' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ],
    DELETE: [
      { untuk: [ 'public' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ]
  },
  profiles: {
    INSERT: [
      { untuk: [ 'public' ], t: 'diri' }
    ],
    SELECT: [
      { untuk: [ 'public' ], t: 'diri_atau_admin' },
      { untuk: [ 'authenticated' ], t: 'diri' }
    ],
    UPDATE: [
      { untuk: [ 'public' ], t: 'admin' },
      { untuk: [ 'public' ], t: 'diri' }
    ]
  },
  rat_guard: {
    INSERT: [
      { untuk: [ 'anon' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  referensi_parameter_penyakit: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  referensi_populasi_wilker: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' },
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ],
    INSERT: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ],
    UPDATE: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ],
    DELETE: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ]
  },
  riwayat_analisis_ai: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' },
      { untuk: [ 'authenticated' ], t: 'semua' },
      { untuk: [ 'anon' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ]
  },
  simulasi_wabah_kapal: {
    INSERT: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ],
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ]
  },
  simulasi_wabah_pesawat: {
    INSERT: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ],
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'authenticated' ], t: 'role', roles: [ 'admin', 'petugas' ] }
    ]
  },
  skdr_jenis_penyakit: {
    SELECT: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  skdr_mingguan: {
    INSERT: [
      { untuk: [ 'public' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'public' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  statistik_kunjungan: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' },
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' },
      { untuk: [ 'public' ], t: 'admin' }
    ],
    INSERT: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  tb_data: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  tpp: {
    INSERT: [
      { untuk: [ 'anon' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  ttu: {
    INSERT: [
      { untuk: [ 'anon' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'public' ], t: 'semua' }
    ]
  },
  vektor_anopheles: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  vektor_dbd: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  vektor_diare: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  vektor_tikus: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  wilayah_ispa: {
    DELETE: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    INSERT: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    UPDATE: [
      { untuk: [ 'authenticated' ], t: 'semua' }
    ],
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  wilker_nama_alias: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  },
  wilker_ref: {
    SELECT: [
      { untuk: [ 'anon', 'authenticated' ], t: 'semua' }
    ]
  }
};
