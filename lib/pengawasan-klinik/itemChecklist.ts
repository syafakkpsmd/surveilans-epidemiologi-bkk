// lib/pengawasan-klinik/itemChecklist.ts
// Daftar item checklist pengawasan klinik — dipakai form input DAN halaman detail.

export type KategoriChecklist = 'Administrasi' | 'Sarana' | 'Peralatan';

export const ITEM_CHECKLIST: { key: string; label: string; kategori: KategoriChecklist }[] = [
  // Administrasi & Perizinan
  { key: 'papan_nama_vaksinasi', label: 'Papan Nama Layanan Vaksinasi', kategori: 'Administrasi' },
  { key: 'papan_nama_ruangan_vaksinasi', label: 'Papan Nama Ruangan Vaksinasi', kategori: 'Administrasi' },
  { key: 'ada_vaksinator_bersertifikat', label: 'Dokter/Perawat bersertifikat vaksinator', kategori: 'Administrasi' },
  { key: 'sio_ada', label: 'Surat Ijin Operasional (SIO) tersedia', kategori: 'Administrasi' },
  { key: 'mou_limbah_ada', label: 'Kerjasama Pengelolaan Limbah Medis', kategori: 'Administrasi' },
  { key: 'mou_limbah_berlaku', label: 'MOU Limbah Medis masih berlaku', kategori: 'Administrasi' },
  { key: 'sop_pelayanan_vaksinasi', label: 'SOP Pelayanan Vaksinasi Internasional', kategori: 'Administrasi' },
  { key: 'sop_syok_anafilaktik', label: 'SOP/Algoritma Syok Anafilaktik', kategori: 'Administrasi' },
  { key: 'alur_pelayanan_terpasang', label: 'Alur Pelayanan Terpasang', kategori: 'Administrasi' },

  // Sarana & Prasarana
  { key: 'pendaftaran_komputer_jaringan', label: 'Pendaftaran dengan komputer & jaringan', kategori: 'Sarana' },
  { key: 'ruang_tunggu_terpisah', label: 'Ruang tunggu vaksinasi terpisah', kategori: 'Sarana' },
  { key: 'ruang_periksa_screening', label: 'Ruang periksa/screening', kategori: 'Sarana' },
  { key: 'ruang_vaksinasi', label: 'Ruang vaksinasi internasional', kategori: 'Sarana' },
  { key: 'ruang_tindakan', label: 'Ruang tindakan', kategori: 'Sarana' },
  { key: 'apotek_cold_chain_room', label: 'Ruang penyimpanan cold chain', kategori: 'Sarana' },
  { key: 'ruang_laboratorium', label: 'Ruang laboratorium', kategori: 'Sarana' },
  { key: 'ruang_administrasi_komputer', label: 'Ruang administrasi + internet', kategori: 'Sarana' },
  { key: 'toilet_urin', label: 'Toilet khusus urin', kategori: 'Sarana' },

  // Peralatan & Cold Chain
  { key: 'vaccine_refrigerator_freezer', label: 'Vaccine refrigerator/freezer', kategori: 'Peralatan' },
  { key: 'vaccine_carrier', label: 'Vaccine carrier kondisi baik', kategori: 'Peralatan' },
  { key: 'termometer', label: 'Termometer pemantau suhu', kategori: 'Peralatan' },
  { key: 'freeze_tag', label: 'Freeze tag', kategori: 'Peralatan' },
  { key: 'log_tag', label: 'Log tag', kategori: 'Peralatan' },
  { key: 'avr', label: 'Automatic Voltage Regulator (AVR)', kategori: 'Peralatan' },
  { key: 'genset', label: 'Standby generator', kategori: 'Peralatan' },
  { key: 'anafilaktik_kit', label: 'Shock anafilaktik kit', kategori: 'Peralatan' },
  { key: 'pengelolaan_limbah_medis', label: 'Pengelolaan limbah medis', kategori: 'Peralatan' },
  { key: 'safety_box', label: 'Safety box', kategori: 'Peralatan' },
  { key: 'tempat_sampah_tertutup', label: 'Tempat sampah medis tertutup', kategori: 'Peralatan' },
  { key: 'printer_passbook', label: 'Printer passbook', kategori: 'Peralatan' },
];

export const DAFTAR_KATEGORI: KategoriChecklist[] = ['Administrasi', 'Sarana', 'Peralatan'];
