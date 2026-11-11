// lib/input-data/validasi.ts
// Validasi satu baris menurut konfigurasi modul. MURNI. Dipakai unggah Excel dan form.
// Perubahan dari versi sebelumnya: (1) wilayahTersimpan memakai modul.wilayahDenganSpasi, (2) tipe kolom 'ya_tidak'.
import type { ModulInput, KolomModul } from './modul';
import { wilayahBolehModul, wilayahTersimpan } from './modul';
import type { KamusWilker } from '@/lib/wilayah-kerja';
import { rentangTanggalLahir, teksKosong, ubahBilangan, ubahDesimal, ubahRba, ubahTanggal, ubahTanggalWaktu, ubahTeks, ubahWaktu, ubahWilker } from './nilai';
import { ubahYaTidak } from './nilai-pemeriksaan';

export type NilaiBaris = Record<string, string | number | null>;

export interface HasilBaris {
  nilai: NilaiBaris | null;
  /** Kalimat galat per kolom, mis. "Tanggal Kedatangan: wajib diisi". Kosong bila baris sah. */
  galat: string[];
}

function ubah(k: KolomModul, v: unknown, modul: ModulInput, kamus: KamusWilker): { ok: true; nilai: string | number | null } | { ok: false; galat: string } {
  switch (k.tipe) {
    case 'teks': {
      const r = ubahTeks(v, k.maks ?? 255);
      return r.ok && r.nilai !== null && k.tanpaSpasi ? { ok: true, nilai: r.nilai.replace(/\s+/g, '') } : r;
    }
    case 'desimal': return ubahDesimal(v);
    case 'tanggalwaktu': return ubahTanggalWaktu(v);
    case 'waktu': return ubahWaktu(v);
    case 'bilangan': return ubahBilangan(v);
    case 'tanggal': return ubahTanggal(v, k.tanggalLahir ? rentangTanggalLahir() : undefined);
    case 'rba': return ubahRba(v);
    case 'ya_tidak': return ubahYaTidak(v);
    case 'wilker': {
      const r = ubahWilker(v, kamus);
      if (!r.ok) return r;
      if (r.nilai === null) return { ok: true, nilai: null };
      if (!wilayahBolehModul(modul, kamus).some((w) => w.kode === r.nilai)) return { ok: false, galat: 'wilayah kerja tidak berlaku untuk modul ini' };
      return { ok: true, nilai: wilayahTersimpan(r.nilai, kamus, modul.wilayahDenganSpasi) };
    }
  }
}

/** mentah: kunci = nama kolom tabel, nilai = isi sel/field apa adanya. Kolom yang tidak ada = dianggap kosong. */
export function validasiBaris(modul: ModulInput, mentah: Record<string, unknown>, kamus: KamusWilker, tahun?: number): HasilBaris {
  const galat: string[] = [];
  const nilai: NilaiBaris = {};
  for (const k of modul.kolom) {
    if (k.turunan) continue; // dihitung setelah semua kolom lain
    const v = mentah[k.nama];
    if (k.wajib && teksKosong(v)) {
      galat.push(`${k.label}: wajib diisi`);
      continue;
    }
    const r = ubah(k, v, modul, kamus);
    if (!r.ok) { galat.push(`${k.label}: ${r.galat}`); continue; }
    // Rentang wajar (mis. HCHO 191 ppm hampir pasti satuan µg/m³): tolak agar tidak masuk dan merusak rata-rata/status.
    if (k.batasNilai && r.nilai !== null && Number.isFinite(Number(r.nilai))) {
      const n = Number(r.nilai);
      if (n < k.batasNilai[0] || n > k.batasNilai[1]) {
        galat.push(`${k.label}: ${n} di luar rentang wajar ${k.batasNilai[0]}–${k.batasNilai[1]} (periksa satuan atau salah ketik)`);
        continue;
      }
    }
    nilai[k.nama] = r.nilai;
  }
  if (!galat.length) for (const k of modul.kolom) if (k.turunan) nilai[k.nama] = k.turunan(nilai);
  if (!galat.length && tahun !== undefined) {
    const tgl = nilai[modul.kolomTanggal];
    if (typeof tgl === 'string' && Number(tgl.slice(0, 4)) !== tahun) {
      const lbl = modul.kolom.find((c) => c.nama === modul.kolomTanggal)?.label ?? modul.kolomTanggal;
      galat.push(`${lbl}: di luar tahun ${tahun}`);
    }
  }
  return galat.length ? { nilai: null, galat } : { nilai, galat: [] };
}

/** Kunci pencocokan baris untuk "tambah atau perbarui": (wilayah, nama kapal, tanggal). Null bila ada bagian kosong
 *  (baris seperti itu selalu dianggap baru). Dipakai juga untuk mendeteksi duplikat di dalam satu berkas. */
export function kunciBaris(modul: ModulInput, n: NilaiBaris): string | null {
  const w = n[modul.kolomWilayah];
  const k = n[modul.kolomKunci];
  const t = n[modul.kolomTanggal];
  if (w == null || k == null || t == null) return null;
  // Kolom pembeda tambahan (mis. nomor barcode/QR) agar dua dokumen kapal yang sama di hari yang sama tidak saling menimpa.
  const tambahan = (modul.kolomKunciTambahan ?? []).map((c) => String(n[c] ?? '').toLowerCase().replace(/\s+/g, ' ').trim());
  return JSON.stringify([String(w).toLowerCase().replace(/\s+/g, ''), String(k).toLowerCase().replace(/\s+/g, ' ').trim(), String(t), ...tambahan]);
}
