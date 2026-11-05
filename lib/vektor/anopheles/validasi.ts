// lib/vektor/anopheles/validasi.ts
import { parseTanggal, type UrutanTanggal } from '@/lib/tanggal/parse-tanggal';
import { parseAngka, petakanWilayah } from '@/lib/vektor/umum';
import {
  bacaFaseBulan,
  bacaZona,
  CUACA,
  KEADAAN_TEMPAT,
  MACAM_TEMPAT,
  METODE_TANGKAP,
  samakan,
  type Zona,
} from './config';

type Baris = Record<string, unknown>;
type Hasil<T> = { ok: true; data: T; ambigu?: boolean } | { ok: false; error: string };
export interface OpsiBaca { urutanAmbigu?: UrutanTanggal }

export interface DataUmum {
  tgl_survei: string;
  kode_wilker: string;
  zona: Zona;
  sub_lokasi: string | null;
  fase_bulan: string | null;
  suhu_c: number | null;
  kelembapan_pct: number | null;
  cuaca: string | null;
}
export interface DataLarva extends DataUmum {
  jumlah_cidukan: number;
  jumlah_larva: number;
  jumlah_jenis_larva: number | null;
  spesies_larva: string | null;
  macam_tempat_perindukan: string;
  keadaan_tempat_perindukan: string | null;
}
export interface DataDewasa extends DataUmum {
  metode_tangkap: string;
  jml_nyamuk: number;
  jml_jam_tangkap: number;
  mbr: number | null;
  mhd: number | null;
  spesies: string | null;
}

// Judul kolom Excel (huruf kecil tanpa spasi/tanda baca) -> nama baku.
// Nama baku yang dipakai form juga dikenali apa adanya.
const HEADER: Record<string, string> = {
  tglsurvei: 'tanggal', tanggalsurvei: 'tanggal', tanggal: 'tanggal', tglkegiatan: 'tanggal', tanggalkegiatan: 'tanggal',
  kodewilker: 'wilayah', namawilker: 'wilayah', wilayahkerja: 'wilayah', wilayah: 'wilayah', wilker: 'wilayah',
  zona: 'zona', zonasurvei: 'zona',
  sublokasi: 'sub_lokasi', lokasi: 'sub_lokasi', lokasisurvei: 'sub_lokasi', namalokasi: 'sub_lokasi',
  fasebulan: 'fase_bulan', suhuc: 'suhu', suhu: 'suhu',
  kelembapanpct: 'kelembapan', kelembapan: 'kelembapan', cuaca: 'cuaca',
  // larva
  jumlahcidukan: 'cidukan', cidukan: 'cidukan', jumlahlarva: 'larva', larva: 'larva',
  jumlahjenislarva: 'jenis_larva', jenislarva: 'jenis_larva', spesieslarva: 'spesies_larva',
  macamtempatperindukan: 'macam', macamtempat: 'macam', macam: 'macam',
  keadaantempatperindukan: 'keadaan', keadaantempat: 'keadaan', keadaan: 'keadaan',
  // dewasa
  metodetangkap: 'metode', metode: 'metode',
  jmlnyamuk: 'nyamuk', jumlahnyamuk: 'nyamuk', nyamuk: 'nyamuk',
  jmljamtangkap: 'jam', jumlahjamtangkap: 'jam', jam: 'jam',
  mbr: 'mbr', mhd: 'mhd', spesies: 'spesies',
};

/** Kolom pertama yang terisi menang (Kode_Wilker dibaca sebelum Nama_Wilker). */
export function kanonik(baris: Baris): Baris {
  const out: Baris = {};
  for (const [h, v] of Object.entries(baris)) {
    const k = HEADER[h.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (k && (out[k] === undefined || out[k] === '')) out[k] = v;
  }
  return out;
}

const kosong = (v: unknown) => v === '' || v === null || v === undefined;

/** Untuk unggahan sheet gabungan: apakah baris ini memuat data larva / data dewasa? */
export const adaDataLarva = (b0: Baris) => {
  const b = kanonik(b0);
  return !kosong(b.cidukan) || !kosong(b.larva) || !kosong(b.macam);
};
export const adaDataDewasa = (b0: Baris) => {
  const b = kanonik(b0);
  return !kosong(b.metode) || !kosong(b.nyamuk) || !kosong(b.jam);
};

/** Teks bebas; `abaikanNol` menganggap "0" dan "-" sebagai kosong (kebiasaan di sheet). */
function teks(v: unknown, maks: number, abaikanNol = false): string | null {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (!s || (abaikanNol && (s === '0' || s === '-'))) return null;
  return s.slice(0, maks);
}

function bulat(v: unknown, nama: string, min: number, wajib: boolean): { nilai: number | null } | { error: string } {
  if (kosong(v)) return wajib ? { error: `${nama} wajib diisi` } : { nilai: null };
  const n = parseAngka(v);
  if (n === null || !Number.isInteger(n) || n < min || n > 1_000_000) {
    return { error: `${nama} harus bilangan bulat minimal ${min}` };
  }
  return { nilai: n };
}

function desimal(
  v: unknown, nama: string, min: number, maks: number, wajib: boolean
): { nilai: number | null } | { error: string } {
  if (kosong(v)) return wajib ? { error: `${nama} wajib diisi` } : { nilai: null };
  const n = parseAngka(v);
  if (n === null || n < min || n > maks) return { error: `${nama} harus berupa angka antara ${min} dan ${maks}` };
  return { nilai: n };
}

function bacaUmum(b: Baris, o: OpsiBaca): Hasil<DataUmum> {
  const t = parseTanggal(b.tanggal, { urutanAmbigu: o.urutanAmbigu });
  if (!t.iso) return { ok: false, error: `Tanggal survei: ${t.pesan ?? 'tidak terbaca'}` };
  if (t.masaDepan) return { ok: false, error: `Tanggal ${t.iso} ada di masa depan` };

  const kode = petakanWilayah(String(b.wilayah ?? ''));
  if (!kode) return { ok: false, error: `Wilayah kerja "${b.wilayah ?? ''}" tidak dikenali` };

  const zona = bacaZona(b.zona);
  if (!zona) return { ok: false, error: `Zona "${b.zona ?? ''}" tidak dikenali (Buffer atau Perimeter)` };

  const suhu = desimal(b.suhu, 'Suhu', -5, 60, false);
  if ('error' in suhu) return { ok: false, error: suhu.error };
  const lembap = desimal(b.kelembapan, 'Kelembapan', 0, 100, false);
  if ('error' in lembap) return { ok: false, error: lembap.error };

  const fase = bacaFaseBulan(b.fase_bulan);
  if ('error' in fase) return { ok: false, error: fase.error };

  return {
    ok: true,
    ambigu: t.ambigu,
    data: {
      tgl_survei: t.iso,
      kode_wilker: kode,
      zona,
      sub_lokasi: teks(b.sub_lokasi, 120),
      fase_bulan: fase.nilai,
      suhu_c: suhu.nilai,
      kelembapan_pct: lembap.nilai,
      cuaca: samakan(teks(b.cuaca, 60), CUACA),
    },
  };
}

export function validasiLarva(b0: Baris, o: OpsiBaca = {}): Hasil<DataLarva> {
  const b = kanonik(b0);
  const u = bacaUmum(b, o);
  if (!u.ok) return u;

  const cid = bulat(b.cidukan, 'Jumlah cidukan', 1, true);
  if ('error' in cid) return { ok: false, error: cid.error };
  const lar = bulat(b.larva, 'Jumlah larva', 0, true);
  if ('error' in lar) return { ok: false, error: lar.error };
  const jenisIn = bulat(b.jenis_larva, 'Jumlah jenis larva', 0, false);
  if ('error' in jenisIn) return { ok: false, error: jenisIn.error };

  const jumlahLarva = lar.nilai as number;
  const jenis = jenisIn.nilai ?? (jumlahLarva === 0 ? 0 : null);
  if (jenis !== null && jenis > jumlahLarva) {
    return { ok: false, error: `Jumlah jenis larva (${jenis}) tidak boleh melebihi jumlah larva (${jumlahLarva})` };
  }

  const macam = samakan(teks(b.macam, 120), MACAM_TEMPAT);
  if (!macam) return { ok: false, error: 'Macam tempat perindukan wajib diisi' };
  const keadaan = samakan(teks(b.keadaan, 120), KEADAAN_TEMPAT);
  if (!keadaan) return { ok: false, error: 'Keadaan tempat perindukan wajib diisi' };

  return {
    ok: true,
    ambigu: u.ambigu,
    data: {
      ...u.data,
      jumlah_cidukan: cid.nilai as number,
      jumlah_larva: jumlahLarva,
      jumlah_jenis_larva: jenis,
      spesies_larva: jumlahLarva === 0 ? null : teks(b.spesies_larva, 120, true),
      macam_tempat_perindukan: macam,
      keadaan_tempat_perindukan: keadaan,
    },
  };
}

export function validasiDewasa(b0: Baris, o: OpsiBaca = {}): Hasil<DataDewasa> {
  const b = kanonik(b0);
  const u = bacaUmum(b, o);
  if (!u.ok) return u;

  const metode = samakan(teks(b.metode, 60), METODE_TANGKAP);
  if (!metode) return { ok: false, error: 'Metode tangkap wajib diisi' };

  const nyamuk = bulat(b.nyamuk, 'Jumlah nyamuk', 0, true);
  if ('error' in nyamuk) return { ok: false, error: nyamuk.error };
  const jam = desimal(b.jam, 'Jumlah jam tangkap', 0, 48, true);
  if ('error' in jam) return { ok: false, error: jam.error };
  if (!((jam.nilai as number) > 0)) return { ok: false, error: 'Jumlah jam tangkap harus lebih dari 0' };

  const mbr = desimal(b.mbr, 'MBR', 0, 100000, false);
  if ('error' in mbr) return { ok: false, error: mbr.error };
  const mhd = desimal(b.mhd, 'MHD', 0, 100000, false);
  if ('error' in mhd) return { ok: false, error: mhd.error };

  return {
    ok: true,
    ambigu: u.ambigu,
    data: {
      ...u.data,
      metode_tangkap: metode,
      jml_nyamuk: nyamuk.nilai as number,
      jml_jam_tangkap: jam.nilai as number,
      mbr: mbr.nilai,
      mhd: mhd.nilai,
      spesies: teks(b.spesies, 120, true),
    },
  };
}