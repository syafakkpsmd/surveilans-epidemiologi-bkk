// lib/pengawasan-klinik/hitungKepatuhan.ts

type ItemKepatuhan = {
  key: string;
  label: string; // dipakai di form checklist (frasa "kondisi baik/tersedia/terpasang")
  labelBermasalah: string; // dipakai di keterangan saat item GAGAL — harus berbunyi negatif
  nilai: boolean | null;
  kategori: 'Administrasi' | 'Sarana' | 'Peralatan';
  kritikal: boolean;
};

type HasilKepatuhan = {
  status: 'memenuhi_syarat' | 'perlu_perbaikan' | 'tidak_memenuhi_syarat';
  persentaseKepatuhan: number;
  itemBermasalah: string[];
  jumlahKritikalGagal: number;
  jumlahPendukungGagal: number;
};

type BreakdownKategori = {
  kategori: string;
  persentase: number;
};

function bangunDaftarItem(data: Record<string, boolean | null>): ItemKepatuhan[] {
  const items: ItemKepatuhan[] = [
    { key: 'sio_ada', label: 'Surat Ijin Operasional', labelBermasalah: 'Surat Ijin Operasional (SIO) tidak tersedia', nilai: data.sio_ada, kategori: 'Administrasi', kritikal: true },
    { key: 'ada_vaksinator_bersertifikat', label: 'Dokter/Perawat bersertifikat vaksinator', labelBermasalah: 'Tidak ada dokter/perawat bersertifikat vaksinator', nilai: data.ada_vaksinator_bersertifikat, kategori: 'Administrasi', kritikal: true },
    { key: 'sop_pelayanan_vaksinasi', label: 'SOP Pelayanan Vaksinasi Internasional', labelBermasalah: 'SOP Pelayanan Vaksinasi Internasional tidak tersedia', nilai: data.sop_pelayanan_vaksinasi, kategori: 'Administrasi', kritikal: true },
    { key: 'sop_syok_anafilaktik', label: 'SOP/Algoritma Syok Anafilaktik', labelBermasalah: 'SOP/Algoritma Syok Anafilaktik tidak tersedia', nilai: data.sop_syok_anafilaktik, kategori: 'Administrasi', kritikal: true },
    { key: 'mou_limbah_ada', label: 'Kerjasama Pengelolaan Limbah Medis', labelBermasalah: 'Belum ada kerjasama pengelolaan limbah medis', nilai: data.mou_limbah_ada, kategori: 'Administrasi', kritikal: true },
    { key: 'mou_limbah_berlaku', label: 'MOU Limbah Medis masih berlaku', labelBermasalah: 'MOU Limbah Medis sudah tidak berlaku', nilai: data.mou_limbah_berlaku, kategori: 'Administrasi', kritikal: true },
    { key: 'papan_nama_vaksinasi', label: 'Papan Nama Layanan Vaksinasi', labelBermasalah: 'Papan Nama Layanan Vaksinasi tidak tersedia', nilai: data.papan_nama_vaksinasi, kategori: 'Administrasi', kritikal: false },
    { key: 'papan_nama_ruangan_vaksinasi', label: 'Papan Nama Ruangan Vaksinasi', labelBermasalah: 'Papan Nama Ruangan Vaksinasi tidak tersedia', nilai: data.papan_nama_ruangan_vaksinasi, kategori: 'Administrasi', kritikal: false },
    { key: 'alur_pelayanan_terpasang', label: 'Alur Pelayanan Terpasang', labelBermasalah: 'Alur pelayanan tidak terpasang', nilai: data.alur_pelayanan_terpasang, kategori: 'Administrasi', kritikal: false },

    { key: 'pendaftaran_komputer_jaringan', label: 'Pendaftaran dengan komputer & jaringan', labelBermasalah: 'Pendaftaran belum menggunakan komputer & jaringan', nilai: data.pendaftaran_komputer_jaringan, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_tunggu_terpisah', label: 'Ruang tunggu vaksinasi terpisah', labelBermasalah: 'Ruang tunggu vaksinasi belum terpisah', nilai: data.ruang_tunggu_terpisah, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_periksa_screening', label: 'Ruang periksa/screening', labelBermasalah: 'Ruang periksa/screening tidak tersedia', nilai: data.ruang_periksa_screening, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_vaksinasi', label: 'Ruang vaksinasi internasional', labelBermasalah: 'Ruang vaksinasi internasional tidak tersedia', nilai: data.ruang_vaksinasi, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_tindakan', label: 'Ruang tindakan', labelBermasalah: 'Ruang tindakan tidak tersedia', nilai: data.ruang_tindakan, kategori: 'Sarana', kritikal: false },
    { key: 'apotek_cold_chain_room', label: 'Ruang penyimpanan cold chain', labelBermasalah: 'Ruang penyimpanan cold chain tidak tersedia', nilai: data.apotek_cold_chain_room, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_laboratorium', label: 'Ruang laboratorium', labelBermasalah: 'Ruang laboratorium tidak tersedia', nilai: data.ruang_laboratorium, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_administrasi_komputer', label: 'Ruang administrasi + internet', labelBermasalah: 'Ruang administrasi + internet tidak tersedia', nilai: data.ruang_administrasi_komputer, kategori: 'Sarana', kritikal: false },
    { key: 'toilet_urin', label: 'Toilet khusus urin', labelBermasalah: 'Toilet khusus urin tidak tersedia', nilai: data.toilet_urin, kategori: 'Sarana', kritikal: false },

    { key: 'vaccine_refrigerator_freezer', label: 'Vaccine refrigerator/freezer', labelBermasalah: 'Vaccine refrigerator/freezer tidak tersedia', nilai: data.vaccine_refrigerator_freezer, kategori: 'Peralatan', kritikal: true },
    { key: 'anafilaktik_kit', label: 'Shock anafilaktik kit', labelBermasalah: 'Shock anafilaktik kit tidak tersedia', nilai: data.anafilaktik_kit, kategori: 'Peralatan', kritikal: true },
    { key: 'vaccine_carrier', label: 'Vaccine carrier kondisi baik', labelBermasalah: 'Vaccine carrier dalam kondisi tidak baik', nilai: data.vaccine_carrier, kategori: 'Peralatan', kritikal: false },
    { key: 'avr', label: 'Automatic voltage stabilizer', labelBermasalah: 'Automatic voltage stabilizer (AVR) tidak tersedia', nilai: data.avr, kategori: 'Peralatan', kritikal: false },
    { key: 'genset', label: 'Standby generator', labelBermasalah: 'Standby generator tidak tersedia', nilai: data.genset, kategori: 'Peralatan', kritikal: false },
    { key: 'safety_box', label: 'Safety box', labelBermasalah: 'Safety box tidak tersedia', nilai: data.safety_box, kategori: 'Peralatan', kritikal: false },
    { key: 'pengelolaan_limbah_medis', label: 'Pengelolaan limbah medis', labelBermasalah: 'Pengelolaan limbah medis belum berjalan', nilai: data.pengelolaan_limbah_medis, kategori: 'Peralatan', kritikal: false },
    { key: 'tempat_sampah_tertutup', label: 'Tempat sampah medis tertutup', labelBermasalah: 'Tempat sampah medis tidak tertutup', nilai: data.tempat_sampah_tertutup, kategori: 'Peralatan', kritikal: false },
    { key: 'printer_passbook', label: 'Printer passbook', labelBermasalah: 'Printer passbook tidak tersedia', nilai: data.printer_passbook, kategori: 'Peralatan', kritikal: false },
  ];

  const adaAlatPemantauSuhu = data.termometer || data.freeze_tag || data.log_tag;
  items.push({
    key: 'alat_pemantau_suhu',
    label: 'Alat pemantau suhu (termometer/freeze tag/log tag)',
    labelBermasalah: 'Tidak ada alat pemantau suhu (termometer/freeze tag/log tag)',
    nilai: adaAlatPemantauSuhu ?? false,
    kategori: 'Peralatan',
    kritikal: true,
  });

  return items;
}

export function hitungStatusKepatuhan(data: Record<string, boolean | null>): HasilKepatuhan {
  const items = bangunDaftarItem(data);
  const kritikalGagal = items.filter((i) => i.kritikal && !i.nilai);
  const pendukungGagal = items.filter((i) => !i.kritikal && !i.nilai);
  const totalDinilai = items.length;
  const totalTerpenuhi = items.filter((i) => i.nilai).length;

  let status: HasilKepatuhan['status'];
  if (kritikalGagal.length > 0) {
    status = 'tidak_memenuhi_syarat';
  } else if (pendukungGagal.length > 0) {
    status = 'perlu_perbaikan';
  } else {
    status = 'memenuhi_syarat';
  }

  return {
    status,
    persentaseKepatuhan: Math.round((totalTerpenuhi / totalDinilai) * 1000) / 10,
    // PENTING: pakai labelBermasalah (frasa negatif), BUKAN label checklist ("kondisi
    // baik"/"terpasang"/"tersedia") — item ini ada di daftar justru karena GAGAL,
    // jadi keterangannya harus berbunyi negatif juga.
    itemBermasalah: [...kritikalGagal, ...pendukungGagal].map((i) => i.labelBermasalah),
    jumlahKritikalGagal: kritikalGagal.length,
    jumlahPendukungGagal: pendukungGagal.length,
  };
}

export function hitungBreakdownKategori(data: Record<string, boolean | null>): BreakdownKategori[] {
  const items = bangunDaftarItem(data);
  const kategoriList: ItemKepatuhan['kategori'][] = ['Administrasi', 'Sarana', 'Peralatan'];

  return kategoriList.map((kategori) => {
    const itemKategori = items.filter((i) => i.kategori === kategori);
    const terpenuhi = itemKategori.filter((i) => i.nilai).length;
    return {
      kategori,
      persentase: Math.round((terpenuhi / itemKategori.length) * 1000) / 10,
    };
  });
}