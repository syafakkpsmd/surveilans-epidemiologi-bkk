// lib/klinik/agregasiStok.ts

export type BarisStok = Record<string, string | number | null>;

const KUNCI_SISA = ['Sisa Stok (Pelayanan)', 'Sisa Stok', 'Sisa'];
const KUNCI_TERBIT = ['Vaksin Terbit', 'Terbit'];
const KUNCI_RUSAK = ['Vaksin Rusak', 'Rusak'];

// Cari nilai angka dengan variasi nama kolom yang mungkin (tahan perbedaan header antar tab)
function cariAngka(row: BarisStok, kandidat: string[]): number {
  for (const k of kandidat) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== '') {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase();
    if (kandidat.some((k) => lower.includes(k.toLowerCase()))) {
      const n = Number(row[key]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

export const ambilSisaStok = (row: BarisStok) => cariAngka(row, KUNCI_SISA);
export const ambilTerbit = (row: BarisStok) => cariAngka(row, KUNCI_TERBIT);
export const ambilRusak = (row: BarisStok) => cariAngka(row, KUNCI_RUSAK);

export type StatusStok = 'kritis' | 'waspada' | 'aman';

export type RingkasanStokKlinik = {
  namaKlinik: string;
  jenisStok: string;
  sisaStokTerkini: number;
  rataRataPemakaianHarian: number;
  estimasiHariHabis: number | null;
  totalTerbit: number;
  totalRusak: number;
  tingkatKerusakanPersen: number;
  status: StatusStok;
};

export const AMBANG_STOK_TETAP_DEFAULT = 10;
export const AMBANG_HARI_DEFAULT = 7;

export function hitungRingkasanKlinik(
  namaKlinik: string,
  jenisStok: string,
  barisTerurutTerbaruDulu: BarisStok[],
  ambangTetap = AMBANG_STOK_TETAP_DEFAULT,
  ambangHari = AMBANG_HARI_DEFAULT
): RingkasanStokKlinik {
  const sisaTerkini = barisTerurutTerbaruDulu.length > 0 ? ambilSisaStok(barisTerurutTerbaruDulu[0]) : 0;

  const totalTerbit = barisTerurutTerbaruDulu.reduce((a, r) => a + ambilTerbit(r), 0);
  const totalRusak = barisTerurutTerbaruDulu.reduce((a, r) => a + ambilRusak(r), 0);
  const jumlahHariData = barisTerurutTerbaruDulu.length || 1;
  const rataRataHarian = totalTerbit / jumlahHariData;

  const estimasiHari = rataRataHarian > 0 ? Math.floor(sisaTerkini / rataRataHarian) : null;
  const tingkatRusak = totalTerbit + totalRusak > 0 ? (totalRusak / (totalTerbit + totalRusak)) * 100 : 0;

  return {
    namaKlinik,
    jenisStok,
    sisaStokTerkini: sisaTerkini,
    rataRataPemakaianHarian: Math.round(rataRataHarian * 10) / 10,
    estimasiHariHabis: estimasiHari,
    totalTerbit,
    totalRusak,
    tingkatKerusakanPersen: Math.round(tingkatRusak * 10) / 10,
    status: hitungStatus(sisaTerkini, estimasiHari, ambangTetap, ambangHari),
  };
}

export function hitungStatus(
  sisaTerkini: number,
  estimasiHari: number | null,
  ambangTetap: number,
  ambangHari: number
): StatusStok {
  const kritis = sisaTerkini <= ambangTetap || (estimasiHari !== null && estimasiHari <= ambangHari);
  const waspada = sisaTerkini <= ambangTetap * 1.5 || (estimasiHari !== null && estimasiHari <= ambangHari * 1.5);
  if (kritis) return 'kritis';
  if (waspada) return 'waspada';
  return 'aman';
}

export const JENIS_STOK_LABEL: Record<string, string> = {
  'e-icv': 'e-ICV',
  icv: 'ICV',
  mm: 'Meningitis (MM)',
  yf: 'Yellow Fever',
  polio: 'Polio',
  flu: 'Influenza',
};

// e-ICV & ICV adalah dokumen sertifikat (buku/kartu), bukan vaksin fisik - satuannya beda
export const JENIS_STOK_SATUAN: Record<string, string> = {
  'e-icv': 'Buku',
  icv: 'Buku',
  mm: 'Vial',
  yf: 'Vial',
  polio: 'Vial',
  flu: 'Vial',
};

export function ambilSatuan(jenisStok: string): string {
  return JENIS_STOK_SATUAN[jenisStok] ?? 'unit';
}