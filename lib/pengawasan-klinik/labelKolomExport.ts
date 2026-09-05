// lib/pengawasan-klinik/labelKolomExport.ts

export const KOLOM_EXPORT: { key: string; label: string; tipe: 'text' | 'bool' | 'date' | 'time' | 'number' }[] = [
  { key: 'nama_klinik', label: 'Nama Klinik', tipe: 'text' },
  { key: 'jenis_fasilitas', label: 'Jenis Fasilitas', tipe: 'text' },
  { key: 'kabupaten_kota', label: 'Kabupaten/Kota', tipe: 'text' },
  { key: 'tanggal_kegiatan', label: 'Tanggal Kegiatan', tipe: 'date' },
  { key: 'waktu_mulai_layanan', label: 'Waktu Mulai Layanan', tipe: 'time' },
  { key: 'waktu_tutup_layanan', label: 'Waktu Tutup Layanan', tipe: 'time' },

  // Administrasi & Perizinan
  { key: 'papan_nama_vaksinasi', label: 'Papan Nama Layanan Vaksinasi', tipe: 'bool' },
  { key: 'papan_nama_ruangan_vaksinasi', label: 'Papan Nama Ruangan Vaksinasi', tipe: 'bool' },
  { key: 'ada_vaksinator_bersertifikat', label: 'Dokter/Perawat Bersertifikat Vaksinator', tipe: 'bool' },
  { key: 'jumlah_vaksinator', label: 'Jumlah Vaksinator', tipe: 'number' },
  { key: 'nomor_sip_dokter', label: 'Nomor SIP Dokter', tipe: 'text' },
  { key: 'nomor_sip_perawat', label: 'Nomor SIP Perawat', tipe: 'text' },
  { key: 'nomor_sip_pj', label: 'Nomor SIP Penanggung Jawab', tipe: 'text' },
  { key: 'sio_ada', label: 'SIO Tersedia', tipe: 'bool' },
  { key: 'nomor_sio', label: 'Nomor SIO', tipe: 'text' },
  { key: 'sio_berlaku_sampai', label: 'SIO Berlaku Sampai', tipe: 'date' },
  { key: 'mou_limbah_ada', label: 'Kerjasama Pengelolaan Limbah Medis', tipe: 'bool' },
  { key: 'mou_limbah_berlaku', label: 'MOU Limbah Medis Masih Berlaku', tipe: 'bool' },
  { key: 'sop_pelayanan_vaksinasi', label: 'SOP Pelayanan Vaksinasi Internasional', tipe: 'bool' },
  { key: 'sop_syok_anafilaktik', label: 'SOP/Algoritma Syok Anafilaktik', tipe: 'bool' },
  { key: 'alur_pelayanan_terpasang', label: 'Alur Pelayanan Terpasang', tipe: 'bool' },

  // Sarana & Prasarana
  { key: 'pendaftaran_komputer_jaringan', label: 'Pendaftaran Komputer & Jaringan', tipe: 'bool' },
  { key: 'ruang_tunggu_terpisah', label: 'Ruang Tunggu Vaksinasi Terpisah', tipe: 'bool' },
  { key: 'ruang_periksa_screening', label: 'Ruang Periksa/Screening', tipe: 'bool' },
  { key: 'ruang_vaksinasi', label: 'Ruang Vaksinasi Internasional', tipe: 'bool' },
  { key: 'ruang_tindakan', label: 'Ruang Tindakan', tipe: 'bool' },
  { key: 'apotek_cold_chain_room', label: 'Ruang Penyimpanan Cold Chain', tipe: 'bool' },
  { key: 'ruang_laboratorium', label: 'Ruang Laboratorium', tipe: 'bool' },
  { key: 'ruang_administrasi_komputer', label: 'Ruang Administrasi + Internet', tipe: 'bool' },
  { key: 'toilet_urin', label: 'Toilet Khusus Urin', tipe: 'bool' },

  // Peralatan & Cold Chain
  { key: 'vaccine_refrigerator_freezer', label: 'Vaccine Refrigerator/Freezer', tipe: 'bool' },
  { key: 'vaccine_carrier', label: 'Vaccine Carrier Kondisi Baik', tipe: 'bool' },
  { key: 'jenis_pendingin_carrier', label: 'Jenis Pendingin Carrier', tipe: 'text' },
  { key: 'termometer', label: 'Termometer', tipe: 'bool' },
  { key: 'freeze_tag', label: 'Freeze Tag', tipe: 'bool' },
  { key: 'log_tag', label: 'Log Tag', tipe: 'bool' },
  { key: 'form_pencatatan_suhu_manual', label: 'Form Pencatatan Suhu Manual', tipe: 'bool' },
  { key: 'alarm_suhu', label: 'Alarm Suhu', tipe: 'bool' },
  { key: 'avr', label: 'Automatic Voltage Regulator', tipe: 'bool' },
  { key: 'genset', label: 'Standby Generator', tipe: 'bool' },
  { key: 'anafilaktik_kit', label: 'Shock Anafilaktik Kit', tipe: 'bool' },
  { key: 'pengelolaan_limbah_medis', label: 'Pengelolaan Limbah Medis', tipe: 'bool' },
  { key: 'safety_box', label: 'Safety Box', tipe: 'bool' },
  { key: 'tempat_sampah_medis', label: 'Tempat Sampah Medis', tipe: 'bool' },
  { key: 'tempat_sampah_tertutup', label: 'Tempat Sampah Medis Tertutup', tipe: 'bool' },
  { key: 'printer_passbook', label: 'Printer Passbook', tipe: 'bool' },

  // Petugas & Catatan
  { key: 'nama_petugas_1', label: 'Nama Petugas 1', tipe: 'text' },
  { key: 'nama_petugas_2', label: 'Nama Petugas 2', tipe: 'text' },
  { key: 'nama_petugas_3', label: 'Nama Petugas 3', tipe: 'text' },
  { key: 'nama_petugas_klinik', label: 'Nama Petugas Klinik', tipe: 'text' },
  { key: 'catatan', label: 'Catatan', tipe: 'text' },

  // Hasil Penilaian
  { key: 'persentase_kepatuhan', label: 'Persentase Kepatuhan (%)', tipe: 'number' },
  { key: 'status_kepatuhan', label: 'Status Kepatuhan', tipe: 'text' },
  { key: 'item_bermasalah_gabungan', label: 'Item Bermasalah', tipe: 'text' },
];

const LABEL_STATUS_EXPORT: Record<string, string> = {
  memenuhi_syarat: 'Memenuhi Syarat',
  perlu_perbaikan: 'Perlu Perbaikan',
  tidak_memenuhi_syarat: 'Tidak Memenuhi Syarat',
};

export function bangunBarisExcel(row: Record<string, any>): Record<string, string | number> {
  const hasil: Record<string, string | number> = {};

  for (const kolom of KOLOM_EXPORT) {
    let nilai = row[kolom.key];

    if (kolom.key === 'item_bermasalah_gabungan') {
      nilai = Array.isArray(row.item_bermasalah) ? row.item_bermasalah.join('; ') : '';
    }

    if (kolom.tipe === 'bool') {
      hasil[kolom.label] = nilai === true ? 'Ya' : nilai === false ? 'Tidak' : '-';
    } else if (kolom.tipe === 'date') {
      hasil[kolom.label] = nilai ? new Date(nilai).toLocaleDateString('id-ID') : '-';
    } else if (kolom.key === 'status_kepatuhan') {
      hasil[kolom.label] = nilai ? (LABEL_STATUS_EXPORT[nilai] ?? nilai) : '-';
    } else {
      hasil[kolom.label] = nilai ?? '-';
    }
  }

  return hasil;
}