// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/tikus.ts
// Migrasi dari blok `if (kegiatan.kode === 'TKS')` di buildPromptAI_()
// Code.gs. LARANGAN & INTERPRETASI WAJIB di bawah TIDAK BOLEH diubah
// — ini yang mencegah Gemini menyarankan fogging/insektisida untuk
// pengendalian tikus (rodent), yang secara teknis salah kategori.
// ================================================================

import { bersihkanTeks } from '@/lib/ai/bersihkanTeks';
import { ATURAN_UMUM } from './aturanUmum';
import type { KonteksWilker } from './dataFetchers';

export function buildPromptTikus(
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
              ' Area:' + s(r.area_survei) +
              ' TSI:' + s(r.tsi) + '%' +
              ' IdxPinjal:' + s(r.index_pinjal) +
              ' Spesies:' + s(r.spesies_dominan) +
              ' Lepto:' + s(r.hasil_leptospira) + '(' + s(r.jumlah_positif_leptospira ?? 0) + ')' +
              ' Pes:' + s(r.hasil_pes) + '(' + s(r.jumlah_positif_pes ?? 0) + ')' +
              ' Hanta:' + s(r.hasil_hantavirus) + '(' + s(r.jumlah_positif_hantavirus ?? 0) + ')'
            );
          })
          .join(' | ')
      : 'Belum ada data';

  const KONTEKS_LARANGAN =
    ' KONTEKS: Kegiatan ini adalah pengendalian TIKUS (rodent), bukan serangga.' +
    ' LARANGAN KERAS — JANGAN rekomendasikan:' +
    ' fogging, pengasapan, abatisasi, larvasida, insektisida semprot.' +
    ' Rekomendasi HANYA boleh dari daftar ini:' +
    ' pemasangan perangkap/trap, rodentisida/umpan beracun,' +
    ' fumigasi gudang, sanitasi dan eliminasi sarang tikus,' +
    ' pengendalian pinjal pada tikus tertangkap,' +
    ' tata kelola sampah, penutupan lubang dan celah bangunan.';

  const INTERPRETASI_WAJIB =
    ' INTERPRETASI WAJIB:' +
    ' Jika TSI > 5% maka level minimal WASPADA.' +
    ' Jika Index Pinjal > 1 maka tingkatkan kewaspadaan penularan Pes.' +
    ' Jika Leptospira = Positif (lihat angka jumlah kasus di kurung): level BAHAYA,' +
    ' rekomendasikan notifikasi ke Dinas Kesehatan, pemeriksaan pekerja berisiko,' +
    ' dan edukasi risiko penularan di wilayah sekitar — makin banyak jumlah kasus' +
    ' positif, makin tinggi urgensi rekomendasinya.' +
    ' Jika Pes = Positif: level BAHAYA, rekomendasikan koordinasi BKK' +
    ' dan aktivasi SKD Pes segera.' +
    ' Jika Hantavirus = Positif: level BAHAYA, rekomendasikan investigasi' +
    ' epidemiologi dan pelaporan segera ke atasan.' +
    ' Jika semua lab Negatif dan TSI rendah: level AMAN.';

  return (
    'Wilker: ' + s(wilker.nama) + ' (' + s(wilker.jenis) + ').' +
    ' Kegiatan: Pengawasan Vektor Tikus.' +
    ' Musim: ' + musim +
    ' Catatan: ' + s(wilker.catatan) +
    ' Threshold: TSI maks 5%, Index Pinjal maks 1.' +
    ' Data 12 kali terakhir: ' + ring + '.' +
    KONTEKS_LARANGAN +
    INTERPRETASI_WAJIB +
    ATURAN_UMUM
  );
}