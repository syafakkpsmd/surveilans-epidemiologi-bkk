// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/diare.ts
// Migrasi dari blok `if (kegiatan.kode === 'DIA')` di buildPromptAI_()
// Code.gs. Larangan menyebut vektor lain (lalat vs kecoa) TIDAK BOLEH
// dihapus — ini yang menjaga analisis tetap fokus per jenis vektor.
// ================================================================

import { bersihkanTeks } from '@/lib/ai/bersihkanTeks';
import { ATURAN_UMUM } from './aturanUmum';
import type { KonteksWilker } from './dataFetchers';

export function buildPromptDiare(
  konteks: KonteksWilker,
  baris12Minggu: Record<string, unknown>[],
  vektorType: 'lalat' | 'kecoa'
): string {
  const { wilker, musim } = konteks;
  const s = bersihkanTeks;

  const ring =
    baris12Minggu.length > 0
      ? baris12Minggu
          .map((r) => {
            const tgl = String(r.tgl_kegiatan ?? '').slice(0, 10);
            const metrikUtama =
              vektorType === 'lalat'
                ? ' FlyIdx:' + s(r.fly_index)
                : ' Kecoa/m2:' + s(r.kepadatan_kecoa_per_m2);
            return (
              'Tgl:' + tgl +
              ' Lokasi:' + s(r.lokasi) +
              ' Nilai:' + s(r.nilai_hasil_pengamatan) +
              ' Hasil:' + s(r.hasil_pengamatan) +
              ' Tindakan:' + s(r.tindakan_pengendalian) +
              metrikUtama
            );
          })
          .join(' | ')
      : 'Belum ada data';

  const instruksiDia =
    vektorType === 'lalat'
      ? ' KONTEKS: Analisis KHUSUS vektor LALAT.' +
        ' Indikator utama: Fly Index. Threshold < 2 = Memenuhi Syarat.' +
        ' JANGAN sebut kepadatan kecoa dalam analisis.' +
        ' Rekomendasi fokus pada: pengelolaan sampah, sanitasi dapur/galley,' +
        ' pemasangan fly trap, penyemprotan insektisida area lalat.'
      : ' KONTEKS: Analisis KHUSUS vektor KECOA.' +
        ' Indikator utama: Kepadatan kecoa per m2. Threshold < 2/m2 = Memenuhi Syarat.' +
        ' JANGAN sebut Fly Index atau lalat dalam analisis.' +
        ' Rekomendasi fokus pada: pemasangan umpan kecoa (gel/granul),' +
        ' penyemprotan celah dan sudut tersembunyi, sanitasi area lembab.';

  return (
    'Wilker: ' + s(wilker.nama) + ' (' + s(wilker.jenis) + ').' +
    ' Kegiatan: Pengawasan Vektor Diare (' + (vektorType === 'lalat' ? 'Lalat' : 'Kecoa') + ').' +
    ' Musim: ' + musim +
    ' Catatan: ' + s(wilker.catatan) +
    instruksiDia +
    ' Data 12 kali terakhir: ' + ring +
    ATURAN_UMUM
  );
}