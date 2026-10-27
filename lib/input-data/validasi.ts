// lib/input-data/validasi.ts
// Validasi satu baris menurut konfigurasi modul. MURNI. Dipakai unggah Excel dan form.
import type { ModulInput, KolomModul } from './modul';
import { wilayahTersimpan } from './modul';
import { teksKosong, ubahBilangan, ubahRba, ubahTanggal, ubahTeks, ubahWilker } from './nilai';

export type NilaiBaris = Record<string, string | number | null>;

export interface HasilBaris {
  nilai: NilaiBaris | null;
  /** Kalimat galat per kolom, mis. "Tanggal Kedatangan: wajib diisi". Kosong bila baris sah. */
  galat: string[];
}

function ubah(k: KolomModul, v: unknown, modul: ModulInput): { ok: true; nilai: string | number | null } | { ok: false; galat: string } {
  switch (k.tipe) {
    case 'teks': return ubahTeks(v);
    case 'bilangan': return ubahBilangan(v);
    case 'tanggal': return ubahTanggal(v);
    case 'rba': return ubahRba(v);
    case 'wilker': {
      const r = ubahWilker(v);
      if (!r.ok) return r;
      if (r.nilai === null) return { ok: true, nilai: null };
      if (!modul.wilayahBoleh.includes(r.nilai)) return { ok: false, galat: 'wilayah kerja tidak berlaku untuk modul ini' };
      return { ok: true, nilai: wilayahTersimpan(r.nilai) };
    }
  }
}

/** mentah: kunci = nama kolom tabel, nilai = isi sel/field apa adanya. Kolom yang tidak ada = dianggap kosong. */
export function validasiBaris(modul: ModulInput, mentah: Record<string, unknown>, tahun?: number): HasilBaris {
  const galat: string[] = [];
  const nilai: NilaiBaris = {};
  for (const k of modul.kolom) {
    const v = mentah[k.nama];
    if (k.wajib && teksKosong(v)) {
      galat.push(`${k.label}: wajib diisi`);
      continue;
    }
    const r = ubah(k, v, modul);
    if (!r.ok) galat.push(`${k.label}: ${r.galat}`);
    else nilai[k.nama] = r.nilai;
  }
  if (!galat.length && tahun !== undefined) {
    const tgl = nilai[modul.kolomTanggal];
    if (typeof tgl === 'string' && Number(tgl.slice(0, 4)) !== tahun) {
      const lbl = modul.kolom.find((c) => c.nama === modul.kolomTanggal)?.label ?? modul.kolomTanggal;
      galat.push(`${lbl}: di luar tahun ${tahun}`);
    }
  }
  return galat.length ? { nilai: null, galat } : { nilai, galat: [] };
}

/** Kunci unik yang dipakai tabel (bila ada) untuk mendeteksi duplikat di dalam berkas. */
export function kunciDuplikat(modulKunci: string, n: NilaiBaris): string | null {
  if (modulKunci !== 'cop') return null; // kegiatan_cop punya UNIQUE (wilayah_kerja, nama_kapal, tgl_kedatangan)
  if (n.wilayah_kerja == null || n.nama_kapal == null || n.tgl_kedatangan == null) return null; // NULL tidak bentrok
  return JSON.stringify([n.wilayah_kerja, String(n.nama_kapal).toLowerCase(), n.tgl_kedatangan]);
}
