// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/malaria.ts
// Migrasi dari blok `if (kegiatan.kode === 'MAL')` di buildPromptAI_()
// Code.gs.
// ================================================================

import { bersihkanTeks } from '@/lib/ai/bersihkanTeks';
import { ATURAN_UMUM } from './aturanUmum';
import type { KonteksWilker } from './dataFetchers';

const THRESHOLD = { positifMax: 0, apiMax: 1 };

export function buildPromptMalaria(
  konteks: KonteksWilker,
  baris12Minggu: Record<string, unknown>[]
): string {
  const { wilker, musim } = konteks;
  const s = bersihkanTeks;

  const ring =
    baris12Minggu.length > 0
      ? baris12Minggu
          .map((r) => {
            const tgl = String(r.tgl_kedatangan ?? '').slice(0, 10);
            return (
              'Tgl:' + tgl +
              ' Asal:' + s(r.rute_asal) +
              ' Diperiksa:' + s(r.jml_diperiksa) +
              ' Positif:' + s(r.jml_positif_rdt) +
              ' Plasmodium:' + s(r.jenis_plasmodium)
            );
          })
          .join(' | ')
      : 'Belum ada data';

  return (
    'Wilker: ' + s(wilker.nama) + ' (' + s(wilker.jenis) + ').' +
    ' Kegiatan: Surveilans Migrasi Malaria.' +
    ' Musim: ' + musim +
    ' Catatan: ' + s(wilker.catatan) +
    ' Threshold: positif maks ' + THRESHOLD.positifMax + ', API maks ' + THRESHOLD.apiMax + '.' +
    ' Data 12 kali terakhir: ' + ring +
    ' Fokus analisis pada kasus positif RDT dan asal daerah endemis.' +
    ' Rekomendasi: tatalaksana kasus, notifikasi, rujukan jika perlu.' +
    ATURAN_UMUM
  );
}