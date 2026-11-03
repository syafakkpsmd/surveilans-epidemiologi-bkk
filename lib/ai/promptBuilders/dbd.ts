// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/dbd.ts
// Migrasi dari blok `if (kegiatan.kode === 'DBD')` di buildPromptAI_()
// Code.gs. Field indeks array GAS (r[1], r[9], dst) diganti nama
// kolom Supabase (vektor_dbd), logika & threshold TIDAK diubah.
// ================================================================

import { bersihkanTeks } from '@/lib/ai/bersihkanTeks';
import { ATURAN_UMUM } from './aturanUmum';
import type { KonteksWilker } from './dataFetchers';

const THRESHOLD = { hiMax: 1, abjMin: 99, ciMax: 1 };

export function buildPromptDbd(
  konteks: KonteksWilker,
  baris12Minggu: Record<string, unknown>[]
): string {
  const { wilker, musim } = konteks;
  const s = bersihkanTeks;

  const ring =
    baris12Minggu.length > 0
      ? baris12Minggu
          .map((r) => {
            const tgl = String(r.tgl_survei ?? '').slice(0, 10);
            return (
              'Tgl:' + tgl +
              ' Zona:' + s(r.zona) +
              ' HI:' + s(r.hi) + '%' +
              ' ABJ:' + s(r.abj) + '%' +
              ' CI:' + s(r.ci) + '%' +
              ' Sub:' + s(r.sub_lokasi) +
              ' CH:' + s(r.curah_hujan_mm ?? 0) + 'mm'
            );
          })
          .join(' | ')
      : 'Belum ada data';

  const tglList = baris12Minggu
    .map((r) => String(r.tgl_survei ?? '').slice(0, 10))
    .filter(Boolean);

  return (
    'Wilker: ' + s(wilker.nama) + ' (' + s(wilker.jenis) + ').' +
    ' Kegiatan: Pengawasan Vektor DBD (Aedes).' +
    ' Zona: Perimeter, Buffer.' +
    ' Musim: ' + musim +
    ' Periode: ' + (tglList[0] || '-') + ' sampai ' + (tglList[tglList.length - 1] || '-') +
    ' Catatan: ' + s(wilker.catatan) +
    ' Threshold HI maks ' + THRESHOLD.hiMax + '%' +
    ' ABJ min ' + THRESHOLD.abjMin + '%' +
    ' CI maks ' + THRESHOLD.ciMax + '%.' +
    ' Data survei DBD 12 kali terakhir: ' + ring + '.' +
    ATURAN_UMUM
  );
}