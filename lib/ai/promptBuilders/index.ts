// ================================================================
// SEGMEN 13 — lib/ai/promptBuilders/index.ts
// Titik masuk tunggal dipanggil dari app/api/analisis-ai/route.ts.
// Menambah kegiatan baru di masa depan: cukup tambah 1 builder file
// + 1 entry di REGISTRY, TIDAK perlu ubah route handler.
// ================================================================

import { buildPromptDbd } from './dbd';
import { buildPromptTikus } from './tikus';
import { buildPromptAnopheles } from './anopheles';
import { buildPromptDiare } from './diare';
import { buildPromptMalaria } from './malaria';
import { buildPromptTb } from './tb';
import { buildPromptHiv } from './hiv';
import {
  ambil12BarisTerakhir,
  getWilkerByKode,
  getMusimBerjalan,
  type FilterTambahan,
} from './dataFetchers';

export interface HasilPrediksiAI {
  riskScore: number;
  level: 'AMAN' | 'WASPADA' | 'BAHAYA';
  tren: 'NAIK' | 'TURUN' | 'STABIL';
  analisis: string;
  rekomendasi: string;
  prediksi4minggu: string;
  rentangRisiko: unknown[];
  korelasiHujan: string;
}

/**
 * Registry: prefix konteks -> { tabel, kolomTanggal, builder }.
 * Urutan pengecekan penting — cocokkan yang paling spesifik dulu
 * (mis. "vektor-anopheles" sebelum "vektor-a" generik, walau di sini
 * tidak ada tabrakan karena semua prefix cukup unik).
 */
export async function susunPromptKegiatan(
  konteks: string,
  kodeWilker: string,
  filterTambahan: FilterTambahan
): Promise<string> {
  const wilker = await getWilkerByKode(kodeWilker);
  if (!wilker) throw new Error(`Wilker ${kodeWilker} tidak ditemukan.`);
  const musim = getMusimBerjalan();
  const konteksWilker = { wilker, musim };

  if (konteks.startsWith('vektor-aedes')) {
    const baris = await ambil12BarisTerakhir({
      tabel: 'vektor_dbd',
      kolomTanggal: 'tgl_survei',
      kodeWilker,
      filterTambahan: buildFilterDbd(filterTambahan),
    });
    return buildPromptDbd(konteksWilker, baris);
  }

  if (konteks.startsWith('vektor-tikus')) {
    const baris = await ambil12BarisTerakhir({
      tabel: 'vektor_tikus',
      kolomTanggal: 'tgl_survei',
      kodeWilker,
    });
    return buildPromptTikus(konteksWilker, baris);
  }

  if (konteks.startsWith('vektor-anopheles')) {
    const tipeAno = filterTambahan.tipeAno ?? (konteks.includes('larva') ? 'larva' : 'dewasa');
    const baris = await ambil12BarisTerakhir({
      tabel: 'vektor_anopheles',
      kolomTanggal: 'tgl_survei',
      kodeWilker,
      filterTambahan: { tipe_pengamatan: tipeAno },
    });
    return buildPromptAnopheles(konteksWilker, baris, tipeAno);
  }

  if (konteks.startsWith('vektor-diare')) {
    const vektorType: 'lalat' | 'kecoa' =
      filterTambahan.vektorType ?? (konteks.includes('kecoa') ? 'kecoa' : 'lalat');
    const baris = await ambil12BarisTerakhir({
      tabel: 'vektor_diare',
      kolomTanggal: 'tgl_kegiatan',
      kodeWilker,
      filterTambahan: { jenis_kegiatan: vektorType },
    });
    return buildPromptDiare(konteksWilker, baris, vektorType);
  }

  if (konteks.startsWith('malaria')) {
    const baris = await ambil12BarisTerakhir({
      tabel: 'malaria_migrasi',
      kolomTanggal: 'tgl_kedatangan',
      kodeWilker,
    });
    return buildPromptMalaria(konteksWilker, baris);
  }

  if (konteks.startsWith('tb-')) {
    const baris = await ambil12BarisTerakhir({
      tabel: 'tb_data',
      kolomTanggal: 'tgl_penemuan',
      kodeWilker,
    });
    return buildPromptTb(konteksWilker, baris);
  }

  if (konteks.startsWith('hiv-')) {
    const baris = await ambil12BarisTerakhir({
      tabel: 'hiv_data',
      kolomTanggal: 'tgl_skrining',
      kodeWilker,
    });
    return buildPromptHiv(konteksWilker, baris);
  }

  throw new Error(`Konteks "${konteks}" tidak dikenali oleh promptBuilders registry.`);
}

function buildFilterDbd(filterTambahan: FilterTambahan): Record<string, string> | undefined {
  const f: Record<string, string> = {};
  if (filterTambahan.zona) f.zona = filterTambahan.zona;
  if (filterTambahan.subLokasi) f.sub_lokasi = filterTambahan.subLokasi;
  return Object.keys(f).length ? f : undefined;
}

/**
 * Parsing & normalisasi hasil JSON dari Gemini — migrasi PERSIS dari
 * parsePrediksiAI_() GAS (termasuk fallback nama field alternatif dan
 * normalisasi level/tren yang tidak persis AMAN/WASPADA/BAHAYA/dst).
 */
export function parsePrediksiAI(teksMentah: string): HasilPrediksiAI {
  try {
    const teks = (teksMentah || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const p = JSON.parse(teks);

    const analisis = p.analisis ?? p.analysis ?? p.deskripsi ?? p.narasi ?? p.analisa ?? p.uraian ?? p.keterangan ?? '';
    const rekomendasi = p.rekomendasi ?? p.recommendation ?? p.saran ?? p.tindakan ?? p.aksi ?? p.langkah ?? '';
    const prediksi = p.prediksi4minggu ?? p.prediksi ?? p.proyeksi ?? p.forecast ?? p.outlook ?? '';
    const korelasi = p.korelasiHujan ?? p.korelasi ?? p.curahHujan ?? p.rainfall ?? p.hujan ?? '';

    let level = String(p.level ?? p.status ?? p.risiko ?? '').toUpperCase();
    if (!['AMAN', 'WASPADA', 'BAHAYA'].includes(level)) {
      if (level.includes('BAHAYA') || level.includes('TINGGI') || level.includes('HIGH')) level = 'BAHAYA';
      else if (level.includes('WASPADA') || level.includes('SEDANG') || level.includes('MEDIUM')) level = 'WASPADA';
      else level = 'AMAN';
    }

    let tren = String(p.tren ?? p.trend ?? p.kecenderungan ?? '').toUpperCase();
    if (!['NAIK', 'TURUN', 'STABIL'].includes(tren)) {
      if (tren.includes('NAIK') || tren.includes('MENINGKAT')) tren = 'NAIK';
      else if (tren.includes('TURUN') || tren.includes('MENURUN')) tren = 'TURUN';
      else tren = 'STABIL';
    }

    return {
      riskScore: Math.min(100, Math.max(0, parseInt(p.riskScore ?? p.risk_score ?? p.skor ?? '0', 10) || 0)),
      level: level as HasilPrediksiAI['level'],
      tren: tren as HasilPrediksiAI['tren'],
      analisis: analisis || 'Data tidak mencukupi untuk analisis.',
      rekomendasi: rekomendasi || 'Lanjutkan surveilans rutin sesuai SOP.',
      prediksi4minggu: prediksi || '-',
      rentangRisiko: Array.isArray(p.rentangRisiko) ? p.rentangRisiko : [],
      korelasiHujan: korelasi || '-',
    };
  } catch (e) {
    return {
      riskScore: 0,
      level: 'AMAN',
      tren: 'STABIL',
      analisis: 'Gagal parse respons AI: ' + (e as Error).message,
      rekomendasi: '-',
      prediksi4minggu: '-',
      rentangRisiko: [],
      korelasiHujan: '-',
    };
  }
}