// lib/vektor/dbd/validasi.ts
import { parseTanggal, type UrutanTanggal } from '@/lib/tanggal/parse-tanggal';
import type { KamusWilker } from '@/lib/wilayah-kerja';
import { parseAngka } from '@/lib/vektor/umum';
import { bacaZona, hitungIndeks, LITER_KE_DB, type Zona } from './config';

type Baris = Record<string, unknown>;
type Hasil<T> = { ok: true; data: T; ambigu?: boolean } | { ok: false; error: string };

export interface OpsiBaca {
  wk: KamusWilker;
  urutanAmbigu?: UrutanTanggal;
}

export interface KunciSurvei {
  tgl_survei: string;
  kode_wilker: string;
  zona: Zona;
  sub_lokasi: string | null;
}

export interface DataSurvei extends KunciSurvei {
  jml_rumah_diperiksa: number;
  jml_positif_jentik: number;
  container_diperiksa: number;
  container_positif: number;
  curah_hujan_mm: number | null;
  abj: number;
  hi: number;
  ci: number;
  bi: number;
}

export interface DataPengendalian {
  larvasida_gram: number | null;
  luas_wilayah_fogging_ha: number | null;
  jml_insektisida_fogging_ml: number | null;
}

// Judul kolom Excel (huruf kecil tanpa spasi/tanda baca) -> nama baku.
const HEADER: Record<string, string> = {
  tglsurvei: 'tanggal', tanggalsurvei: 'tanggal', tanggal: 'tanggal', tglkegiatan: 'tanggal', tanggalkegiatan: 'tanggal',
  kodewilker: 'wilayah', namawilker: 'wilayah', wilayahkerja: 'wilayah', wilayah: 'wilayah', wilker: 'wilayah',
  zona: 'zona', sublokasi: 'sub_lokasi',
  jmlrumahdiperiksa: 'rumah', jumlahrumahdiperiksa: 'rumah', rumahdiperiksa: 'rumah', rumah: 'rumah',
  jmlpositifjentik: 'rumah_positif', jumlahpositifjentik: 'rumah_positif', positifjentik: 'rumah_positif',
  rumahpositif: 'rumah_positif',
  containerdiperiksa: 'container', kontainerdiperiksa: 'container', container: 'container',
  containerpositif: 'container_positif', kontainerpositif: 'container_positif',
  curahhujanmm: 'hujan', curahhujan: 'hujan', hujan: 'hujan',
  tindakanpengendalian: 'tindakan', tindakan: 'tindakan',
  larvasida: 'larvasida', larvasidagram: 'larvasida',
  luaswilayahfogging: 'luas', luaswilayahfoggingha: 'luas', luasfogging: 'luas', luas: 'luas',
  jmlinsectisidafogging: 'insektisida', jmlinsektisidafogging: 'insektisida', jumlahinsektisidafogging: 'insektisida',
  jmlinsektisidafoggingml: 'insektisida', insektisida: 'insektisida',
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

export const kosong = (v: unknown) => v === '' || v === null || v === undefined;

function bulat(v: unknown, nama: string, wajib: boolean): { nilai: number | null } | { error: string } {
  if (kosong(v)) return wajib ? { error: `${nama} wajib diisi` } : { nilai: null };
  const n = parseAngka(v);
  if (n === null || !Number.isInteger(n) || n < 0 || n > 1_000_000) return { error: `${nama} harus bilangan bulat 0 atau lebih` };
  return { nilai: n };
}

function desimal(v: unknown, nama: string, maks: number): { nilai: number | null } | { error: string } {
  if (kosong(v)) return { nilai: null };
  const n = parseAngka(v);
  if (n === null || n < 0 || n > maks) return { error: `${nama} harus berupa angka antara 0 dan ${maks}` };
  return { nilai: n };
}

function bacaSubLokasi(v: unknown): string | null {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!s || /^(buffer|perimeter)$/i.test(s)) return null;
  return s;
}

/** Tanggal + wilayah + zona (kunci pencocokan survei). */
export function bacaKunci(b: Baris, o: OpsiBaca): Hasil<KunciSurvei> {
  const t = parseTanggal(b.tanggal, { urutanAmbigu: o.urutanAmbigu });
  if (!t.iso) return { ok: false, error: `Tanggal survei: ${t.pesan ?? 'tidak terbaca'}` };
  if (t.masaDepan) return { ok: false, error: `Tanggal ${t.iso} ada di masa depan` };

  const kode = o.wk.kodeDariTeks(String(b.wilayah ?? ''));
  if (!kode) return { ok: false, error: `Wilayah kerja "${b.wilayah ?? ''}" tidak dikenali` };

  const zona = bacaZona(b.zona);
  if (!zona) return { ok: false, error: `Zona "${b.zona ?? ''}" tidak dikenali (Buffer atau Perimeter)` };

  return {
    ok: true,
    ambigu: t.ambigu,
    data: { tgl_survei: t.iso, kode_wilker: kode, zona, sub_lokasi: bacaSubLokasi(b.sub_lokasi) },
  };
}

export function validasiSurvei(b0: Baris, o: OpsiBaca): Hasil<DataSurvei> {
  const b = kanonik(b0);
  const k = bacaKunci(b, o);
  if (!k.ok) return k;

  const rumah = bulat(b.rumah, 'Jumlah rumah diperiksa', true);
  if ('error' in rumah) return { ok: false, error: rumah.error };
  const rPos = bulat(b.rumah_positif, 'Jumlah rumah positif jentik', true);
  if ('error' in rPos) return { ok: false, error: rPos.error };
  const cont = bulat(b.container, 'Jumlah container diperiksa', true);
  if ('error' in cont) return { ok: false, error: cont.error };
  const cPos = bulat(b.container_positif, 'Jumlah container positif', true);
  if ('error' in cPos) return { ok: false, error: cPos.error };
  const hujan = desimal(b.hujan, 'Curah hujan', 2000);
  if ('error' in hujan) return { ok: false, error: hujan.error };

  const nRumah = rumah.nilai as number;
  const nRumahPos = rPos.nilai as number;
  const nCont = cont.nilai as number;
  const nContPos = cPos.nilai as number;

  if (nRumah < 1) return { ok: false, error: 'Jumlah rumah diperiksa minimal 1' };
  if (nRumahPos > nRumah) {
    return { ok: false, error: `Rumah positif jentik (${nRumahPos}) melebihi rumah diperiksa (${nRumah})` };
  }
  if (nContPos > nCont) {
    return { ok: false, error: `Container positif (${nContPos}) melebihi container diperiksa (${nCont})` };
  }
  if (nContPos < nRumahPos) {
    return { ok: false, error: `Container positif (${nContPos}) tidak boleh kurang dari rumah positif jentik (${nRumahPos})` };
  }

  return {
    ok: true,
    ambigu: k.ambigu,
    data: {
      ...k.data, // sub_lokasi sudah dirapikan bacaKunci: null bila kosong atau hanya berisi nama zona
      jml_rumah_diperiksa: nRumah,
      jml_positif_jentik: nRumahPos,
      container_diperiksa: nCont,
      container_positif: nContPos,
      curah_hujan_mm: hujan.nilai,
      ...hitungIndeks(nRumah, nRumahPos, nCont, nContPos),
    },
  };
}

/** Isian pengendalian: minimal satu dari larvasida, luas fogging, atau insektisida fogging harus lebih dari 0. */
export function validasiPengendalian(b0: Baris): Hasil<DataPengendalian> {
  const b = kanonik(b0);
  const larv = desimal(b.larvasida, 'Larvasida', 1_000_000);
  if ('error' in larv) return { ok: false, error: larv.error };
  const luas = desimal(b.luas, 'Luas wilayah fogging', 1_000_000);
  if ('error' in luas) return { ok: false, error: luas.error };
  const ins = desimal(b.insektisida, 'Insektisida fogging', 1_000_000);
  if ('error' in ins) return { ok: false, error: ins.error };

  const ada = [larv.nilai, luas.nilai, ins.nilai].some((n) => n !== null && n > 0);
  if (!ada) return { ok: false, error: 'Isi minimal satu: larvasida, luas fogging, atau insektisida fogging (lebih dari 0)' };

  return {
    ok: true,
    data: {
      larvasida_gram: larv.nilai,
      luas_wilayah_fogging_ha: luas.nilai,
      jml_insektisida_fogging_ml: ins.nilai === null ? null : Math.round(ins.nilai * LITER_KE_DB * 10000) / 10000,
    },
  };
}

/** Templat pengendalian: kunci survei (tanggal, wilayah, zona) + isian pengendalian. */
export function validasiPengendalianBerKunci(
  b0: Baris,
  o: OpsiBaca
): Hasil<{ kunci: KunciSurvei; pengendalian: DataPengendalian }> {
  const b = kanonik(b0);
  const k = bacaKunci(b, o);
  if (!k.ok) return k;
  const p = validasiPengendalian(b);
  if (!p.ok) return p;
  return { ok: true, ambigu: k.ambigu, data: { kunci: k.data, pengendalian: p.data } };
}

/** Layout sheet (satu baris = survei + pengendalian bila ada). */
export function validasiGabungan(
  b0: Baris,
  o: OpsiBaca
): Hasil<{ survei: DataSurvei; pengendalian: DataPengendalian | null }> {
  const b = kanonik(b0);
  const s = validasiSurvei(b, o);
  if (!s.ok) return s;

  const angka = (v: unknown) => parseAngka(v) ?? 0;
  const adaIsian = angka(b.larvasida) > 0 || angka(b.luas) > 0 || angka(b.insektisida) > 0;
  const flagYa = String(b.tindakan ?? '').trim().toLowerCase() === 'ya';

  if (!adaIsian) {
    if (flagYa) {
      return { ok: false, error: 'Tindakan pengendalian "Ya" tetapi larvasida dan fogging kosong' };
    }
    return { ok: true, ambigu: s.ambigu, data: { survei: s.data, pengendalian: null } };
  }
  const p = validasiPengendalian(b);
  if (!p.ok) return p;
  return { ok: true, ambigu: s.ambigu, data: { survei: s.data, pengendalian: p.data } };
}

export const adaIsianPengendalian = (b0: Baris) => {
  const b = kanonik(b0);
  const n = (v: unknown) => parseAngka(v) ?? 0;
  return n(b.larvasida) > 0 || n(b.luas) > 0 || n(b.insektisida) > 0;
};