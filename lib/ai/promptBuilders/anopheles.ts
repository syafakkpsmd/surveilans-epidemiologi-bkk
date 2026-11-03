// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/anopheles.ts
// Migrasi dari blok `if (kegiatan.kode === 'ANO')` di buildPromptAI_()
// Code.gs. Dua varian: dewasa (korelasi cuaca/fase bulan wajib) dan
// larva (fokus habitat & cidukan positif).
// ================================================================

import { bersihkanTeks } from '@/lib/ai/bersihkanTeks';
import { ATURAN_UMUM } from './aturanUmum';
import type { KonteksWilker } from './dataFetchers';

const THRESHOLD_MBR_MAX = 1;

export function buildPromptAnopheles(
  konteks: KonteksWilker,
  baris12Minggu: Record<string, unknown>[],
  tipeAno: 'dewasa' | 'larva'
): string {
  const { wilker, musim } = konteks;
  const s = bersihkanTeks;

  const zonaTeks =
    wilker.kode === 'WK01'
      ? 'Perimeter/Buffer Pelabuhan Umum & TPK Palaran'
      : 'Perimeter, Buffer';

  if (tipeAno === 'larva') {
    const ring =
      baris12Minggu.length > 0
        ? baris12Minggu
            .map((r) => {
              const tgl = String(r.tgl_survei ?? '').slice(0, 10);
              return (
                'Tgl:' + tgl +
                ' Cidukan:' + s(r.jumlah_cidukan) +
                ' Larva:' + s(r.jumlah_larva) +
                ' JnsLarva:' + s(r.jumlah_jenis_larva) +
                ' Spesies:' + s(r.spesies_larva) +
                ' Habitat:' + s(r.keadaan_tempat_perindukan)
              );
            })
            .join(' | ')
        : 'Belum ada data larva';

    return (
      'Wilker: ' + s(wilker.nama) + ' (' + s(wilker.jenis) + ').' +
      ' Kegiatan: Survei Larva Anopheles.' +
      ' Musim: ' + musim +
      ' Catatan: ' + s(wilker.catatan) +
      ' Total observasi: ' + baris12Minggu.length +
      ' Data larva 12 kali terakhir: ' + ring +
      ' Threshold: kepadatan larva rendah=AMAN, sedang=WASPADA, tinggi=BAHAYA.' +
      ' Cidukan positif tinggi menunjukkan habitat breeding aktif.' +
      ' Rekomendasi fokus pada: larvisida, drainase, modifikasi habitat.' +
      ' Sertakan field jmlLarva (rata-rata), jmlCidukan (rata-rata).' +
      ATURAN_UMUM
    );
  }

  // ── Dewasa ──
  const ring =
    baris12Minggu.length > 0
      ? baris12Minggu
          .map((r) => {
            const tgl = String(r.tgl_survei ?? '').slice(0, 10);
            return (
              'Tgl:' + tgl +
              ' Zona:' + s(r.zona) +
              ' MBR:' + s(r.mbr) +
              ' MHD:' + s(r.mhd) +
              ' Spesies:' + s(r.spesies) +
              ' Bulan:' + s(r.fase_bulan) +
              ' Cuaca:' + s(r.cuaca) +
              ' Suhu:' + s(r.suhu_c) + 'C' +
              ' Lembab:' + s(r.kelembapan_pct) + '%'
            );
          })
          .join(' | ')
      : 'Belum ada data dewasa';

  return (
    'Wilker: ' + s(wilker.nama) + ' (' + s(wilker.jenis) + ').' +
    ' Kegiatan: Survei Nyamuk Dewasa Anopheles.' +
    ' Zona: ' + zonaTeks +
    ' Musim: ' + musim +
    ' Catatan: ' + s(wilker.catatan) +
    ' Threshold MBR maks ' + THRESHOLD_MBR_MAX + ' man/hour.' +
    ' Total observasi: ' + baris12Minggu.length +
    ' Data survei 12 kali terakhir: ' + ring +
    ' Analisis WAJIB mencakup:' +
    ' (1) korelasi fase bulan dengan aktivitas nyamuk malam hari,' +
    ' (2) pengaruh suhu dan kelembapan terhadap MBR,' +
    ' (3) kondisi cuaca dominan saat MBR tinggi.' +
    ' Sertakan field mbr, suhu, kelembapan, faseBulan, cuaca, korelasiCuaca.' +
    ATURAN_UMUM
  );
}