// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/tb.ts
// Migrasi dari blok `if (kegiatan.kode === 'TB')` di buildPromptAI_()
// Code.gs.
// ================================================================

import { bersihkanTeks } from '@/lib/ai/bersihkanTeks';
import { ATURAN_UMUM } from './aturanUmum';
import type { KonteksWilker } from './dataFetchers';

export function buildPromptTb(
  konteks: KonteksWilker,
  baris12Minggu: Record<string, unknown>[]
): string {
  const { wilker, musim } = konteks;
  const s = bersihkanTeks;

  const ring =
    baris12Minggu.length > 0
      ? baris12Minggu
          .map((r) => {
            const tgl = String(r.tgl_penemuan ?? '').slice(0, 10);
            return (
              'Tgl:' + tgl +
              ' Suspek:' + s(r.jml_suspek) +
              ' TCM:' + s(r.jml_diperiksa_tcm) +
              ' Positif:' + s(r.jml_positif_tcm) +
              ' Kontak:' + s(r.jml_kontak_erat)
            );
          })
          .join(' | ')
      : 'Belum ada data';

  return (
    'Wilker: ' + s(wilker.nama) + ' (' + s(wilker.jenis) + ').' +
    ' Kegiatan: Surveilans Tuberkulosis.' +
    ' Musim: ' + musim +
    ' Catatan: ' + s(wilker.catatan) +
    ' Threshold: kasus positif maks 0 (setiap kasus positif wajib ditindaklanjuti).' +
    ' Data 12 kali terakhir: ' + ring +
    ' Fokus pada jumlah suspek, hasil TCM, dan penelusuran kontak erat.' +
    ' Rekomendasi: investigasi kontak, rujukan ke fasyankes, pencatatan SITB.' +
    ATURAN_UMUM
  );
}