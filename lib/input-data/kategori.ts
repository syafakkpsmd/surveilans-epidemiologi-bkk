// lib/input-data/kategori.ts
import { NAMA_BKK_SINGKAT } from '@/lib/konfigurasi/instansi';
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
        href: '/dashboard/input-data/kapal/cop',
        cara: ['form', 'excel'],
      },
      {
        judul: 'PHQC Kapal',
        deskripsi: 'Keberangkatan kapal (Port Health Quarantine Clearance): unggah ekspor Sinkarkes atau input satu per satu, isi RBA dan tujuan berlayar.',
        href: '/dashboard/input-data/kapal/phqc',
        cara: ['form', 'excel'],
      },
      {
        judul: 'Pengawasan Rat Guard',
        deskripsi: 'Pengawasan Kapal di Pelabuhan yang memasang Rat Guard: input satu per satu atau unggah Excel.',
        href: '/dashboard/alat-angkut/rat-guard/input',
        cara: ['form', 'excel'],
      },
    ],
  },
  {
    id: 'Lingkungan & Vektor',
    judul: 'Faktor Risiko Lingkungan & Vektor',
    menu: [
      { judul: 'Pengawasan Vektor DBD', deskripsi: 'Hasil pengawasan vektor DBD: input satu per satu atau unggah Excel.', href: '/dashboard/vektor-dbd/input', cara: ['form', 'excel'] },
      { judul: 'Pengawasan Vektor Malaria', deskripsi: 'Hasil pengawasan vektor malaria: input satu per satu atau unggah Excel.', href: '/dashboard/data/vektor/anopheles', cara: ['form', 'excel'] },
      { judul: 'Pengawasan Tempat-tempat Umum', deskripsi: 'Hasil pengawasan tempat-tempat umum: input satu per satu atau unggah Excel.', href: '/dashboard/ttu/input', cara: ['form', 'excel'] },
      { judul: 'Pengawasan Sarana Air Bersih', deskripsi: 'Hasil pengawasan sarana air bersih: input satu per satu atau unggah Excel.', href: '/dashboard/pab/input', cara: ['form', 'excel'] },
      { judul: 'Pengawasan Tempat Pengolahan Pangan', deskripsi: 'Hasil pengawasan tempat pengolahan pangan: input satu per satu atau unggah Excel.', href: '/dashboard/tpp/input', cara: ['form', 'excel'] },
      { judul: 'Pengawasan Limbah B3', deskripsi: 'Hasil pengawasan sarana limbah B3: input satu per satu atau unggah Excel.', href: '/dashboard/limbah-b3/input', cara: ['form', 'excel'] },
      { judul: 'Pengawasan Udara Ruang', deskripsi: 'Hasil pengawasan Udara Ruang: input satu per satu atau unggah Excel.', href: '/dashboard/udara-ruang/input', cara: ['form', 'excel'] },
      { judul: 'Pengawasan Media Tanah', deskripsi: 'Hasil pengawasan Media Tanah: input satu per satu atau unggah Excel.', href: '/dashboard/media-tanah/input', cara: ['form', 'excel'] },
    ],
  },
  {
    id: 'sertifikat',
    judul: 'Sertifikat & Dokumen Kapal',
    menu: [
      { judul: 'SSCEC', deskripsi: 'Sertifikat sanitasi kapal (SSCEC/SSCC): unggah ekspor Sinkarkes atau input satu per satu; daftar per wilayah kerja dan bulan.', href: '/dashboard/input-data/sertifikat/sscec', cara: ['form', 'excel'] },
      { judul: 'P3K Kapal', deskripsi: 'Sertifikat pengawasan P3K kapal.', href: '/dashboard/input-data/sertifikat/p3k', cara: ['form', 'excel'] },
      { judul: 'Sertifikat Air', deskripsi: 'Sertifikat hasil pemeriksaan sampel air bersih/air minum.', href: '/dashboard/input-data/sertifikat/air', cara: ['form', 'excel'] },
      { judul: 'Buku Kesehatan', deskripsi: 'Penerbitan buku kesehatan kapal (e-Healthbook).', href: '/dashboard/input-data/sertifikat/buku_kesehatan', cara: ['form', 'excel'] },
      { judul: 'SKLT (Laik Terbang)', deskripsi: 'Surat Keterangan Laik Terbang (SKLT): unggah ekspor Sinkarkes atau input satu per satu; daftar per wilayah kerja dan bulan.', href: '/dashboard/input-data/sklt', cara: ['form', 'excel'] },
      { judul: 'KIER Kesehatan', deskripsi: 'Sertifikat pengujian kesehatan kapal.', href: '/dashboard/input-data/kier', cara: ['form', 'excel'] },
      { judul: 'Izin Jenazah', deskripsi: 'Izin pengangkutan jenazah: unggah ekspor Sinkarkes atau input satu per satu.', href: '/dashboard/input-data/izin-jenazah', cara: ['form', 'excel'] },
      { judul: 'Omkaba', deskripsi: 'Lalu lintas OMKABA (Orang, Barang, Kapal, dan Alat Angkut): unggah ekspor Sinkarkes atau input satu per satu.', href: '/dashboard/input-data/omkaba', cara: ['form', 'excel'] },
    ],
  },
  {
    id: 'Lalu Lintas Orang',
    judul: 'Pengawasan Lalu Lintas Orang & Kesehatan Perjalanan',
    menu: [
      {
        judul: 'PIE Global',
        deskripsi: 'Penyakit infeksi emerging global: input manual atau unggah CSV.',
        href: '/dashboard/global-emerging/input',
        cara: ['form', 'csv'],
      },
      { judul: 'HIV (VCT)', deskripsi: 'Kunjungan layanan konseling dan tes HIV: input satu per satu atau unggah Excel (berbagai model tanggal).', href: '/dashboard/input-data/penyakit/hiv', cara: ['form', 'excel'] },
      { judul: 'TB (Skrining)', deskripsi: 'Skrining dan diagnosis TB: input satu per satu atau unggah Excel (berbagai model tanggal).', href: '/dashboard/input-data/penyakit/tb', cara: ['form', 'excel'] },
      { judul: 'Migrasi Malaria', deskripsi: 'Survei migrasi malaria pada penumpang kapal dan pesawat: input satu per satu atau unggah Excel.', href: '/dashboard/input-data/penyakit/migrasi_malaria', cara: ['form', 'excel'] },
      { judul: 'Ispa pada Karhutla', deskripsi: 'Survei ISPA pada penumpang kapal dan pesawat: input satu per satu atau unggah Excel.', href: '/dashboard/form/ispa-harian', cara: ['form', 'excel'] },
      { judul: 'Penumpang Kapal', deskripsi: 'Catat kedatangan kapal, lalu lengkapi keberangkatan beberapa hari kemudian.', href: '/lalu-lintas-orang/input-penumpang-kapal', cara: ['form'] },
      { judul: 'SIAOS (Izin Angkut Orang Sakit)', deskripsi: 'Izin lalu lintas orang sakit: unggah ekspor Sinkarkes apa adanya (tanpa diedit, tanggal model apa pun) atau input satu per satu.', href: '/dashboard/input-data/siaos', cara: ['form', 'excel'] },
      { judul: 'Poliklinik  BKK', deskripsi: 'Layanan poliklinik BKK: input satu per satu atau unggah Excel (berbagai model tanggal).', href: '/dashboard/poliklinik/input', cara: ['form', 'excel'] },
      { judul: 'Poliklinik Mitra', deskripsi: 'Layanan poliklinik di Wilayah Kerja BKK: input satu per satu atau unggah Excel (berbagai model tanggal).', href: '/dashboard/poliklinik-non-bkk', cara: ['form', 'excel'] },
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
      { judul: 'Layanan Vaksinasi BKK', deskripsi: `Tambah hasil layanan vaksinasi ${NAMA_BKK_SINGKAT}.`, href: '/dashboard/klinik/input', cara: ['form', 'excel'] },
      { judul: 'Layanan Vaksinasi Klinik Mitra', deskripsi: 'Tambah hasil layanan vaksinasi klinik mitra.', href: 'https://surveilans.bkksamarinda.or.id/login', cara: ['form', 'excel'] },
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
