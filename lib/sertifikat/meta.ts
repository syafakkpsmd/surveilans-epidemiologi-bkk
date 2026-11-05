export type JenisSertifikat = 'sscec' | 'p3k' | 'buku' | 'air';

export interface MetaSertifikat {
  nama: string;
  judul: string;
  ikon: string;
  adaGt: boolean;
  labelNama: string;
  labelNomor: string;
  adaBerlaku: boolean;
}

export const META_SERTIFIKAT: Record<JenisSertifikat, MetaSertifikat> = {
  sscec: { nama: 'SSCEC', judul: 'Ship Sanitation Control Exemption Certificate', ikon: '📄', adaGt: true, labelNama: 'Nama kapal', labelNomor: 'No. barcode', adaBerlaku: false },
  p3k: { nama: 'P3K Kapal', judul: 'Sertifikat Obat dan P3K Kapal', ikon: '🩹', adaGt: true, labelNama: 'Nama kapal', labelNomor: 'QR code', adaBerlaku: false },
  buku: { nama: 'Buku Kesehatan', judul: 'Buku Kesehatan Kapal (Health Book)', ikon: '📘', adaGt: true, labelNama: 'Nama kapal', labelNomor: 'QR code', adaBerlaku: false },
  air: { nama: 'Sertifikat Air', judul: 'Sertifikat Pemeriksaan Sampel Air', ikon: '💧', adaGt: false, labelNama: 'Perusahaan', labelNomor: 'Sample ID', adaBerlaku: true },
};

export const DAFTAR_JENIS = Object.keys(META_SERTIFIKAT) as JenisSertifikat[];