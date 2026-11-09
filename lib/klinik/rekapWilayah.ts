// lib/klinik/rekapWilayah.ts
// Agregasi MURNI (tanpa database): rekap klinik binaan per wilayah kerja BKK.
// Klinik dikaitkan ke wilayah lewat klinik_binaan.kode_wilker (diisi admin di Kelola Klinik).

export type KlinikUntukRekap = { id: string; nama_klinik: string; kode_wilker: string | null };
export type WilayahUntukRekap = { kode: string; nama: string };

export type StatusPengawasan = 'memenuhi_syarat' | 'perlu_perbaikan' | 'tidak_memenuhi_syarat';

export interface BarisRekapWilayah {
  /** null = klinik yang belum dikaitkan ke wilayah kerja mana pun */
  kode: string | null;
  nama: string;
  jumlahKlinik: number;
  /** total layanan ICV (sertifikat vaksinasi internasional) seluruh klinik wilayah ini */
  totalLayananIcv: number;
  /** klinik yang sudah pernah diawasi (punya status pengawasan terbaru) */
  sudahDiawasi: number;
  belumDiawasi: number;
  memenuhi: number;
  perluPerbaikan: number;
  tidakMemenuhi: number;
  /** % klinik yang sudah diawasi berstatus memenuhi syarat; null bila belum ada yang diawasi */
  persenMemenuhi: number | null;
  namaKlinik: string[];
}

const kosong = (kode: string | null, nama: string): BarisRekapWilayah => ({
  kode, nama, jumlahKlinik: 0, totalLayananIcv: 0, sudahDiawasi: 0, belumDiawasi: 0, memenuhi: 0, perluPerbaikan: 0,
  tidakMemenuhi: 0, persenMemenuhi: null, namaKlinik: [],
});

/**
 * @param wilayah wilayah kerja yang ditampilkan (urut); wilayah tanpa klinik tetap muncul dengan angka 0
 * @param layananPerKlinik id klinik -> jumlah layanan ICV
 * @param statusTerbaru id klinik -> status pengawasan terbaru (null/tak ada = belum diawasi)
 */
export function rekapKlinikPerWilayah(args: {
  klinik: readonly KlinikUntukRekap[];
  wilayah: readonly WilayahUntukRekap[];
  layananPerKlinik: ReadonlyMap<string, number>;
  statusTerbaru: ReadonlyMap<string, string | null>;
}): { baris: BarisRekapWilayah[]; total: BarisRekapWilayah } {
  const peta = new Map<string | null, BarisRekapWilayah>(args.wilayah.map((w) => [w.kode, kosong(w.kode, w.nama)]));
  const tanpa = kosong(null, 'Belum dikaitkan ke wilayah kerja');

  for (const k of args.klinik) {
    const baris = (k.kode_wilker != null && peta.get(k.kode_wilker)) || tanpa; // kode tak dikenal dianggap belum dikaitkan
    baris.jumlahKlinik += 1;
    baris.namaKlinik.push(k.nama_klinik);
    baris.totalLayananIcv += args.layananPerKlinik.get(k.id) ?? 0;
    const status = args.statusTerbaru.get(k.id) ?? null;
    if (!status) baris.belumDiawasi += 1;
    else {
      baris.sudahDiawasi += 1;
      if (status === 'memenuhi_syarat') baris.memenuhi += 1;
      else if (status === 'perlu_perbaikan') baris.perluPerbaikan += 1;
      else if (status === 'tidak_memenuhi_syarat') baris.tidakMemenuhi += 1;
    }
  }

  const semua = [...peta.values(), tanpa].map((b) => ({
    ...b,
    namaKlinik: [...b.namaKlinik].sort((a, c) => a.localeCompare(c)),
    persenMemenuhi: b.sudahDiawasi > 0 ? Math.round((b.memenuhi / b.sudahDiawasi) * 1000) / 10 : null,
  }));
  // Baris "belum dikaitkan" hanya ditampilkan bila ada isinya.
  const baris = semua.filter((b) => b.kode !== null || b.jumlahKlinik > 0);

  const total = kosong(null, 'Seluruh wilayah kerja');
  for (const b of baris) {
    total.jumlahKlinik += b.jumlahKlinik;
    total.totalLayananIcv += b.totalLayananIcv;
    total.sudahDiawasi += b.sudahDiawasi;
    total.belumDiawasi += b.belumDiawasi;
    total.memenuhi += b.memenuhi;
    total.perluPerbaikan += b.perluPerbaikan;
    total.tidakMemenuhi += b.tidakMemenuhi;
  }
  total.persenMemenuhi = total.sudahDiawasi > 0 ? Math.round((total.memenuhi / total.sudahDiawasi) * 1000) / 10 : null;
  return { baris, total };
}
