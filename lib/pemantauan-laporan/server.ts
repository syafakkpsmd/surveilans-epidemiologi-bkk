/**
 * lib/pemantauan-laporan/server.ts
 * SERVER-ONLY. Membaca pengaturan admin (tabel kegiatan_laporan) dan data laporan asli dari tabel-tabel kegiatan,
 * lalu menyusun `units` + `laporan` untuk dashboard Ketepatan & Kelengkapan Laporan.
 *
 * Unit pelaporan = satu kegiatan di satu wilayah kerja (mis. "COP - Samarinda"). Satu "laporan masuk" = ada minimal
 * satu baris data kegiatan itu pada periodenya; waktu kirimnya = waktu input TERAWAL baris di periode itu (created_at / dibuat_pada).
 * Tabel tanpa kolom waktu input tetap dinilai Kelengkapannya; Ketepatannya ditandai tidak terukur.
 */
import 'server-only';
import { getDbClient } from '@/lib/db/client';
import type { JenisLaporan, LaporanMasuk, UnitFaskes } from '@/lib/ketepatan-laporan/types';
import { WITA_OFFSET_MS, akhirMingguan, keIsoWita } from '@/lib/ketepatan-laporan/waktu';
import { buatPemetaWilker } from '@/lib/status-laporan/lalu-lintas-orang';
import type { Wilayah } from '@/lib/wilayah-kerja';
import { getDaftarWilker, getPetaModulWilker } from '@/lib/wilayah-kerja/server';
import {
  DAFTAR_PERIODE,
  KATALOG,
  konfigBawaan,
  periodeBoleh,
  type KegiatanKatalog,
  type KonfigKegiatan,
  type PeriodeKegiatan,
} from './katalog';
import { mingguEpidDariTanggal, siklusDariTanggal } from './periode';

export interface KegiatanTampil extends KonfigKegiatan {
  label: string;
  kelompok: string;
}

export interface DataPemantauan {
  units: UnitFaskes[];
  laporan: LaporanMasuk[];
  /** Kegiatan yang dipantau (periode bukan NONAKTIF), urut katalog. */
  kegiatan: KegiatanTampil[];
  /** Kegiatan yang tabel sumbernya gagal dibaca: TIDAK ditampilkan (supaya tidak keliru tampil "belum lapor"). */
  gagal: string[];
  /** Teks wilayah di data yang tidak dikenal kamus wilker: datanya tidak terhitung. */
  wilayahTakDikenal: { kegiatan: string; nama: string }[];
  /** false = migrasi 26_kegiatan_laporan.sql belum dijalankan (memakai pengaturan bawaan). */
  tabelPengaturanAda: boolean;
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
function idn(nama: string): string {
  if (!IDENTIFIER.test(nama)) throw new Error(`Nama tabel/kolom tidak valid: ${nama}`);
  return nama;
}

// ------------------------------------------------------------ Pengaturan

const angka = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Pengaturan semua kegiatan di katalog (yang belum tersimpan memakai bawaan). */
export async function bacaKonfigurasi(): Promise<{ konfig: KonfigKegiatan[]; tabelAda: boolean }> {
  let rows: Record<string, unknown>[] = [];
  let tabelAda = true;
  try {
    const hasil = await getDbClient().execute(
      'SELECT kunci, periode, target_per_tahun, interval_hari, hari_kerja, mulai_siklus, tenggang_hari FROM kegiatan_laporan',
    );
    rows = hasil.rows;
  } catch (e: unknown) {
    // 42P01 = tabel belum ada (migrasi 26_kegiatan_laporan.sql belum dijalankan).
    if ((e as { code?: string })?.code !== '42P01') throw e;
    tabelAda = false;
    console.error('[pemantauan-laporan] Tabel kegiatan_laporan belum ada; jalankan scripts/migrate/26_kegiatan_laporan.sql');
  }
  const perKunci = new Map(rows.map((r) => [String(r.kunci), r]));

  const konfig = KATALOG.map((k): KonfigKegiatan => {
    const bawaan = konfigBawaan(k.kunci);
    const r = perKunci.get(k.kunci);
    if (!r) return bawaan;
    const periode = DAFTAR_PERIODE.includes(r.periode as PeriodeKegiatan) ? (r.periode as PeriodeKegiatan) : bawaan.periode;
    return {
      kunci: k.kunci,
      periode: periodeBoleh(k).includes(periode) ? periode : bawaan.periode,
      targetPerTahun: angka(r.target_per_tahun) ?? bawaan.targetPerTahun,
      intervalHari: angka(r.interval_hari) ?? bawaan.intervalHari,
      hariKerja: r.hari_kerja === null || r.hari_kerja === undefined ? bawaan.hariKerja : Boolean(r.hari_kerja),
      mulaiSiklus: /^\d{2}-\d{2}$/.test(String(r.mulai_siklus ?? '')) ? String(r.mulai_siklus) : bawaan.mulaiSiklus,
      tenggangHari: angka(r.tenggang_hari) ?? bawaan.tenggangHari,
    };
  });
  return { konfig, tabelAda };
}

// ------------------------------------------------------------ Wilayah wajib lapor

function wilayahWajib(k: KegiatanKatalog, aktif: readonly Wilayah[], peta: Record<string, string[]>): Wilayah[] {
  switch (k.cakupan) {
    case 'pelabuhan':
      return aktif.filter((w) => w.jenis === 'Pelabuhan');
    case 'bandara':
      return aktif.filter((w) => w.jenis === 'Bandara');
    case 'semua':
      return [...aktif];
    case 'wilker_modul': {
      const dipilih = new Set(k.kunciModulWilker ? peta[k.kunciModulWilker] ?? [] : []);
      return aktif.filter((w) => dipilih.has(w.kode));
    }
    default:
      return [];
  }
}

// ------------------------------------------------------------ Pembacaan data

interface BarisMentah {
  wilayah: string;
  /** 'YYYY-MM-DD' untuk sumber bertanggal. */
  tgl: string | null;
  /** Untuk sumber epid. */
  tahunEpid: number | null;
  mingguEpid: number | null;
  kirim: string | null;
}

async function kolomPerTabel(tabel: string[]): Promise<Map<string, Set<string>>> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ANY(?)`,
    args: [tabel],
  });
  const peta = new Map<string, Set<string>>();
  for (const r of rows) {
    const t = String(r.table_name);
    if (!peta.has(t)) peta.set(t, new Set());
    peta.get(t)!.add(String(r.column_name));
  }
  return peta;
}

async function bacaBaris(k: KegiatanKatalog, kolomWaktu: string | null, tahunList: readonly number[]): Promise<BarisMentah[]> {
  const s = k.sumber;
  const tabel = idn(s.tabel);
  const wil = s.kolomWilayah ? `COALESCE(CAST(${idn(s.kolomWilayah)} AS text), '')` : `''`;
  const waktu = kolomWaktu ? `MIN(${idn(kolomWaktu)})` : 'NULL';
  const tambahan = s.filter ? ` AND ${s.filter}` : '';
  const client = getDbClient();

  if (s.epid) {
    const tahun = idn(s.epid.tahun);
    const minggu = idn(s.epid.minggu);
    const { rows } = await client.execute({
      sql: `SELECT ${wil} AS wilayah, ${tahun} AS tahun, ${minggu} AS minggu, ${waktu} AS kirim
              FROM ${tabel}
             WHERE ${tahun} IN (${tahunList.map(() => '?').join(', ')})${tambahan}
             GROUP BY 1, 2, 3`,
      args: [...tahunList],
    });
    return rows.map((r) => ({
      wilayah: String(r.wilayah ?? ''),
      tgl: null,
      tahunEpid: angka(r.tahun),
      mingguEpid: angka(r.minggu),
      kirim: r.kirim ? String(r.kirim) : null,
    }));
  }

  const tgl = idn(s.kolomTanggal as string);
  const dari = `${Math.min(...tahunList) - 1}-12-20`; // selisih minggu epid bisa melewati pergantian tahun
  const sampai = `${Math.max(...tahunList) + 1}-01-10`;
  const { rows } = await client.execute({
    sql: `SELECT ${wil} AS wilayah, to_char(CAST(${tgl} AS date), 'YYYY-MM-DD') AS tgl, ${waktu} AS kirim
            FROM ${tabel}
           WHERE ${tgl} IS NOT NULL AND CAST(${tgl} AS date) >= CAST(? AS date) AND CAST(${tgl} AS date) < CAST(? AS date)${tambahan}
           GROUP BY 1, 2`,
    args: [dari, sampai],
  });
  return rows.map((r) => ({
    wilayah: String(r.wilayah ?? ''),
    tgl: r.tgl ? String(r.tgl) : null,
    tahunEpid: null,
    mingguEpid: null,
    kirim: r.kirim ? String(r.kirim) : null,
  }));
}

/** 'YYYY-MM-DD HH:MM:SS[.fff]' (UTC, dari lib/db/client.ts) -> Date. */
function parseWaktuInput(teks: string | null): Date | null {
  if (!teks) return null;
  const iso = /(?:Z|[+-]\d{2}:?\d{2})$/.test(teks) ? teks.replace(' ', 'T') : `${teks.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ------------------------------------------------------------ Gabungan

export async function ambilDataPemantauan(tahunList: readonly number[]): Promise<DataPemantauan> {
  const [{ konfig, tabelAda }, semuaWilayah, petaModul] = await Promise.all([bacaKonfigurasi(), getDaftarWilker(), getPetaModulWilker()]);
  const konfigPerKunci = new Map(konfig.map((c) => [c.kunci, c]));
  const aktif = semuaWilayah.filter((w) => w.aktif && w.jenis !== 'Kantor').sort((a, b) => a.urutan - b.urutan || a.kode.localeCompare(b.kode));
  const pemeta = buatPemetaWilker(semuaWilayah);

  const dipantau = KATALOG.filter((k) => (konfigPerKunci.get(k.kunci)?.periode ?? 'NONAKTIF') !== 'NONAKTIF');
  const kolomTabel = await kolomPerTabel([...new Set(dipantau.map((k) => k.sumber.tabel))]).catch(() => new Map<string, Set<string>>());

  const units: UnitFaskes[] = [];
  const laporan: LaporanMasuk[] = [];
  const gagal: string[] = [];
  const takDikenal: { kegiatan: string; nama: string }[] = [];

  await Promise.all(
    dipantau.map(async (k) => {
      const c = konfigPerKunci.get(k.kunci) as KonfigKegiatan;
      const jenis = c.periode as JenisLaporan;
      const kolom = kolomTabel.get(k.sumber.tabel);
      const kolomWaktu = k.sumber.kolomWaktuInput.find((x) => kolom?.has(x)) ?? null;

      let baris: BarisMentah[];
      try {
        baris = await bacaBaris(k, kolomWaktu, tahunList);
      } catch (e) {
        console.error(`[pemantauan-laporan] Sumber ${k.kunci} gagal dibaca`, e);
        gagal.push(k.label);
        return;
      }

      const wajib: { kode: string; wilayah: string; jenis: UnitFaskes['jenis'] }[] =
        k.cakupan === 'bkk'
          ? [{ kode: 'BKK', wilayah: 'BKK', jenis: 'BKK' }]
          : wilayahWajib(k, aktif, petaModul).map((w) => ({ kode: w.kode, wilayah: w.namaPendek, jenis: w.jenis as UnitFaskes['jenis'] }));
      const kodeWajib = new Set(wajib.map((w) => w.kode));
      for (const w of wajib) {
        units.push({
          id: `${k.kunci}|${w.kode}`,
          nama: k.label,
          wilayah: w.wilayah,
          jenis: w.jenis,
          kegiatanKunci: k.kunci,
          kegiatanLabel: k.label,
          kelompok: k.kelompok,
          periode: jenis,
          ketepatanTerukur: kolomWaktu !== null,
        });
      }

      const nama = new Set<string>();
      for (const b of baris) {
        // wilayah -> kode
        let kode: string | null;
        if (k.cakupan === 'bkk' || !k.sumber.kolomWilayah) kode = 'BKK';
        else if (k.sumber.bentukWilayah === 'kode') kode = b.wilayah.trim().toUpperCase() || null;
        else {
          kode = pemeta.petakanKeKode(b.wilayah);
          if (!kode && b.wilayah.trim()) nama.add(b.wilayah.trim());
        }
        if (!kode || !kodeWajib.has(kode)) continue;

        // periode
        let tahun: number;
        let periode: number;
        let fallback: Date;
        if (b.tgl === null) {
          if (b.tahunEpid === null || b.mingguEpid === null || b.mingguEpid > 52 || b.mingguEpid < 1) continue;
          tahun = b.tahunEpid;
          periode = b.mingguEpid;
          fallback = akhirMingguan(tahun, periode);
        } else {
          const [y, m, d] = b.tgl.split('-').map(Number);
          fallback = new Date(Date.UTC(y, m - 1, d, 23, 59, 59) - WITA_OFFSET_MS);
          if (jenis === 'BULANAN') {
            tahun = y;
            periode = m;
          } else if (jenis === 'MINGGUAN') {
            const p = mingguEpidDariTanggal(y, m, d);
            if (p.periode > 52) continue;
            tahun = p.tahun;
            periode = p.periode;
          } else {
            const p = siklusDariTanggal(y, m, d, c);
            if (!p) continue;
            tahun = p.tahun;
            periode = p.periode;
          }
        }
        if (!tahunList.includes(tahun)) continue;

        laporan.push({
          unitId: `${k.kunci}|${kode}`,
          jenis,
          tahun,
          periode,
          submittedAt: keIsoWita(parseWaktuInput(b.kirim) ?? fallback),
        });
      }
      for (const n of nama) takDikenal.push({ kegiatan: k.label, nama: n });
    }),
  );

  const urutKatalog = new Map(KATALOG.map((k, i) => [k.kunci, i]));
  units.sort((a, b) => (urutKatalog.get(a.kegiatanKunci ?? '') ?? 0) - (urutKatalog.get(b.kegiatanKunci ?? '') ?? 0));

  return {
    units,
    laporan,
    kegiatan: dipantau
      .filter((k) => !gagal.includes(k.label))
      .map((k) => ({ ...(konfigPerKunci.get(k.kunci) as KonfigKegiatan), label: k.label, kelompok: k.kelompok })),
    gagal: gagal.sort(),
    wilayahTakDikenal: takDikenal.sort((a, b) => a.kegiatan.localeCompare(b.kegiatan) || a.nama.localeCompare(b.nama)),
    tabelPengaturanAda: tabelAda,
  };
}
