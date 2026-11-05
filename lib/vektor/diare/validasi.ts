// lib/vektor/diare/validasi.ts
import { parseTanggal, type UrutanTanggal } from '@/lib/tanggal/parse-tanggal';
import { type Jenis, LABEL_JENIS, hitungStatus, parseAngka, petakanWilayah } from './config';

type Baris = Record<string, unknown>;
type Hasil<T> = { ok: true; data: T; ambigu?: boolean } | { ok: false; error: string };

export interface KunciSurvei {
  tgl_kegiatan: string; // YYYY-MM-DD
  kode_wilker: string;
  jenis_kegiatan: Jenis;
  lokasi: string;
}
export interface DataSurvei extends KunciSurvei {
  nilai: number;
  hasil_pengamatan: string;
  keterangan: string | null;
}
export interface DataTindakan {
  tindakan_pengendalian: string;
  insektisida_terpakai_ml: number | null;
  luas_area_semprot_m2: number | null;
}
export interface OpsiBaca {
  /** Paksa jenis sesuai halaman (Lalat/Kecoa); baris jenis lain ditolak. */
  jenis?: Jenis;
  /** Hasil tentukanUrutanKolom() untuk file unggahan. */
  urutanAmbigu?: UrutanTanggal;
}

// Header Excel (dinormalkan: huruf kecil tanpa spasi/tanda baca) -> nama baku
const PETA_HEADER: Record<string, string> = {
  tanggal: 'tanggal', tanggalkegiatan: 'tanggal', tglkegiatan: 'tanggal',
  wilayahkerja: 'wilayah', wilayah: 'wilayah', wilker: 'wilayah', kodewilker: 'wilayah',
  jeniskegiatan: 'jenis', jenis: 'jenis',
  lokasi: 'lokasi',
  nilaihasilpengamatan: 'nilai', nilai: 'nilai',
  tindakanpengendalian: 'tindakan', tindakan: 'tindakan',
  insektisidaterpakaidalamml: 'insektisida', insektisidaterpakaiml: 'insektisida', insektisida: 'insektisida',
  luasareapenyemprotanm2: 'luas', luasareasemprotm2: 'luas', luasarea: 'luas', luas: 'luas',
  keterangan: 'keterangan',
};

export function kanonikBaris(baris: Baris): Baris {
  const out: Baris = {};
  for (const [h, v] of Object.entries(baris)) {
    const k = PETA_HEADER[h.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (k && out[k] === undefined) out[k] = v;
  }
  return out;
}

function bacaJenis(v: unknown, paksa?: Jenis): { jenis: Jenis } | { error: string } {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return paksa ? { jenis: paksa } : { error: 'Jenis kegiatan wajib diisi (Lalat atau Kecoa)' };
  const dibaca: Jenis | null = s.includes('lalat') ? 'lalat' : s.includes('kecoa') ? 'kecoa' : null;
  if (!dibaca) return { error: `Jenis kegiatan "${v}" tidak dikenali (Lalat atau Kecoa)` };
  if (paksa && dibaca !== paksa) return { error: `Baris ${LABEL_JENIS[dibaca]} tidak boleh masuk halaman ${LABEL_JENIS[paksa]}` };
  return { jenis: dibaca };
}

export function bacaKunci(b: Baris, o: OpsiBaca = {}): Hasil<KunciSurvei> {
  const t = parseTanggal(b.tanggal, { urutanAmbigu: o.urutanAmbigu });
  if (!t.iso) return { ok: false, error: `Tanggal: ${t.pesan ?? 'tidak terbaca'}` };
  if (t.masaDepan) return { ok: false, error: `Tanggal ${t.iso} ada di masa depan` };

  const kode = petakanWilayah(String(b.wilayah ?? ''));
  if (!kode) return { ok: false, error: `Wilayah kerja "${b.wilayah ?? ''}" tidak dikenali` };

  const j = bacaJenis(b.jenis, o.jenis);
  if ('error' in j) return { ok: false, error: j.error };

  const lokasi = String(b.lokasi ?? '').replace(/\s+/g, ' ').trim();
  if (!lokasi) return { ok: false, error: 'Lokasi wajib diisi' };
  if (lokasi.length > 120) return { ok: false, error: 'Lokasi terlalu panjang (maks 120 karakter)' };

  return {
    ok: true,
    ambigu: t.ambigu,
    data: { tgl_kegiatan: t.iso, kode_wilker: kode, jenis_kegiatan: j.jenis, lokasi },
  };
}

export function validasiSurvei(b0: Baris, o: OpsiBaca = {}): Hasil<DataSurvei> {
  const b = kanonikBaris(b0);
  const k = bacaKunci(b, o);
  if (!k.ok) return k;

  const nilai = parseAngka(b.nilai);
  if (nilai === null) return { ok: false, error: 'Nilai hasil pengamatan wajib diisi (angka)' };
  if (nilai < 0 || nilai > 1000) return { ok: false, error: 'Nilai hasil pengamatan di luar rentang wajar (0-1000)' };

  const ket = String(b.keterangan ?? '').trim();
  return {
    ok: true,
    ambigu: k.ambigu,
    data: { ...k.data, nilai, hasil_pengamatan: hitungStatus(nilai), keterangan: ket || null },
  };
}

export function validasiTindakan(b0: Baris): Hasil<DataTindakan> {
  const b = kanonikBaris(b0);
  const tindakan = String(b.tindakan ?? '').replace(/\s+/g, ' ').trim();
  if (!tindakan) return { ok: false, error: 'Tindakan pengendalian wajib diisi' };

  const ins = parseAngka(b.insektisida);
  const luas = parseAngka(b.luas);
  if ((ins !== null && ins < 0) || (luas !== null && luas < 0)) {
    return { ok: false, error: 'Insektisida dan luas area tidak boleh negatif' };
  }
  return {
    ok: true,
    data: { tindakan_pengendalian: tindakan, insektisida_terpakai_ml: ins, luas_area_semprot_m2: luas },
  };
}

/** Templat tindakan: kunci survei (tanggal, wilayah, jenis, lokasi) + isian tindakan. */
export function validasiTindakanBerKunci(
  b0: Baris,
  o: OpsiBaca = {}
): Hasil<{ kunci: KunciSurvei; tindakan: DataTindakan }> {
  const b = kanonikBaris(b0);
  const k = bacaKunci(b, o);
  if (!k.ok) return k;
  const t = validasiTindakan(b);
  if (!t.ok) return t;
  return { ok: true, ambigu: k.ambigu, data: { kunci: k.data, tindakan: t.data } };
}

/** Layout sheet lama (satu baris = survei + tindakan opsional), seperti di screenshot. */
export function validasiBarisGabungan(
  b0: Baris,
  o: OpsiBaca = {}
): Hasil<{ survei: DataSurvei; tindakan: DataTindakan | null }> {
  const b = kanonikBaris(b0);
  const s = validasiSurvei(b, o);
  if (!s.ok) return s;

  const adaTindakan =
    String(b.tindakan ?? '').trim() !== '' || parseAngka(b.insektisida) !== null || parseAngka(b.luas) !== null;
  if (!adaTindakan) return { ok: true, ambigu: s.ambigu, data: { survei: s.data, tindakan: null } };

  const t = validasiTindakan(b);
  if (!t.ok) return t;
  return { ok: true, ambigu: s.ambigu, data: { survei: s.data, tindakan: t.data } };
}