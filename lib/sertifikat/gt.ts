export interface PitaGt {
  kode: string;
  label: string;
  dari: number; // batas bawah (eksklusif, kecuali pita pertama)
  sampai: number; // batas atas (inklusif)
}

const BATAS: [string, string, number, number][] = [
  ['lt7', 'Di bawah 7 GT', 0, 7],
  ['7-100', '7 – 100 GT', 7, 100],
  ['100-200', '>100 – 200 GT', 100, 200],
  ['200-350', '>200 – 350 GT', 200, 350],
  ['350-1000', '>350 – 1.000 GT', 350, 1000],
  ['1000-2000', '>1.000 – 2.000 GT', 1000, 2000],
  ['2000-3500', '>2.000 – 3.500 GT', 2000, 3500],
  ['3500-7000', '>3.500 – 7.000 GT', 3500, 7000],
  ['7000-10000', '>7.000 – 10.000 GT', 7000, 10000],
  ['10000-15000', '>10.000 – 15.000 GT', 10000, 15000],
  ['15000-20000', '>15.000 – 20.000 GT', 15000, 20000],
  ['gt20000', 'Di atas 20.000 GT', 20000, Infinity],
];

export const PITA_GT: PitaGt[] = BATAS.map(([kode, label, dari, sampai]) => ({ kode, label, dari, sampai }));

/** Pita GT untuk satu nilai GT. Nilai kosong/tidak valid -> null. */
export function pitaUntukGt(gt: number | null | undefined): PitaGt | null {
  if (gt == null || !Number.isFinite(gt) || gt < 0) return null;
  if (gt < 7) return PITA_GT[0];
  return PITA_GT.find((p, i) => i > 0 && gt > p.dari && gt <= p.sampai) ?? null;
}

export const KODE_TANPA_GT = 'tanpa-gt';

/** Hitung jumlah dokumen per pita GT dari daftar { gt, n }. GT kosong masuk "GT belum diisi". */
export function hitungPerPita(data: { gt: number | null; n: number }[]): Record<string, number> {
  const hasil: Record<string, number> = { [KODE_TANPA_GT]: 0 };
  for (const p of PITA_GT) hasil[p.kode] = 0;
  for (const d of data) {
    const kode = pitaUntukGt(d.gt)?.kode ?? KODE_TANPA_GT;
    hasil[kode] += d.n;
  }
  return hasil;
}