/**
 * lib/status-laporan/queriesLaluLintasOrang.ts
 *
 * Mengambil "wilker mana saja yang sudah punya data" per modul untuk
 * periode terpilih. Tidak butuh fungsi SQL baru: Turso dibaca langsung
 * (SELECT DISTINCT wilayah_kerja ... per rentang tanggal), Supabase lewat
 * tabel biasa. Tiap sumber dibungkus terpisah: kalau satu gagal, sel
 * modul itu tampil "Gagal muat" dan modul lain tetap jalan.
 */

import { getTursoClient } from '@/lib/turso/client';
import { createClient } from '@/lib/supabase/server';
import { rentangTanggalMingguEpid } from './rentang';
import {
  kumpulkanKode,
  kumpulkanKodeSkdr,
  type SumberBkk,
  type SumberBulanan,
  type SumberMingguan,
  type SumberWilker,
} from './lalu-lintas-orang';

async function daftarNamaTurso(sql: string, args: string[], kolom: string): Promise<string[]> {
  const hasil = await getTursoClient().execute({ sql, args });
  return hasil.rows.map((r) => String((r as Record<string, unknown>)[kolom] ?? ''));
}

async function bungkusWilker(
  ambil: () => Promise<string[]>,
  petakan: typeof kumpulkanKode = kumpulkanKode,
): Promise<SumberWilker> {
  try {
    return { ok: true, kode: petakan(await ambil()) };
  } catch (e) {
    console.error('Status Lalu Lintas Orang: sumber gagal dibaca', e);
    return { ok: false };
  }
}

async function bungkusBkk(ambil: () => Promise<boolean>): Promise<SumberBkk> {
  try {
    return { ok: true, ada: await ambil() };
  } catch (e) {
    console.error('Status Lalu Lintas Orang: sumber BKK gagal dibaca', e);
    return { ok: false };
  }
}

export async function ambilStatusMingguanLlo(tahun: number, minggu: number): Promise<SumberMingguan> {
  const { awal, akhir } = rentangTanggalMingguEpid(tahun, minggu);
  const rentang = [awal, akhir];

  const turso = (tabel: string, kolomTanggal: string, kolomWilker = 'wilayah_kerja') =>
    daftarNamaTurso(
      `SELECT DISTINCT ${kolomWilker} AS nama FROM ${tabel}
       WHERE ${kolomTanggal} IS NOT NULL AND date(${kolomTanggal}) BETWEEN ? AND ?`,
      rentang,
      'nama',
    );

  const [poliklinik, penumpang_kapal, siaos, kier, skdr, pie_nasional, pie_global] = await Promise.all([
    bungkusWilker(() => turso('kunjungan_poliklinik', 'tanggal_pemeriksaan')),
    bungkusWilker(() => turso('data_penumpang_kapal', 'tanggal_tiba', 'wilker')),
    bungkusWilker(() => turso('siaos', 'tanggal')),
    bungkusWilker(() => turso('kier_kesehatan', 'tanggal_pemeriksaan')),
    bungkusWilker(async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('skdr_mingguan')
        .select('wilayah_kerja')
        .eq('tahun_epid', tahun)
        .eq('minggu_epid', minggu);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => String(r.wilayah_kerja ?? ''));
    }, kumpulkanKodeSkdr),
    bungkusBkk(async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('laporan_penyakit_nasional')
        .select('minggu_epid')
        .eq('tahun_epid', tahun)
        .eq('minggu_epid', minggu)
        .limit(1);
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    }),
    bungkusBkk(async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('laporan_penyakit_emerging')
        .select('minggu_epid')
        .eq('jenis_periode', 'mingguan')
        .eq('tahun_epid', tahun)
        .eq('minggu_epid', minggu)
        .limit(1);
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    }),
  ]);

  return { poliklinik, penumpang_kapal, siaos, kier, skdr, pie_nasional, pie_global };
}

export async function ambilStatusBulananLlo(tahun: number, bulan: number): Promise<SumberBulanan> {
  const periode = `${tahun}-${String(bulan).padStart(2, '0')}`;

  const turso = (tabel: string, kolomTanggal: string) =>
    daftarNamaTurso(
      `SELECT DISTINCT wilayah_kerja AS nama FROM ${tabel}
       WHERE ${kolomTanggal} IS NOT NULL AND strftime('%Y-%m', ${kolomTanggal}) = ?`,
      [periode],
      'nama',
    );

  const [tb, hiv, malaria] = await Promise.all([
    bungkusWilker(() => turso('tb_data', 'tanggal_pelaksanaan')),
    bungkusWilker(() => turso('hiv_data', 'tanggal_kegiatan')),
    bungkusWilker(() => turso('migrasi_malaria', 'tanggal_kegiatan')),
  ]);

  return { tb, hiv, malaria };
}
