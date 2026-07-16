// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/hiv.ts
// Migrasi dari blok `if (kegiatan.kode === 'HIV')` di buildPromptAI_()
// Code.gs.
// ================================================================

import { bersihkanTeks } from '@/lib/ai/bersihkanTeks';
import { ATURAN_UMUM } from './aturanUmum';
import type { KonteksWilker } from './dataFetchers';

export function buildPromptHiv(
  konteks: KonteksWilker,
  baris12Minggu: Record<string, unknown>[]
): string {
  const { wilker, musim } = konteks;
  const s = bersihkanTeks;

  const ring =
    baris12Minggu.length > 0
      ? baris12Minggu
          .map((r) => {
            const tgl = String(r.tgl_skrining ?? '').slice(0, 10);
            return (
              'Tgl:' + tgl +
              ' Diperiksa:' + s(r.jml_diperiksa) +
              ' Reaktif:' + s(r.jml_reaktif) +
              ' VCT:' + s(r.jml_dirujuk_vct) +
              ' Positif:' + s(r.jml_konfirmasi_positif)
            );
          })
          .join(' | ')
      : 'Belum ada data';

  return (
    'Wilker: ' + s(wilker.nama) + ' (' + s(wilker.jenis) + ').' +
    ' Kegiatan: Surveilans HIV/AIDS.' +
    ' Musim: ' + musim +
    ' Catatan: ' + s(wilker.catatan) +
    ' Threshold: kasus reaktif maks 0 (setiap reaktif wajib dirujuk VCT).' +
    ' Data 12 kali terakhir: ' + ring +
    ' Fokus pada jumlah reaktif dan konfirmasi positif.' +
    ' Rekomendasi: rujukan VCT, konseling, notifikasi pasangan.' +
    ATURAN_UMUM
  );
}