// lib/vektor/impor.ts
//
// Logika murni (tanpa database) untuk impor Excel/CSV dan validasi form data vektor.
// Dipakai di BROWSER (pratinjau sebelum simpan) dan di SERVER (validasi ulang sebelum INSERT),
// sehingga hasilnya selalu sama. Jangan percaya hasil dari browser: server memvalidasi lagi.

import { parseTanggal, tentukanUrutanKolom, type UrutanTanggal, type SimpulanUrutan } from '../tanggal/parse-tanggal';
import { kodeDariTeks } from '../wilayah-kerja';
import type { DefinisiVektor, KolomInput } from './skema-input';

// ---------------------------------------------------------------- header
/** Kunci pembanding header: huruf kecil, tanpa aksen/spasi/tanda baca. "Jml. Rumah" == "jml_rumah" == "JML RUMAH". */
export function normalisasiHeader(h: unknown): string {
  if (h === null || h === undefined) return '';
  return String(h)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[²]/g, '2')
    .replace(/[^a-z0-9+\-]+/g, '')
    .replace(/^[-+]+$/, '');
}

function peta(def: DefinisiVektor): Map<string, string> {
  const m = new Map<string, string>();
  // kunci & label dulu (prioritas), baru alias
  for (const k of def.kolom) { m.set(normalisasiHeader(k.kunci), k.kunci); m.set(normalisasiHeader(k.label), k.kunci); }
  for (const k of def.kolom) for (const a of k.alias ?? []) { const n = normalisasiHeader(a); if (n && !m.has(n)) m.set(n, k.kunci); }
  return m;
}

export interface Pemetaan {
  /** untuk setiap kolom Excel (urut): kunci kolom DB, atau null bila tidak dikenali/duplikat */
  indeksKeKunci: (string | null)[];
  terbaca: { indeks: number; header: string; kunci: string; label: string }[];
  tidakDikenal: string[];
  wajibHilang: KolomInput[];
}

export function petakanHeader(def: DefinisiVektor, header: unknown[]): Pemetaan {
  const m = peta(def);
  const sudah = new Set<string>();
  const indeksKeKunci: (string | null)[] = [];
  const terbaca: Pemetaan['terbaca'] = [];
  const tidakDikenal: string[] = [];
  header.forEach((h, indeks) => {
    const teks = h === null || h === undefined ? '' : String(h).trim();
    const kunci = m.get(normalisasiHeader(teks)) ?? null;
    if (teks && kunci && !sudah.has(kunci)) {
      sudah.add(kunci);
      indeksKeKunci.push(kunci);
      terbaca.push({ indeks, header: teks, kunci, label: def.kolom.find((k) => k.kunci === kunci)!.label });
    } else {
      indeksKeKunci.push(null);
      if (teks) tidakDikenal.push(teks);
    }
  });
  const wajibHilang = def.kolom.filter((k) => k.wajib && !sudah.has(k.kunci));
  return { indeksKeKunci, terbaca, tidakDikenal, wajibHilang };
}

/** Cari baris header di sheet (judul/keterangan di atas tabel sering ada). -1 bila tidak ketemu. */
export function cariBarisHeader(def: DefinisiVektor, aoa: unknown[][], maksBaris = 15): number {
  const m = peta(def);
  let terbaik = -1;
  let skor = 0;
  for (let i = 0; i < Math.min(aoa.length, maksBaris); i++) {
    const dikenal = new Set<string>();
    for (const sel of aoa[i] ?? []) {
      const k = m.get(normalisasiHeader(sel));
      if (k) dikenal.add(k);
    }
    if (dikenal.size > skor) { skor = dikenal.size; terbaik = i; }
  }
  return skor >= 2 ? terbaik : -1;
}

// ---------------------------------------------------------------- angka
/** Baca angka gaya Indonesia (1.234,5) maupun internasional (1,234.5). null bila bukan angka. */
export function parseAngka(raw: unknown, bulat = false): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const m = raw.trim().replace(/\s+/g, '').match(/^([-+]?[\d.,]+)[a-z%°²/]*$/i);
  if (!m) return null;
  let s = m[1].replace(/^\+/, '');
  const adaTitik = s.includes('.');
  const adaKoma = s.includes(',');
  if (adaTitik && adaKoma) {
    const desimalKoma = s.lastIndexOf(',') > s.lastIndexOf('.');
    s = desimalKoma ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (adaKoma) {
    s = bulat && /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (adaTitik) {
    const banyakTitik = (s.match(/\./g) ?? []).length;
    if (banyakTitik > 1) s = s.replace(/\./g, '');
    else if (bulat && /^-?\d{1,3}\.\d{3}$/.test(s)) s = s.replace('.', '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- baris
export type NilaiBaris = Record<string, string | number | null>;

export interface HasilBaris {
  nilai: NilaiBaris;
  galat: string[];
  peringatan: string[];
}

function kosong(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

export interface OpsiKonversi { urutanTanggal?: UrutanTanggal }

/** Validasi + normalisasi satu baris. `mentah` berkunci = `kunci` kolom DB. */
export function konversiBaris(def: DefinisiVektor, mentah: Record<string, unknown>, opsi: OpsiKonversi = {}): HasilBaris {
  const nilai: NilaiBaris = {};
  const galat: string[] = [];
  const peringatan: string[] = [];

  for (const k of def.kolom) {
    const raw = mentah[k.kunci];
    if (kosong(raw)) {
      if (k.wajib) galat.push(`${k.label}: wajib diisi`);
      nilai[k.kunci] = k.bawaan ?? null;
      continue;
    }

    switch (k.tipe) {
      case 'tanggal': {
        const r = parseTanggal(raw, { urutanAmbigu: opsi.urutanTanggal });
        if (!r.iso) { galat.push(`${k.label}: ${r.pesan ?? 'tidak valid'} ("${String(raw)}")`); nilai[k.kunci] = null; break; }
        nilai[k.kunci] = r.iso;
        if (r.ambigu) peringatan.push(`${k.label} "${String(raw)}" ${r.pesan ?? 'ambigu'} -> ${r.iso}`);
        if (r.masaDepan) peringatan.push(`${k.label} ${r.iso} ada di masa depan, periksa kembali`);
        break;
      }
      case 'wilker': {
        const kode = kodeDariTeks(String(raw));
        if (!kode) { galat.push(`${k.label}: "${String(raw)}" tidak dikenal`); nilai[k.kunci] = null; break; }
        nilai[k.kunci] = kode;
        break;
      }
      case 'pilihan': {
        const n = normalisasiHeader(raw);
        const cocok = (k.pilihan ?? []).find((p) => normalisasiHeader(p.nilai) === n || (p.alias ?? []).some((a) => normalisasiHeader(a) === n));
        if (!cocok) {
          galat.push(`${k.label}: "${String(raw)}" tidak valid (pilihan: ${(k.pilihan ?? []).map((p) => p.nilai).join(', ')})`);
          nilai[k.kunci] = null;
          break;
        }
        nilai[k.kunci] = cocok.nilai;
        break;
      }
      case 'bulat':
      case 'desimal': {
        const n = parseAngka(raw, k.tipe === 'bulat');
        if (n === null) { galat.push(`${k.label}: "${String(raw)}" bukan angka`); nilai[k.kunci] = null; break; }
        if (k.tipe === 'bulat' && !Number.isInteger(n)) { galat.push(`${k.label}: harus bilangan bulat (nilai "${String(raw)}")`); nilai[k.kunci] = null; break; }
        const min = k.min ?? 0;
        if (n < min || (k.maks !== undefined && n > k.maks)) {
          galat.push(`${k.label}: ${n} di luar batas (${min} - ${k.maks ?? '...'})`);
          nilai[k.kunci] = null;
          break;
        }
        nilai[k.kunci] = k.tipe === 'bulat' ? n : Number(n.toFixed(4));
        break;
      }
      case 'teks':
      case 'teks-panjang': {
        const t = String(raw).trim();
        const teks = k.tipe === 'teks' ? t.replace(/\s+/g, ' ') : t;
        if (k.maksPanjang && teks.length > k.maksPanjang) { galat.push(`${k.label}: terlalu panjang (${teks.length} > ${k.maksPanjang} karakter)`); nilai[k.kunci] = null; break; }
        nilai[k.kunci] = teks;
        break;
      }
    }
  }

  aturanSilang(def, nilai, galat, peringatan);
  return { nilai, galat, peringatan };
}

function angka(v: string | number | null | undefined): number | null {
  return typeof v === 'number' ? v : null;
}

function aturanSilang(def: DefinisiVektor, n: NilaiBaris, galat: string[], peringatan: string[]): void {
  if (def.jenis === 'aedes') {
    const rumah = angka(n.jml_rumah_diperiksa);
    const positif = angka(n.jml_positif_jentik);
    if (rumah !== null && positif !== null && positif > rumah) galat.push('Jumlah Positif Jentik tidak boleh lebih besar dari Jumlah Rumah/Bangunan Diperiksa');
    if (rumah === 0) peringatan.push('Jumlah rumah diperiksa = 0, HI/ABJ akan 0');
    const kd = angka(n.container_diperiksa);
    const kp = angka(n.container_positif);
    if (kd !== null && kp !== null && kp > kd) galat.push('Jumlah Kontainer Positif tidak boleh lebih besar dari Jumlah Kontainer Diperiksa');
    if (kp !== null && kd === null) peringatan.push('Kontainer positif diisi tetapi kontainer diperiksa kosong, CI tidak terhitung');
  }
  if (def.jenis === 'tikus') {
    const dipasang = angka(n.jml_trap_dipasang);
    const tangkap = angka(n.jml_trap_tertangkap);
    if (dipasang !== null && tangkap !== null && tangkap > dipasang) galat.push('Jumlah Trap Tertangkap tidak boleh lebih besar dari Jumlah Trap Dipasang');
    const spesies = ['rt', 'rn', 'mm', 'jenis_lainnya'].reduce((t, c) => t + (angka(n[c]) ?? 0), 0);
    if (tangkap !== null && spesies > tangkap) peringatan.push(`Jumlah per spesies (${spesies}) melebihi trap tertangkap (${tangkap})`);
    if (n.uji_lab === 'Tidak' && (n.hasil_leptospira || n.hasil_pes || n.hasil_hantavirus)) peringatan.push('Hasil uji laboratorium diisi padahal Uji Laboratorium = Tidak');
  }
  if (def.jenis === 'anopheles-dewasa') {
    const jam = angka(n.jml_jam_tangkap);
    if (jam !== null && jam <= 0) galat.push('Jam Penangkapan harus lebih dari 0');
  }
}

/** Teks penanda "baris yang sama" untuk mendeteksi duplikat di dalam file. */
export function kunciDuplikat(def: DefinisiVektor, n: NilaiBaris): string {
  const gabung: Record<string, unknown> = { ...n, ...def.nilaiTetap };
  return def.kunciDuplikat.map((c) => String(gabung[c] ?? '')).join('|');
}

// ---------------------------------------------------------------- satu lembar kerja
export interface BarisImpor {
  /** nomor baris di Excel (mulai 1), untuk laporan ke pengguna */
  nomor: number;
  mentah: Record<string, unknown>;
  nilai: NilaiBaris;
  galat: string[];
  peringatan: string[];
  /** duplikat dari baris lain di file yang sama -> tidak akan disimpan */
  duplikatDalamFile: boolean;
}

export interface HasilLembar {
  barisHeader: number;
  pemetaan: Pemetaan | null;
  urutan: SimpulanUrutan;
  /** urutan yang benar-benar dipakai ('dmy'/'mdy') */
  urutanDipakai: UrutanTanggal;
  baris: BarisImpor[];
  ringkasan: { total: number; siapSimpan: number; berGalat: number; berPeringatan: number; duplikat: number };
  /** pesan fatal (header tidak ditemukan, kolom wajib tidak ada) */
  masalah: string[];
}

export interface OpsiLembar {
  /** 'auto' = simpulkan dari isi kolom (bawaan), atau paksa 'dmy'/'mdy' */
  urutanTanggal?: UrutanTanggal | 'auto';
}

/** Proses satu sheet (array-of-array dari SheetJS `header:1`, nilai mentah). */
export function prosesLembarKerja(def: DefinisiVektor, aoa: unknown[][], opsi: OpsiLembar = {}): HasilLembar {
  const kosongUrutan: SimpulanUrutan = { urutan: null, buktiDmy: 0, buktiMdy: 0, bertentangan: false };
  const barisHeader = cariBarisHeader(def, aoa);
  if (barisHeader < 0) {
    return {
      barisHeader: -1, pemetaan: null, urutan: kosongUrutan, urutanDipakai: 'dmy', baris: [],
      ringkasan: { total: 0, siapSimpan: 0, berGalat: 0, berPeringatan: 0, duplikat: 0 },
      masalah: ['Baris judul kolom tidak ditemukan. Pastikan baris pertama berisi nama kolom (mis. Tanggal Survei, Wilayah Kerja). Gunakan tombol "Unduh Template Excel" sebagai contoh.'],
    };
  }

  const pemetaan = petakanHeader(def, aoa[barisHeader] ?? []);
  const masalah: string[] = [];
  if (pemetaan.wajibHilang.length) masalah.push(`Kolom wajib tidak ditemukan: ${pemetaan.wajibHilang.map((k) => k.label).join(', ')}`);

  // kumpulkan nilai mentah per baris
  const dataMentah: { nomor: number; mentah: Record<string, unknown> }[] = [];
  for (let i = barisHeader + 1; i < aoa.length; i++) {
    const sel = aoa[i] ?? [];
    if (sel.every(kosong)) continue;
    const mentah: Record<string, unknown> = {};
    pemetaan.indeksKeKunci.forEach((kunci, idx) => { if (kunci) mentah[kunci] = sel[idx]; });
    dataMentah.push({ nomor: i + 1, mentah });
  }

  // urutan tanggal: simpulkan dari seluruh isi kolom tanggal
  const nilaiTanggal = dataMentah.map((d) => d.mentah[def.kolomTanggal]);
  const urutan = tentukanUrutanKolom(nilaiTanggal);
  const dipilih = opsi.urutanTanggal && opsi.urutanTanggal !== 'auto' ? opsi.urutanTanggal : undefined;
  const urutanDipakai: UrutanTanggal = dipilih ?? urutan.urutan ?? 'dmy';

  const terlihat = new Set<string>();
  const baris: BarisImpor[] = dataMentah.map(({ nomor, mentah }) => {
    const h = konversiBaris(def, mentah, { urutanTanggal: urutanDipakai });
    let duplikatDalamFile = false;
    if (h.galat.length === 0) {
      const kunci = kunciDuplikat(def, h.nilai);
      if (terlihat.has(kunci)) { duplikatDalamFile = true; h.peringatan.push('Duplikat dari baris lain di file ini, tidak akan disimpan'); }
      else terlihat.add(kunci);
    }
    return { nomor, mentah, nilai: h.nilai, galat: h.galat, peringatan: h.peringatan, duplikatDalamFile };
  });

  const berGalat = baris.filter((b) => b.galat.length > 0).length;
  const duplikat = baris.filter((b) => b.duplikatDalamFile).length;
  return {
    barisHeader, pemetaan, urutan, urutanDipakai, baris, masalah,
    ringkasan: {
      total: baris.length,
      siapSimpan: baris.length - berGalat - duplikat,
      berGalat,
      berPeringatan: baris.filter((b) => b.galat.length === 0 && b.peringatan.length > 0).length,
      duplikat,
    },
  };
}
