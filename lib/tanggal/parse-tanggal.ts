// lib/tanggal/parse-tanggal.ts
//
// Pembaca tanggal serbaguna untuk impor Excel/CSV. Murni (tanpa impor database), aman dipakai
// di browser maupun server. Hasil selalu string ISO 'YYYY-MM-DD' (tanpa zona waktu, jadi tidak
// bisa bergeser sehari karena UTC/WITA) atau null bila tidak bisa dibaca.
//
// Format yang dikenali:
//  * Angka serial Excel (mis. 46321) dan angka 8 digit (20261012)
//  * Berurutan hari-bulan-tahun (Indonesia/Eropa): 12/10/2026, 12-10-2026, 12.10.2026, 12/10/26
//  * Berurutan bulan-hari-tahun (AS): 10/12/2026, 10/25/2026
//  * Tahun di depan (ISO/Asia Timur): 2026-10-12, 2026/10/12, 2026.10.12, 2026年10月12日
//  * Nama bulan Indonesia & Inggris (+ Belanda, Jerman, Prancis, Spanyol, singkatan umum):
//    "12 Oktober 2026", "12-Okt-2026", "Oct 12, 2026", "Senin, 12 Okt 2026", "12 Agt 26", "12Okt2026"
//  * Bulan angka Romawi: 12-X-2026
//  * Tahun Buddha (Thailand): 12/10/2569 dikonversi ke 2026
//  * Sisipan waktu/zona dibuang: 2026-10-12T08:30:00Z, 12/10/2026 08.30 WITA
//
// Soal ambigu (mis. 05/10/2026 bisa 5 Oktober atau 10 Mei): dibaca menurut `urutanAmbigu`
// (bawaan 'dmy' = gaya Indonesia) dan ditandai `ambigu: true` agar bisa diperiksa petugas.
// `tentukanUrutanKolom()` menyimpulkan urutan dari SELURUH isi kolom (satu nilai seperti 25/10/2026
// sudah cukup membuktikan kolom itu hari-bulan), sehingga kebanyakan kolom tidak lagi ambigu.

export type UrutanTanggal = 'dmy' | 'mdy';

export interface OpsiTanggal {
  /** Urutan untuk angka ambigu. Bawaan 'dmy' (Indonesia). */
  urutanAmbigu?: UrutanTanggal;
  /** Tahun terkecil/terbesar yang dianggap wajar. Bawaan 2000 dan tahun ini + 1. */
  tahunMin?: number;
  tahunMaks?: number;
  /** Tanggal acuan "hari ini" (untuk uji); bawaan Date sekarang. */
  hariIni?: Date;
}

export interface HasilTanggal {
  /** 'YYYY-MM-DD' atau null bila gagal */
  iso: string | null;
  /** true bila angka bisa dibaca dua cara dan dipilih berdasarkan urutanAmbigu */
  ambigu: boolean;
  /** Penjelasan untuk pengguna (selalu terisi bila iso null atau ambigu) */
  pesan?: string;
  /** true bila tanggal lebih dari 1 hari ke depan (kemungkinan salah ketik) */
  masaDepan?: boolean;
}

// ---------------------------------------------------------------- bulan
function tanpaAksen(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const BULAN: Record<number, string[]> = {
  1: ['januari', 'jan', 'january', 'januar', 'janv', 'janvier', 'enero', 'ene', 'januarie', 'gennaio', 'gen'],
  2: ['februari', 'feb', 'pebruari', 'peb', 'february', 'februar', 'fevrier', 'fev', 'febrero', 'febbraio'],
  3: ['maret', 'mar', 'march', 'mrt', 'maart', 'marz', 'mars', 'marzo'],
  4: ['april', 'apr', 'avril', 'avr', 'abril', 'abr', 'aprile'],
  5: ['mei', 'may', 'mai', 'mayo', 'maggio', 'mag'],
  6: ['juni', 'jun', 'june', 'juin', 'junio', 'giugno', 'giu'],
  7: ['juli', 'jul', 'july', 'juil', 'juillet', 'julio', 'luglio', 'lug'],
  8: ['agustus', 'agu', 'agt', 'ags', 'agst', 'aug', 'august', 'aout', 'agosto', 'ago'],
  9: ['september', 'sep', 'sept', 'septembre', 'septiembre', 'settembre', 'set'],
  10: ['oktober', 'okt', 'oct', 'october', 'octobre', 'octubre', 'ottobre', 'ott'],
  11: ['november', 'nov', 'nop', 'nopember', 'novembre', 'noviembre'],
  12: ['desember', 'des', 'dec', 'december', 'dez', 'dezember', 'decembre', 'dic', 'diciembre', 'dicembre', 'dic'],
};

const PETA_BULAN = new Map<string, number>();
for (const [angka, daftar] of Object.entries(BULAN)) for (const nama of daftar) PETA_BULAN.set(nama, Number(angka));

const ROMAWI: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

const NAMA_HARI = [
  'senin', 'selasa', 'rabu', 'kamis', 'jumat', "jum'at", 'jum’at', 'sabtu', 'minggu', 'ahad',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat', 'sun',
  'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag',
  'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
];
const POLA_HARI = new RegExp(`\\b(${NAMA_HARI.map((h) => h.replace(/[’']/g, "['’]")).join('|')})\\b\\.?,?`, 'g');

// ---------------------------------------------------------------- util
function hariDalamBulan(tahun: number, bulan: number): number {
  return new Date(Date.UTC(tahun, bulan, 0)).getUTCDate(); // bulan 1-12
}

function bentukIso(t: number, b: number, h: number): string | null {
  if (!Number.isInteger(t) || !Number.isInteger(b) || !Number.isInteger(h)) return null;
  if (b < 1 || b > 12 || h < 1 || h > hariDalamBulan(t, b)) return null;
  return `${String(t).padStart(4, '0')}-${String(b).padStart(2, '0')}-${String(h).padStart(2, '0')}`;
}

/** Tahun 2 digit -> 4 digit: 00..(tahun ini+1) = 20xx, sisanya 19xx. */
function perluasTahun(yy: number, tahunSekarang: number): number {
  return yy <= (tahunSekarang + 1) % 100 ? 2000 + yy : 1900 + yy;
}

/** Konversi tahun Buddha (BE) bila jelas di luar rentang masehi: 2569 -> 2026. */
function koreksiTahun(t: number, tahunMaks: number): { tahun: number; buddha: boolean } {
  if (t > tahunMaks && t - 543 <= tahunMaks && t - 543 >= 1900) return { tahun: t - 543, buddha: true };
  return { tahun: t, buddha: false };
}

// ---------------------------------------------------------------- serial Excel
/** Serial Excel (sistem 1900, sudah memperhitungkan bug 29 Feb 1900) -> Y/M/D tanpa zona waktu. */
export function serialExcelKeIso(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  const hari = Math.floor(serial);
  if (hari < 61 || hari > 2958465) return null; // 61 = 1 Mar 1900; batas atas = 31 Des 9999
  const d = new Date(Date.UTC(1899, 11, 30) + hari * 86400000);
  return bentukIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

// ---------------------------------------------------------------- pembersihan teks
function bersihkan(teks: string): string {
  let s = teks
    .replace(/[\u00a0\u2007\u202f]/g, ' ') // spasi khusus
    .replace(/[年月]/g, '-')               // 2026年10月12日
    .replace(/日/g, '')
    .trim();
  s = tanpaAksen(s).toLowerCase();
  // buang waktu & zona: "t08:30:00z", " 08.30 wita", " 8:30 pm"
  s = s.replace(/[t\s]+\d{1,2}[:.]\d{2}([:.]\d{2}(\.\d+)?)?\s*(am|pm)?\s*(z|wib|wita|wit|utc|gmt|[+-]\d{2}:?\d{2})?\s*$/i, '');
  s = s.replace(/\b(wib|wita|wit|utc|gmt)\b/g, ' ');
  s = s.replace(POLA_HARI, ' ');
  s = s.replace(/\b(tanggal|tgl|date|le|den|am|el|pukul|jam|pada|at|um)\b\.?/g, ' ');       // kata penghubung
  s = s.replace(/(\d)(st|nd|rd|th|er|e)\b/g, '$1');                      // 1st, 2nd, 3rd, 12th
  s = s.replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2'); // 12okt2026 -> 12 okt 2026
  s = s.replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

// ---------------------------------------------------------------- penguraian inti
interface Mentah { urut: 'ymd' | 'dmy' | 'mdy' | 'ambigu'; a: number; b: number; c: number; bulanNama?: boolean }

function uraiTeks(s: string): Mentah | { galat: string } {
  if (!s) return { galat: 'kosong' };

  // 8 digit rapat: yyyymmdd atau ddmmyyyy
  if (/^\d{8}$/.test(s)) {
    const y = Number(s.slice(0, 4));
    if (y >= 1900 && y <= 2200 && bentukIso(y, Number(s.slice(4, 6)), Number(s.slice(6, 8)))) {
      return { urut: 'ymd', a: y, b: Number(s.slice(4, 6)), c: Number(s.slice(6, 8)) };
    }
    return { urut: 'ambigu', a: Number(s.slice(0, 2)), b: Number(s.slice(2, 4)), c: Number(s.slice(4, 8)) };
  }

  // pisah menjadi token (angka / kata)
  const token = s.split(/[\s/.\-]+/).filter(Boolean);
  if (token.length !== 3) return { galat: 'bukan tiga bagian (hari, bulan, tahun)' };

  // adakah token nama bulan (huruf) ?
  const idxBulan = token.findIndex((t) => /^[a-z]+$/.test(t));
  if (idxBulan >= 0) {
    const nama = token[idxBulan];
    const bulan = PETA_BULAN.get(nama) ?? (token.every((t, i) => i === idxBulan || /^\d+$/.test(t)) ? ROMAWI[nama] : undefined);
    if (!bulan) return { galat: `nama bulan "${nama}" tidak dikenali` };
    const lain = token.filter((_, i) => i !== idxBulan);
    if (!lain.every((t) => /^\d+$/.test(t))) return { galat: 'bagian tanggal bercampur huruf' };
    const [p, q] = lain.map(Number);
    const urutanAsli = idxBulan; // 0: bulan-hari-tahun | 1: hari-bulan-tahun | 2: tahun-hari-bulan / hari-tahun-bulan
    // Tahun = token 4 digit; bila tidak ada, token yang bukan 1-31 atau yang terakhir.
    const panjang = lain.map((t) => t.length);
    let hari: number, tahun: number;
    if (panjang[0] === 4 || p > 31) { tahun = p; hari = q; }
    else if (panjang[1] === 4 || q > 31) { hari = p; tahun = q; }
    else if (urutanAsli === 0) { hari = p; tahun = q; }      // "Oct 12 26"
    else { hari = p; tahun = q; }                            // "12 Okt 26"
    return { urut: 'ymd', a: tahun, b: bulan, c: hari, bulanNama: true };
  }

  if (!token.every((t) => /^\d+$/.test(t))) return { galat: 'format tidak dikenali' };
  const [t1, t2, t3] = token;
  const [n1, n2, n3] = token.map(Number);

  // tahun di depan (4 digit)
  if (t1.length === 4) return { urut: 'ymd', a: n1, b: n2, c: n3 };
  // tahun di belakang
  if (t3.length === 4 || t3.length === 2) {
    return { urut: 'ambigu', a: n1, b: n2, c: n3 };
  }
  return { galat: 'tahun tidak jelas (gunakan 4 digit)' };
}

export function parseTanggal(nilai: unknown, opsi: OpsiTanggal = {}): HasilTanggal {
  const hariIni = opsi.hariIni ?? new Date();
  const tahunSekarang = hariIni.getFullYear();
  const tahunMin = opsi.tahunMin ?? 2000;
  const tahunMaks = opsi.tahunMaks ?? tahunSekarang + 1;
  const urutanAmbigu: UrutanTanggal = opsi.urutanAmbigu ?? 'dmy';

  if (nilai === null || nilai === undefined) return { iso: null, ambigu: false, pesan: 'kosong' };

  const selesai = (iso: string | null, ambigu: boolean, pesanAmbigu?: string): HasilTanggal => {
    if (!iso) return { iso: null, ambigu: false, pesan: 'tanggal tidak valid' };
    const tahun = Number(iso.slice(0, 4));
    if (tahun < tahunMin || tahun > tahunMaks) {
      return { iso: null, ambigu: false, pesan: `tahun ${tahun} di luar rentang wajar (${tahunMin}-${tahunMaks})` };
    }
    const besok = Date.UTC(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() + 1);
    const [t, b, h] = iso.split('-').map(Number);
    const masaDepan = Date.UTC(t, b - 1, h) > besok;
    return { iso, ambigu, ...(ambigu ? { pesan: pesanAmbigu } : {}), ...(masaDepan ? { masaDepan: true } : {}) };
  };

  // objek Date (mis. dari pustaka lain) -> pakai komponen tanggal lokal, bukan UTC
  if (nilai instanceof Date) {
    if (Number.isNaN(nilai.getTime())) return { iso: null, ambigu: false, pesan: 'tanggal tidak valid' };
    return selesai(bentukIso(nilai.getFullYear(), nilai.getMonth() + 1, nilai.getDate()), false);
  }

  // angka: serial Excel atau 8 digit yyyymmdd
  if (typeof nilai === 'number') {
    if (!Number.isFinite(nilai)) return { iso: null, ambigu: false, pesan: 'bukan angka tanggal' };
    if (Number.isInteger(nilai) && nilai >= 19000101 && nilai <= 22001231) {
      return uraiLalu(String(nilai));
    }
    const iso = serialExcelKeIso(nilai);
    if (!iso) return { iso: null, ambigu: false, pesan: `angka ${nilai} bukan tanggal Excel yang valid` };
    return selesai(iso, false);
  }

  if (typeof nilai !== 'string') return { iso: null, ambigu: false, pesan: 'tipe data bukan tanggal' };

  const mentah = nilai.trim();
  if (!mentah) return { iso: null, ambigu: false, pesan: 'kosong' };

  // teks berisi angka serial saja ("46321" dari sel berformat teks)
  if (/^\d{5}(\.\d+)?$/.test(mentah)) {
    const iso = serialExcelKeIso(Number(mentah));
    if (iso) return selesai(iso, false);
  }

  return uraiLalu(mentah);

  function uraiLalu(teks: string): HasilTanggal {
    const hasil = uraiTeks(bersihkan(teks));
    if ('galat' in hasil) return { iso: null, ambigu: false, pesan: `tanggal tidak dikenali (${hasil.galat})` };

    let { a, b, c } = hasil;

    if (hasil.urut === 'ymd') {
      // tahun 2 digit pada format bernama bulan ("12 Okt 26") diperluas dulu
      const tahunPenuh = hasil.bulanNama && a < 100 ? perluasTahun(a, tahunSekarang) : a;
      const kor = koreksiTahun(tahunPenuh, tahunMaks);
      return selesai(bentukIso(kor.tahun, b, c), false);
    }

    // urut 'ambigu': a b c = angka pertama, kedua, tahun
    let tahun = c;
    if (String(teks).match(/\d+\D+\d+\D+(\d+)\s*$/)?.[1]?.length === 2 || c < 100) tahun = perluasTahun(c, tahunSekarang);
    const kor = koreksiTahun(tahun, tahunMaks);
    tahun = kor.tahun;

    const bisaDmy = bentukIso(tahun, b, a) !== null;   // a = hari, b = bulan
    const bisaMdy = bentukIso(tahun, a, b) !== null;   // a = bulan, b = hari

    if (bisaDmy && !bisaMdy) return selesai(bentukIso(tahun, b, a), false);
    if (bisaMdy && !bisaDmy) return selesai(bentukIso(tahun, a, b), false);
    if (!bisaDmy && !bisaMdy) return { iso: null, ambigu: false, pesan: 'hari/bulan di luar rentang' };

    // keduanya mungkin
    if (a === b) return selesai(bentukIso(tahun, b, a), false); // 05/05/2026 tidak ambigu
    const iso = urutanAmbigu === 'dmy' ? bentukIso(tahun, b, a) : bentukIso(tahun, a, b);
    const bacaan = urutanAmbigu === 'dmy' ? 'hari/bulan/tahun' : 'bulan/hari/tahun';
    return selesai(iso, true, `ambigu: dibaca ${bacaan}`);
  }
}

// ---------------------------------------------------------------- inferensi per kolom
export interface SimpulanUrutan {
  urutan: UrutanTanggal | null;
  /** bukti: berapa nilai yang hanya masuk akal sebagai dmy / mdy */
  buktiDmy: number;
  buktiMdy: number;
  /** true bila ada bukti bertentangan (kolom bercampur dua gaya) */
  bertentangan: boolean;
}

/**
 * Simpulkan urutan tanggal sebuah kolom dari seluruh nilainya. Contoh: bila ada "25/10/2026"
 * (bagian pertama > 12) maka kolom itu pasti hari-bulan. Hanya angka bergaya a/b/tahun yang dihitung.
 */
export function tentukanUrutanKolom(nilai: unknown[]): SimpulanUrutan {
  let buktiDmy = 0;
  let buktiMdy = 0;
  for (const v of nilai) {
    if (typeof v !== 'string') continue;
    const m = v.trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})(?:\D.*)?$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    // bukti hanya dihitung bila bagian "hari" masuk akal (<= 31); "10/32/2026" salah ketik, bukan bukti
    if (a > 12 && a <= 31 && b >= 1 && b <= 12) buktiDmy++;
    else if (b > 12 && b <= 31 && a >= 1 && a <= 12) buktiMdy++;
  }
  const bertentangan = buktiDmy > 0 && buktiMdy > 0;
  const urutan: UrutanTanggal | null = bertentangan ? null : buktiDmy > 0 ? 'dmy' : buktiMdy > 0 ? 'mdy' : null;
  return { urutan, buktiDmy, buktiMdy, bertentangan };
}