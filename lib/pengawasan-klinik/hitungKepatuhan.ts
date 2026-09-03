// lib/pengawasan-klinik/hitungKepatuhan.ts

type ItemKepatuhan = {
  key: string;
  label: string;
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
    { key: 'sio_ada', label: 'Surat Ijin Operasional', nilai: data.sio_ada, kategori: 'Administrasi', kritikal: true },
    { key: 'ada_vaksinator_bersertifikat', label: 'Dokter/Perawat bersertifikat vaksinator', nilai: data.ada_vaksinator_bersertifikat, kategori: 'Administrasi', kritikal: true },
    { key: 'sop_pelayanan_vaksinasi', label: 'SOP Pelayanan Vaksinasi Internasional', nilai: data.sop_pelayanan_vaksinasi, kategori: 'Administrasi', kritikal: true },
    { key: 'sop_syok_anafilaktik', label: 'SOP/Algoritma Syok Anafilaktik', nilai: data.sop_syok_anafilaktik, kategori: 'Administrasi', kritikal: true },
    { key: 'mou_limbah_ada', label: 'Kerjasama Pengelolaan Limbah Medis', nilai: data.mou_limbah_ada, kategori: 'Administrasi', kritikal: true },
    { key: 'mou_limbah_berlaku', label: 'MOU Limbah Medis masih berlaku', nilai: data.mou_limbah_berlaku, kategori: 'Administrasi', kritikal: true },
    { key: 'papan_nama_vaksinasi', label: 'Papan Nama Layanan Vaksinasi', nilai: data.papan_nama_vaksinasi, kategori: 'Administrasi', kritikal: false },
    { key: 'papan_nama_ruangan_vaksinasi', label: 'Papan Nama Ruangan Vaksinasi', nilai: data.papan_nama_ruangan_vaksinasi, kategori: 'Administrasi', kritikal: false },
    { key: 'alur_pelayanan_terpasang', label: 'Alur Pelayanan Terpasang', nilai: data.alur_pelayanan_terpasang, kategori: 'Administrasi', kritikal: false },

    { key: 'pendaftaran_komputer_jaringan', label: 'Pendaftaran dengan komputer & jaringan', nilai: data.pendaftaran_komputer_jaringan, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_tunggu_terpisah', label: 'Ruang tunggu vaksinasi terpisah', nilai: data.ruang_tunggu_terpisah, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_periksa_screening', label: 'Ruang periksa/screening', nilai: data.ruang_periksa_screening, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_vaksinasi', label: 'Ruang vaksinasi internasional', nilai: data.ruang_vaksinasi, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_tindakan', label: 'Ruang tindakan', nilai: data.ruang_tindakan, kategori: 'Sarana', kritikal: false },
    { key: 'apotek_cold_chain_room', label: 'Ruang penyimpanan cold chain', nilai: data.apotek_cold_chain_room, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_laboratorium', label: 'Ruang laboratorium', nilai: data.ruang_laboratorium, kategori: 'Sarana', kritikal: false },
    { key: 'ruang_administrasi_komputer', label: 'Ruang administrasi + internet', nilai: data.ruang_administrasi_komputer, kategori: 'Sarana', kritikal: false },
    { key: 'toilet_urin', label: 'Toilet khusus urin', nilai: data.toilet_urin, kategori: 'Sarana', kritikal: false },

    { key: 'vaccine_refrigerator_freezer', label: 'Vaccine refrigerator/freezer', nilai: data.vaccine_refrigerator_freezer, kategori: 'Peralatan', kritikal: true },
    { key: 'anafilaktik_kit', label: 'Shock anafilaktik kit', nilai: data.anafilaktik_kit, kategori: 'Peralatan', kritikal: true },
    { key: 'vaccine_carrier', label: 'Vaccine carrier kondisi baik', nilai: data.vaccine_carrier, kategori: 'Peralatan', kritikal: false },
    { key: 'avr', label: 'Automatic voltage stabilizer', nilai: data.avr, kategori: 'Peralatan', kritikal: false },
    { key: 'genset', label: 'Standby generator', nilai: data.genset, kategori: 'Peralatan', kritikal: false },
    { key: 'safety_box', label: 'Safety box', nilai: data.safety_box, kategori: 'Peralatan', kritikal: false },
    { key: 'pengelolaan_limbah_medis', label: 'Pengelolaan limbah medis', nilai: data.pengelolaan_limbah_medis, kategori: 'Peralatan', kritikal: false },
    { key: 'tempat_sampah_tertutup', label: 'Tempat sampah medis tertutup', nilai: data.tempat_sampah_tertutup, kategori: 'Peralatan', kritikal: false },
    { key: 'printer_passbook', label: 'Printer passbook', nilai: data.printer_passbook, kategori: 'Peralatan', kritikal: false },
  ];

  const adaAlatPemantauSuhu = data.termometer || data.freeze_tag || data.log_tag;
  items.push({
    key: 'alat_pemantau_suhu',
    label: 'Alat pemantau suhu (termometer/freeze tag/log tag)',
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
    itemBermasalah: [...kritikalGagal, ...pendukungGagal].map((i) => i.label),
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