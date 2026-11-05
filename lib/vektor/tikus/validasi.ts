// lib/vektor/tikus/validasi.ts
import { parseTanggal, type UrutanTanggal } from '@/lib/tanggal/parse-tanggal';
import { parseAngka, petakanWilayah } from '@/lib/vektor/umum';
import {
  bacaHasilLab, bacaSpesies, hitungIndexPinjal, hitungTsi, type HasilLab, type KodeSpesies,
} from './config';

type Baris = Record<string, unknown>;
type Hasil<T> = { ok: true; data: T; ambigu?: boolean } | { ok: false; error: string };
export interface OpsiBaca { urutanAmbigu?: UrutanTanggal }

export interface DataSurveiTikus {
  tgl_survei: string;
  kode_wilker: string;
  area_survei: string | null;
  jml_trap_dipasang: number;
  rt: number; rn: number; mm: number; jenis_lainnya: number;
  jml_trap_tertangkap: number;
  tsi: number;
  jml_pinjal_ditemukan: number;
  index_pinjal: number | null;
  keterangan: string | null;
}

export interface DataLab {
  tgl_periksa: string;
  kode_wilker: string;
  nama_tikus: KodeSpesies;
  lokasi_pemasangan: string;
  kode_sampel: string | null;
  hasil_leptospira: HasilLab | null;
  hasil_pes: HasilLab | null;
  hasil_hantavirus: HasilLab | null;
  keterangan: string | null;
}

// Judul kolom Excel (huruf kecil tanpa spasi/tanda baca) -> nama baku
const HEADER_SURVEI: Record<string, string> = {
  tanggal: 'tanggal', tanggalkegiatan: 'tanggal', tanggalsurvei: 'tanggal', tglsurvei: 'tanggal', tglkegiatan: 'tanggal',
  wilayahkerja: 'wilayah', wilayah: 'wilayah', wilker: 'wilayah', kodewilker: 'wilayah',
  jumlahperangkapdipasang: 'dipasang', perangkapdipasang: 'dipasang', jumlahtrapdipasang: 'dipasang',
  trapdipasang: 'dipasang', jmltrapdipasang: 'dipasang',
  rt: 'rt', rn: 'rn', mm: 'mm', jenislainnya: 'lainnya', lainnya: 'lainnya',
  jumlahpinjal: 'pinjal', pinjal: 'pinjal', jumlahpinjalditemukan: 'pinjal',
  lokasipemasangan: 'lokasi', areasurvei: 'lokasi', lokasi: 'lokasi',
  keterangan: 'keterangan',
};

const HEADER_LAB: Record<string, string> = {
  tanggalpemeriksaan: 'tanggal', tanggalperiksa: 'tanggal', tglperiksa: 'tanggal', tanggal: 'tanggal',
  wilayahkerja: 'wilayah', wilayah: 'wilayah', wilker: 'wilayah', kodewilker: 'wilayah',
  namatikus: 'nama_tikus', spesies: 'nama_tikus', jenistikus: 'nama_tikus', nama: 'nama_tikus',
  lokasipemasangan: 'lokasi', areasurvei: 'lokasi', lokasi: 'lokasi',
  kodesampel: 'kode_sampel', nosampel: 'kode_sampel', kode: 'kode_sampel',
  hasilleptospira: 'leptospira', leptospira: 'leptospira',
  hasilpes: 'pes', pes: 'pes',
  hasilhantavirus: 'hantavirus', hantavirus: 'hantavirus', hanta: 'hantavirus',
  keterangan: 'keterangan',
};

function kanonik(baris: Baris, peta: Record<string, string>): Baris {
  const out: Baris = {};
  const takDikenal: [string, unknown][] = [];
  for (const [h, v] of Object.entries(baris)) {
    const k = peta[h.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (k) {
      if (out[k] === undefined || out[k] === '') out[k] = v;
    } else takDikenal.push([h, v]);
  }
  // Judul kolom wilayah kadang tertinggal berupa nama wilayah (mis. "Sangkulirang" di sheet survei);
  // kolom seperti itu dianggap kolom wilayah kerja.
  if (out.wilayah === undefined) {
    for (const [h, v] of takDikenal) {
      if (petakanWilayah(h)) { out.wilayah = v; break; }
    }
  }
  return out;
}

export const kanonikSurvei = (b: Baris) => kanonik(b, HEADER_SURVEI);
export const kanonikLab = (b: Baris) => kanonik(b, HEADER_LAB);

function bacaTanggalWilayah(
  b: Baris, o: OpsiBaca, label: string
): Hasil<{ tanggal: string; kode: string }> {
  const t = parseTanggal(b.tanggal, { urutanAmbigu: o.urutanAmbigu });
  if (!t.iso) return { ok: false, error: `${label}: ${t.pesan ?? 'tidak terbaca'}` };
  if (t.masaDepan) return { ok: false, error: `${label} ${t.iso} ada di masa depan` };
  const kode = petakanWilayah(String(b.wilayah ?? ''));
  if (!kode) return { ok: false, error: `Wilayah kerja "${b.wilayah ?? ''}" tidak dikenali` };
  return { ok: true, ambigu: t.ambigu, data: { tanggal: t.iso, kode } };
}

function bacaBulat(
  v: unknown, nama: string, min: number, wajib: boolean
): { nilai: number } | { error: string } {
  if (v === '' || v === null || v === undefined) {
    return wajib ? { error: `${nama} wajib diisi` } : { nilai: 0 };
  }
  const n = parseAngka(v);
  if (n === null || !Number.isInteger(n) || n < min || n > 1_000_000) {
    return { error: `${nama} harus bilangan bulat minimal ${min}` };
  }
  return { nilai: n };
}

const teksOpsional = (v: unknown, maks: number) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, maks) : null;
};

export function validasiSurveiTikus(b0: Baris, o: OpsiBaca = {}): Hasil<DataSurveiTikus> {
  const b = kanonikSurvei(b0);
  const k = bacaTanggalWilayah(b, o, 'Tanggal kegiatan');
  if (!k.ok) return k;

  const isian: [string, string, number, boolean][] = [
    ['dipasang', 'Jumlah perangkap dipasang', 1, true],
    ['rt', 'Jumlah RT', 0, false],
    ['rn', 'Jumlah RN', 0, false],
    ['mm', 'Jumlah MM', 0, false],
    ['lainnya', 'Jumlah jenis lainnya', 0, false],
    ['pinjal', 'Jumlah pinjal', 0, false],
  ];
  const n: Record<string, number> = {};
  for (const [kunci, nama, min, wajib] of isian) {
    const r = bacaBulat(b[kunci], nama, min, wajib);
    if ('error' in r) return { ok: false, error: r.error };
    n[kunci] = r.nilai;
  }

  const tertangkap = n.rt + n.rn + n.mm + n.lainnya;
  if (tertangkap > n.dipasang) {
    return { ok: false, error: `Tikus tertangkap (${tertangkap}) melebihi perangkap dipasang (${n.dipasang})` };
  }

  return {
    ok: true,
    ambigu: k.ambigu,
    data: {
      tgl_survei: k.data.tanggal,
      kode_wilker: k.data.kode,
      area_survei: teksOpsional(b.lokasi, 120),
      jml_trap_dipasang: n.dipasang,
      rt: n.rt, rn: n.rn, mm: n.mm, jenis_lainnya: n.lainnya,
      jml_trap_tertangkap: tertangkap,
      tsi: hitungTsi(tertangkap, n.dipasang),
      jml_pinjal_ditemukan: n.pinjal,
      index_pinjal: hitungIndexPinjal(n.pinjal, tertangkap),
      keterangan: teksOpsional(b.keterangan, 500),
    },
  };
}

export function validasiLab(b0: Baris, o: OpsiBaca = {}): Hasil<DataLab> {
  const b = kanonikLab(b0);
  const k = bacaTanggalWilayah(b, o, 'Tanggal pemeriksaan');
  if (!k.ok) return k;

  const spesies = bacaSpesies(b.nama_tikus);
  if (!spesies) {
    return { ok: false, error: `Nama tikus "${b.nama_tikus ?? ''}" tidak dikenali (RT, RN, MM, atau Lainnya)` };
  }

  const lokasi = String(b.lokasi ?? '').replace(/\s+/g, ' ').trim();
  if (!lokasi) return { ok: false, error: 'Lokasi pemasangan wajib diisi' };
  if (lokasi.length > 120) return { ok: false, error: 'Lokasi pemasangan terlalu panjang (maks 120 karakter)' };

  const hasil: Record<'leptospira' | 'pes' | 'hantavirus', HasilLab | null> = {
    leptospira: null, pes: null, hantavirus: null,
  };
  for (const kunci of ['leptospira', 'pes', 'hantavirus'] as const) {
    const r = bacaHasilLab(b[kunci]);
    if (!r.ok) return { ok: false, error: `Hasil ${kunci} "${b[kunci]}" tidak dikenali (Positif atau Negatif)` };
    hasil[kunci] = r.nilai;
  }
  if (!hasil.leptospira && !hasil.pes && !hasil.hantavirus) {
    return { ok: false, error: 'Isi minimal satu hasil pemeriksaan (Leptospira, Pes, atau Hantavirus)' };
  }

  return {
    ok: true,
    ambigu: k.ambigu,
    data: {
      tgl_periksa: k.data.tanggal,
      kode_wilker: k.data.kode,
      nama_tikus: spesies,
      lokasi_pemasangan: lokasi,
      kode_sampel: teksOpsional(b.kode_sampel, 40),
      hasil_leptospira: hasil.leptospira,
      hasil_pes: hasil.pes,
      hasil_hantavirus: hasil.hantavirus,
      keterangan: teksOpsional(b.keterangan, 500),
    },
  };
}