// lib/input-data/kategori.ts
// Daftar menu input per kategori untuk hub /dashboard/input-data.
// `cara` jujur menyatakan apa yang tersedia: hanya yang benar-benar punya unggah Excel/CSV yang diberi label itu.
// Menambah menu input baru cukup menambah satu entri di sini.

export type CaraInput = 'form' | 'excel' | 'csv';

export interface MenuInput {
  judul: string;
  deskripsi: string;
  href: string;
  cara: CaraInput[];
}

export interface KategoriInput {
  id: string;
  judul: string;
  menu: MenuInput[];
}

export const KATEGORI_INPUT: KategoriInput[] = [
  {
    id: 'alat-angkut',
    judul: 'Alat Angkut & Lalu Lintas Orang',
    menu: [
      {
        judul: 'Data Pesawat',
        deskripsi: 'Kegiatan pesawat di bandara: crew, penumpang datang/berangkat, dan sertifikat. Input satu per satu atau unggah Excel.',
        href: '/dashboard/input-data/pesawat',
        cara: ['form', 'excel'],
      },
      {
        judul: 'COP Kapal',
        deskripsi: 'Kedatangan kapal (Certificate of Pratique): unggah ekspor Sinkarkes atau input satu per satu, isi RBA dan faktor risiko, kelola master negara kedatangan.',
        href: '/dashboard/input-data/kapal?modul=cop',
        cara: ['form', 'excel'],
      },
      {
        judul: 'PHQC Kapal',
        deskripsi: 'Keberangkatan kapal (Port Health Quarantine Clearance): unggah ekspor Sinkarkes atau input satu per satu, isi RBA dan tujuan berlayar.',
        href: '/dashboard/input-data/kapal?modul=phqc',
        cara: ['form', 'excel'],
      },
      {
        judul: 'Penumpang Kapal',
        deskripsi: 'Catat kedatangan kapal, lalu lengkapi keberangkatan beberapa hari kemudian.',
        href: '/lalu-lintas-orang/input-penumpang-kapal',
        cara: ['form'],
      },
    ],
  },
  {
    id: 'sertifikat',
    judul: 'Sertifikat & Dokumen Kapal',
    menu: [
      { judul: 'SSCEC', deskripsi: 'Sertifikat sanitasi kapal (SSCEC/SSCC): unggah ekspor Sinkarkes atau input satu per satu; daftar per wilayah kerja dan bulan.', href: '/dashboard/input-data/sertifikat?modul=sscec', cara: ['form', 'excel'] },
      { judul: 'P3K Kapal', deskripsi: 'Sertifikat pengawasan P3K kapal.', href: '/dashboard/input-data/sertifikat?modul=p3k', cara: ['form', 'excel'] },
      { judul: 'Sertifikat Air', deskripsi: 'Sertifikat hasil pemeriksaan sampel air bersih/air minum.', href: '/dashboard/input-data/sertifikat?modul=air', cara: ['form', 'excel'] },
      { judul: 'Buku Kesehatan', deskripsi: 'Penerbitan buku kesehatan kapal (e-Healthbook).', href: '/dashboard/input-data/sertifikat?modul=buku_kesehatan', cara: ['form', 'excel'] },
    ],
  },
  {
    id: 'penyakit',
    judul: 'Surveilans Penyakit',
    menu: [
      {
        judul: 'PIE Global',
        deskripsi: 'Penyakit infeksi emerging global: input manual atau unggah CSV.',
        href: '/dashboard/global-emerging/input',
        cara: ['form', 'csv'],
      },
    ],
  },
  {
    id: 'posko',
    judul: 'Posko Matra',
    menu: [
      { judul: 'Posko Nataru', deskripsi: 'Data harian posko Natal dan Tahun Baru.', href: '/dashboard/posko/nataru/input', cara: ['form'] },
      { judul: 'Posko Idul Fitri', deskripsi: 'Data harian posko Idul Fitri.', href: '/dashboard/posko/idul-fitri/input', cara: ['form'] },
    ],
  },
  {
    id: 'klinik',
    judul: 'Klinik Binaan',
    menu: [
      { judul: 'Pengawasan Klinik', deskripsi: 'Tambah hasil pengawasan klinik binaan.', href: '/dashboard/pengawasan-klinik/tambah', cara: ['form'] },
    ],
  },
  {
    id: 'informasi',
    judul: 'Media Informasi',
    menu: [
      { judul: 'Peta Wilayah Kerja', deskripsi: 'Kelola fasilitas pada peta.', href: '/dashboard/peta/kelola', cara: ['form'] },
    ],
  },
];
