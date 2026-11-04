// lib/klinik/ckg/validasi.ts
// Dipakai bersama oleh form input dan unggah Excel.
import { KODE_WILAYAH, hitungIMT } from './config';
import { parseTanggalCkg, keIsoTanggal } from './tanggalCkg';

export type BarisCkg = {
  tanggal_periksa: string;
  wilayah: string;
  nama: string;
  jenis_kelamin: 'L' | 'P';
  umur: number;
  bb: number | null;
  tb: number | null;
  imt: number | null;
  sistolik: number | null;
  diastolik: number | null;
  gula_darah: number | null;
  merokok: 0 | 1;
};

type Hasil = { ok: true; data: BarisCkg } | { ok: false; error: string };

// '' / null -> null, tidak terbaca -> NaN
const angka = (v: unknown): number | null => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const dalam = (v: number | null, min: number, max: number) =>
  v == null || (!Number.isNaN(v) && v >= min && v <= max);

export function validasiBaris(
  raw: Record<string, any>,
  o: { wilayah: string }
): Hasil {
  if (!KODE_WILAYAH.includes(o.wilayah)) return { ok: false, error: 'Wilayah kerja tidak dikenal' };

  const nama = String(raw.nama ?? '').trim();
  if (!nama) return { ok: false, error: 'Nama kosong' };

  const tgl = parseTanggalCkg(raw.tanggal);
  if (!tgl) return { ok: false, error: 'Tanggal tidak terbaca' };
  if (tgl.getTime() > Date.now() + 2 * 86400000) return { ok: false, error: 'Tanggal di masa depan' };

  const jkRaw = String(raw.jenis_kelamin ?? '').trim().toLowerCase();
  const jk = /^(l|laki|pria)/.test(jkRaw) ? 'L' : /^(p|perempuan|wanita)/.test(jkRaw) ? 'P' : null;
  if (!jk) return { ok: false, error: 'Jenis kelamin harus L/P' };

  const umur = angka(raw.umur);
  if (umur == null || !Number.isInteger(umur) || umur < 0 || umur > 120)
    return { ok: false, error: 'Umur harus angka bulat 0-120' };

  let sistolik = angka(raw.sistolik);
  let diastolik = angka(raw.diastolik);
  // register kadang menulis tekanan darah gabungan, mis. "154/94"
  if (typeof raw.tekanan_darah === 'string' && raw.tekanan_darah.includes('/')) {
    const [s, d] = raw.tekanan_darah.split('/');
    sistolik = angka(s);
    diastolik = angka(d);
  }

  const bb = angka(raw.bb);
  const tb = angka(raw.tb);
  const gula = angka(raw.gula_darah);

  if (!dalam(bb, 1, 400)) return { ok: false, error: 'BB di luar rentang (1-400 kg)' };
  if (!dalam(tb, 30, 250)) return { ok: false, error: 'TB di luar rentang (30-250 cm)' };
  if (!dalam(sistolik, 50, 300)) return { ok: false, error: 'Sistolik di luar rentang (50-300)' };
  if (!dalam(diastolik, 30, 200)) return { ok: false, error: 'Diastolik di luar rentang (30-200)' };
  if (!dalam(gula, 20, 1000)) return { ok: false, error: 'Gula darah di luar rentang (20-1000)' };

  const merokok = /^(1|y|ya|true|merokok)$/i.test(String(raw.merokok ?? '').trim()) ? 1 : 0;

  return {
    ok: true,
    data: {
      tanggal_periksa: keIsoTanggal(tgl),
      wilayah: o.wilayah,
      nama,
      jenis_kelamin: jk,
      umur,
      bb,
      tb,
      imt: bb && tb ? hitungIMT(bb, tb) : null,
      sistolik,
      diastolik,
      gula_darah: gula,
      merokok,
    },
  };
}