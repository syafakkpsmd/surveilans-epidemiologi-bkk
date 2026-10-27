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
        judul: 'Penumpang Kapal',
        deskripsi: 'Catat kedatangan kapal, lalu lengkapi keberangkatan beberapa hari kemudian.',
        href: '/lalu-lintas-orang/input-penumpang-kapal',
        cara: ['form'],
      },
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
