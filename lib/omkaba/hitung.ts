// lib/omkaba/hitung.ts
// Perhitungan dasbor OMKABA yang berjalan di BROWSER (data satu tahun dimuat sekali, semua filter dan grafik dihitung
// ulang seketika). MURNI: tanpa database, aman dipakai komponen 'use client'.
import { DAFTAR_DOKUMEN } from './dokumen';

export interface BarisOmkaba {
  id: string;
  no_dokumen: string;
  /** YYYY-MM-DD */
  tanggal: string;
  wilayah_kerja: string | null;
  jenis_layanan: string | null;
  nama_keagenan: string | null;
  nama_eksportir_importir: string | null;
  nama_buyer: string | null;
  jenis_komoditi: string | null;
  negara_tujuan: string | null;
  negara_asal: string | null;
  pelabuhan_tujuan: string | null;
  pelabuhan_asal: string | null;
  nama_kapal: string | null;
  no_voyage: string | null;
  health_certificate: string | null;
  petugas_pemeriksa: string | null;
  jumlah_bayar: number | null;
  /** kunci = nama kolom dok_*, nilai = "Ada" / "Tidak Ada" / null */
  dok: Record<string, string | null>;
}

export type BasisNegara = 'tujuan' | 'asal';
export type KunciSaring = 'layanan' | 'komoditi' | 'negara' | 'perusahaan' | 'kapal' | 'bulan' | 'cari';
export interface Saring {
  layanan?: string;
  komoditi?: string;
  negara?: string;
  perusahaan?: string;
  kapal?: string;
  bulan?: number;
  cari?: string;
}
export interface ItemPeringkat { nama: string; jumlah: number }

export const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Kunci pengelompokan: huruf besar, spasi beruntun jadi satu ("pt  abc " dan "PT ABC" dihitung satu). */
export const kunci = (t: string | null | undefined): string => (t ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

export const layananDari = (b: BarisOmkaba): 'Ekspor' | 'Impor' | 'Lainnya' => {
  const k = kunci(b.jenis_layanan);
  return k.startsWith('EKSPOR') || k.startsWith('EXPOR') ? 'Ekspor' : k.startsWith('IMPOR') || k.startsWith('IMPORT') ? 'Impor' : 'Lainnya';
};
export const perusahaanDari = (b: BarisOmkaba): string | null => b.nama_eksportir_importir?.trim() || b.nama_keagenan?.trim() || null;
export const negaraDari = (b: BarisOmkaba, basis: BasisNegara): string | null => (basis === 'tujuan' ? b.negara_tujuan : b.negara_asal);
export const bulanDari = (b: BarisOmkaba): number => Number(b.tanggal.slice(5, 7));

/** Health Certificate dianggap diterbitkan bila terisi dan tidak berbunyi "tidak ..." (mis. "Tidak Diterbitkan"). */
export const hcDiterbitkan = (b: BarisOmkaba): boolean => {
  const k = kunci(b.health_certificate);
  return k !== '' && k !== '-' && !k.startsWith('TIDAK');
};
const dokAda = (v: string | null | undefined): boolean | null => {
  const k = kunci(v);
  if (!k || k === '-') return null;
  return !k.startsWith('TIDAK');
};

export function terapkan(baris: BarisOmkaba[], f: Saring, basis: BasisNegara, kecuali?: KunciSaring): BarisOmkaba[] {
  const cari = kecuali === 'cari' ? '' : kunci(f.cari);
  return baris.filter((b) => {
    if (kecuali !== 'layanan' && f.layanan && layananDari(b) !== f.layanan) return false;
    if (kecuali !== 'komoditi' && f.komoditi && kunci(b.jenis_komoditi) !== kunci(f.komoditi)) return false;
    if (kecuali !== 'negara' && f.negara && kunci(negaraDari(b, basis)) !== kunci(f.negara)) return false;
    if (kecuali !== 'perusahaan' && f.perusahaan && kunci(perusahaanDari(b)) !== kunci(f.perusahaan)) return false;
    if (kecuali !== 'kapal' && f.kapal && kunci(b.nama_kapal) !== kunci(f.kapal)) return false;
    if (kecuali !== 'bulan' && f.bulan && bulanDari(b) !== f.bulan) return false;
    if (cari) {
      const gudang = kunci([b.no_dokumen, perusahaanDari(b), b.jenis_komoditi, b.negara_tujuan, b.negara_asal, b.pelabuhan_asal, b.pelabuhan_tujuan, b.nama_kapal, b.nama_buyer].join(' '));
      if (!gudang.includes(cari)) return false;
    }
    return true;
  });
}

export function peringkat(baris: BarisOmkaba[], ambil: (b: BarisOmkaba) => string | null, n = 8): ItemPeringkat[] {
  const peta = new Map<string, ItemPeringkat>();
  for (const b of baris) {
    const nama = ambil(b)?.trim();
    if (!nama || nama === '-' || nama === '--' || nama === '---') continue;
    const k = kunci(nama);
    const ada = peta.get(k);
    if (ada) ada.jumlah++; else peta.set(k, { nama, jumlah: 1 });
  }
  return [...peta.values()].sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama)).slice(0, n);
}

export interface Ringkasan {
  total: number; ekspor: number; impor: number; lainnya: number; pnbp: number;
  perusahaan: number; kapal: number; hcDiterbitkan: number; kelengkapanPersen: number | null;
}
export function ringkas(baris: BarisOmkaba[]): Ringkasan {
  let ekspor = 0, impor = 0, lainnya = 0, pnbp = 0, hc = 0, ada = 0, nilai = 0;
  const perusahaan = new Set<string>(), kapal = new Set<string>();
  for (const b of baris) {
    const l = layananDari(b);
    if (l === 'Ekspor') ekspor++; else if (l === 'Impor') impor++; else lainnya++;
    pnbp += b.jumlah_bayar ?? 0;
    if (hcDiterbitkan(b)) hc++;
    const p = kunci(perusahaanDari(b)); if (p) perusahaan.add(p);
    const k = kunci(b.nama_kapal); if (k) kapal.add(k);
    for (const d of DAFTAR_DOKUMEN) { const a = dokAda(b.dok[d.kolom]); if (a !== null) { nilai++; if (a) ada++; } }
  }
  return { total: baris.length, ekspor, impor, lainnya, pnbp, perusahaan: perusahaan.size, kapal: kapal.size, hcDiterbitkan: hc, kelengkapanPersen: nilai ? Math.round((ada / nilai) * 1000) / 10 : null };
}

export interface TitikBulan { bulan: number; label: string; ekspor: number; impor: number; lainnya: number; pnbp: number }
export function trenBulanan(baris: BarisOmkaba[]): TitikBulan[] {
  const hasil: TitikBulan[] = NAMA_BULAN.map((label, i) => ({ bulan: i + 1, label, ekspor: 0, impor: 0, lainnya: 0, pnbp: 0 }));
  for (const b of baris) {
    const t = hasil[bulanDari(b) - 1];
    if (!t) continue;
    const l = layananDari(b);
    if (l === 'Ekspor') t.ekspor++; else if (l === 'Impor') t.impor++; else t.lainnya++;
    t.pnbp += b.jumlah_bayar ?? 0;
  }
  return hasil;
}

export interface ItemDokumen { kolom: string; label: string; ada: number; tidak: number; kosong: number }
export function kelengkapanDokumen(baris: BarisOmkaba[]): ItemDokumen[] {
  return DAFTAR_DOKUMEN.map((d) => {
    let ada = 0, tidak = 0, kosong = 0;
    for (const b of baris) { const a = dokAda(b.dok[d.kolom]); if (a === null) kosong++; else if (a) ada++; else tidak++; }
    return { kolom: d.kolom, label: d.label, ada, tidak, kosong };
  });
}
export const jumlahDokumenAda = (b: BarisOmkaba): number => DAFTAR_DOKUMEN.filter((d) => dokAda(b.dok[d.kolom]) === true).length;

const sel = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** CSV berpemisah titik koma + BOM, supaya langsung terbaca benar di Excel berbahasa Indonesia. */
export function keCsv(baris: BarisOmkaba[]): string {
  const kepala = ['Tanggal Terbit', 'No Dokumen', 'Wilayah Kerja', 'Jenis Layanan', 'Eksportir/Importir', 'Keagenan', 'Buyer', 'Komoditi', 'Negara Asal', 'Negara Tujuan', 'Pelabuhan Asal', 'Pelabuhan Tujuan', 'Kapal/Maskapai', 'No Voyage', 'Health Certificate', 'Petugas Pemeriksa', 'PNBP', ...DAFTAR_DOKUMEN.map((d) => d.label)];
  const isi = baris.map((b) => [b.tanggal, b.no_dokumen, b.wilayah_kerja, b.jenis_layanan, b.nama_eksportir_importir, b.nama_keagenan, b.nama_buyer, b.jenis_komoditi, b.negara_asal, b.negara_tujuan, b.pelabuhan_asal, b.pelabuhan_tujuan, b.nama_kapal, b.no_voyage, b.health_certificate, b.petugas_pemeriksa, b.jumlah_bayar, ...DAFTAR_DOKUMEN.map((d) => b.dok[d.kolom])].map(sel).join(';'));
  return '\uFEFF' + [kepala.map(sel).join(';'), ...isi].join('\r\n');
}