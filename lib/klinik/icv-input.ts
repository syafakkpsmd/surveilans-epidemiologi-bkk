// lib/klinik/icv-input.ts
//
// Validasi dan normalisasi satu baris data ICV / e-ICV (form dan unggah Excel). MURNI: tanpa database, aman dipakai
// di browser maupun server. Hasilnya adalah objek dengan KUNCI = judul kolom sheet lama ("Tanggal Terbit", "Jenis Vaksin 1",
// "Komorbid 1", ...) karena itulah yang dibaca semua dashboard dari kolom raw_json tabel data_icv. Tanggal disimpan
// dd/mm/yyyy, sama dengan baris hasil sinkronisasi Sheets.
import { parseTanggal, type UrutanTanggal } from '@/lib/tanggal/parse-tanggal';

// Opsi dropdown, sama dengan validasi data di sheet lama (ejaan dipertahankan karena dashboard mengelompokkan menurut teks).
export const OPSI_VAKSIN = [
  'Meningitis', 'Yellow Fever', 'Polio', 'Influenza', 'Tifoid', 'MMR', 'Varisela', 'Dengue', 'Rabies', 'Difteria',
  'Hepatitis A', 'Hepatitis B', 'Herpes Zoster', 'Japanese Ecephalitis', 'Kolera Oral', 'Pneumokokus', 'Rotavirus', 'Tetanus', 'Varicella',
] as const;

export const OPSI_KOMORBID = [
  'Hipertensi', 'Diabetes', 'Penyakit Jantung', 'Penyakit Paru-paru', 'Gangguan Ginjal', 'Kanker', 'Asma', 'Anemia', 'Alergi',
  'Leukimia', 'HIV / AIDS', 'Autoimun', 'Hipertiroid', 'Riwayat Tumor',
] as const;

export const OPSI_LAYANAN = ['Vaksinasi', 'Legalisasi', 'Kontraindikasi'] as const;
export const OPSI_JENIS_KELAMIN = ['Laki-laki', 'Perempuan'] as const;

export const MAKS_VAKSIN = 3;
export const MAKS_KOMORBID = 6;

/** Judul kolom ekspor/sheet lama, urut. Dipakai template Excel dan pemetaan judul unggahan. */
export const JUDUL_ICV: string[] = [
  'No', 'No Dokumen ICV / e-ICV', 'Tanggal Terbit', 'Nama', 'Tanggal Lahir', 'Jenis Kelamin', 'Kebangsaan', 'No Paspor', 'NIK',
  'Tanggal Berangkat', 'No HP', 'Email', 'Jenis Vaksin 1', 'Jenis Vaksin 2', 'Jenis Vaksin 3', 'WUS', 'Hasil WUS',
  'Komorbid 1', 'Komorbid 2', 'Kontraindikasi', 'Masa Berlaku MM Sampai', 'KIPI', 'Jenis Layanan', 'Nama Travel',
  'Nama Petugas Travel', 'No HP Travel', 'Keterangan',
];

/** Judul kolom yang dikenali saat unggah (kolom Komorbid ke-3.. dst. ikut dikenali). */
export function judulDikenali(): string[] {
  const tambahan = Array.from({ length: MAKS_KOMORBID - 2 }, (_, i) => `Komorbid ${i + 3}`);
  return [...JUDUL_ICV, ...tambahan].filter((j) => j !== 'No');
}

export type MentahIcv = Record<string, unknown>;

export interface OpsiValidasiIcv {
  /** Urutan hari/bulan untuk tanggal teks yang ambigu; diisi dari tentukanUrutanKolom() per kolom saat unggah. */
  urutan?: Partial<Record<string, UrutanTanggal | null>>;
  hariIni?: Date;
}

export interface HasilIcv {
  /** objek siap disimpan sebagai raw_json, atau null bila ada galat */
  nilai: Record<string, string> | null;
  galat: string[];
  /** hal yang diterima tetapi sebaiknya diperiksa petugas */
  peringatan: string[];
}

const KOLOM_TANGGAL = ['Tanggal Terbit', 'Tanggal Lahir', 'Tanggal Berangkat', 'Masa Berlaku MM Sampai'] as const;

const dd = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Sel mentah -> teks bersih. Date dari exceljs dibaca dengan komponen UTC (sel Excel tidak punya zona waktu). */
function teks(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '';
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`;
  }
  return String(v).replace(/^'+/, '').replace(/\s+/g, ' ').trim();
}

const bandingkan = (a: string, b: string) => a.localeCompare(b, 'id', { sensitivity: 'base' }) === 0;
const cocok = (nilai: string, opsi: readonly string[]) => opsi.find((o) => bandingkan(o, nilai));

function normJenisKelamin(s: string): string | null {
  const n = s.toLowerCase().replace(/[^a-z]/g, '');
  if (['lakilaki', 'laki', 'l', 'pria', 'male', 'm'].includes(n)) return 'Laki-laki';
  if (['perempuan', 'p', 'wanita', 'female', 'f'].includes(n)) return 'Perempuan';
  return null;
}

const NEGATIF = new Set(['', '-', '--', 'tidak', 'tidak ada', 'tdk', 'tdk ada', 'tidak ada komorbid', 'nihil', 'none', 'no', 'n/a']);

export function validasiIcv(mentah: MentahIcv, opsi: OpsiValidasiIcv = {}): HasilIcv {
  const galat: string[] = [];
  const peringatan: string[] = [];
  const nilai: Record<string, string> = {};
  const hariIni = opsi.hariIni ?? new Date();

  // ---- teks wajib
  const noDok = teks(mentah['No Dokumen ICV / e-ICV']);
  if (!noDok) galat.push('No Dokumen ICV / e-ICV: wajib diisi');
  else if (noDok.length > 100) galat.push('No Dokumen ICV / e-ICV: terlalu panjang');
  nilai['No Dokumen ICV / e-ICV'] = noDok;

  const nama = teks(mentah['Nama']);
  if (!nama) galat.push('Nama: wajib diisi');
  else if (nama.length > 255) galat.push('Nama: terlalu panjang');
  nilai['Nama'] = nama; // huruf tidak diubah: data lama campuran

  // ---- tanggal
  for (const k of KOLOM_TANGGAL) {
    const sel = mentah[k];
    const wajib = k === 'Tanggal Terbit' || k === 'Tanggal Lahir';
    const ada = !(sel === null || sel === undefined || teks(sel) === '');
    if (!ada) {
      if (wajib) galat.push(`${k}: wajib diisi`);
      nilai[k] = '';
      continue;
    }
    const sudahIso = sel instanceof Date ? teks(sel) : null;
    const r = parseTanggal(sudahIso ?? (typeof sel === 'number' ? sel : teks(sel)), { urutanAmbigu: opsi.urutan?.[k] ?? 'dmy', hariIni, tahunMin: k === 'Tanggal Lahir' ? 1900 : 2000, ...(k === 'Masa Berlaku MM Sampai' ? { tahunMaks: hariIni.getFullYear() + 10 } : {}) });
    if (!r.iso) { galat.push(`${k}: ${r.pesan ?? 'tanggal tidak valid'}`); nilai[k] = ''; continue; }
    if (r.ambigu && !opsi.urutan?.[k]) peringatan.push(`${k}: ${r.pesan}`);
    if (r.masaDepan && k === 'Tanggal Terbit') galat.push('Tanggal Terbit: tidak boleh di masa depan');
    if (k === 'Tanggal Lahir' && r.masaDepan) galat.push('Tanggal Lahir: tidak boleh di masa depan');
    nilai[k] = dd(r.iso);
  }

  // ---- jenis kelamin
  const jk = normJenisKelamin(teks(mentah['Jenis Kelamin']));
  if (!jk) galat.push('Jenis Kelamin: pilih Laki-laki atau Perempuan');
  nilai['Jenis Kelamin'] = jk ?? '';

  // ---- identitas
  nilai['Kebangsaan'] = teks(mentah['Kebangsaan']) || 'Indonesia';
  nilai['No Paspor'] = teks(mentah['No Paspor']).toUpperCase();

  const nikSel = mentah['NIK'];
  if (typeof nikSel === 'number' && Math.abs(nikSel) >= 1e15) {
    galat.push('NIK: tersimpan sebagai angka di Excel sehingga digit belakangnya rusak. Ubah kolom NIK menjadi format Teks lalu isi ulang');
    nilai['NIK'] = '';
  } else {
    const nik = teks(nikSel).replace(/[\s.-]/g, '');
    if (nik && !/^\d+$/.test(nik)) galat.push('NIK: hanya boleh berisi angka');
    else if (nik && nik.length !== 16 && /indonesia/i.test(nilai['Kebangsaan'])) peringatan.push(`NIK: ${nik.length} digit (seharusnya 16)`);
    nilai['NIK'] = nik;
  }

  nilai['No HP'] = teks(mentah['No HP']).replace(/[^\d+]/g, '');
  const email = teks(mentah['Email']);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) peringatan.push('Email: bentuk tidak lazim');
  nilai['Email'] = email;

  // ---- layanan
  const layananMentah = teks(mentah['Jenis Layanan']);
  const layanan = layananMentah ? cocok(layananMentah, OPSI_LAYANAN) : 'Vaksinasi';
  if (!layanan) galat.push(`Jenis Layanan: pilih salah satu dari ${OPSI_LAYANAN.join(', ')}`);
  nilai['Jenis Layanan'] = layanan ?? '';

  // ---- vaksin 1..3 (Vaksin 1 wajib untuk layanan Vaksinasi; tidak boleh ganda; boleh di luar daftar)
  const vaksin: string[] = [];
  for (let i = 1; i <= MAKS_VAKSIN; i++) {
    const v = teks(mentah[`Jenis Vaksin ${i}`]);
    if (!v) continue;
    const baku = cocok(v, OPSI_VAKSIN) ?? v;
    if (vaksin.some((x) => bandingkan(x, baku))) { galat.push(`Jenis Vaksin ${i}: "${baku}" sudah dipilih`); continue; }
    if (!cocok(v, OPSI_VAKSIN)) peringatan.push(`Jenis Vaksin ${i}: "${v}" tidak ada di daftar`);
    vaksin.push(baku);
  }
  for (let i = 1; i <= MAKS_VAKSIN; i++) nilai[`Jenis Vaksin ${i}`] = vaksin[i - 1] ?? '';
  if (layanan === 'Vaksinasi' && vaksin.length === 0) galat.push('Jenis Vaksin 1: wajib diisi untuk layanan Vaksinasi');

  // ---- WUS hanya untuk perempuan
  const wus = teks(mentah['WUS']);
  const hasilWus = teks(mentah['Hasil WUS']);
  if (jk === 'Perempuan') {
    const w = wus ? (bandingkan(wus, 'Ya') ? 'Ya' : bandingkan(wus, 'Tidak') ? 'Tidak' : null) : '';
    if (w === null) galat.push('WUS: isi Ya atau Tidak');
    nilai['WUS'] = w ?? '';
    nilai['Hasil WUS'] = w === 'Ya' ? hasilWus : '';
  } else {
    nilai['WUS'] = '';
    nilai['Hasil WUS'] = '';
  }

  // ---- komorbid: daftar bebas (bukan dipisah koma); "-"/"tidak" dianggap kosong; hapus ganda
  const komorbid: string[] = [];
  const kunciKomorbid = Object.keys(mentah)
    .map((k) => /^Komorbid (\d+)$/.exec(k))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
  for (const n of kunciKomorbid) {
    const v = teks(mentah[`Komorbid ${n}`]);
    if (NEGATIF.has(v.toLowerCase())) continue;
    if (v.includes(',') || v.includes(';')) { galat.push(`Komorbid ${n}: satu penyakit per isian, jangan dipisah koma (gunakan tombol Tambah)`); continue; }
    if (v.length > 100) { galat.push(`Komorbid ${n}: terlalu panjang`); continue; }
    const baku = cocok(v, OPSI_KOMORBID) ?? v;
    if (komorbid.some((x) => bandingkan(x, baku))) continue;
    komorbid.push(baku);
  }
  if (komorbid.length > MAKS_KOMORBID) galat.push(`Komorbid: maksimal ${MAKS_KOMORBID} penyakit`);
  const jumlahKolomKomorbid = Math.max(2, komorbid.length);
  for (let i = 1; i <= jumlahKolomKomorbid; i++) nilai[`Komorbid ${i}`] = komorbid[i - 1] ?? '';

  // ---- sisanya
  nilai['Kontraindikasi'] = teks(mentah['Kontraindikasi']) || '-';
  const kipi = teks(mentah['KIPI']);
  const kipiBaku = kipi ? (bandingkan(kipi, 'Ya') ? 'Ya' : bandingkan(kipi, 'Tidak') ? 'Tidak' : null) : 'Tidak';
  if (kipiBaku === null) galat.push('KIPI: isi Ya atau Tidak');
  nilai['KIPI'] = kipiBaku ?? '';
  for (const k of ['Nama Travel', 'Nama Petugas Travel', 'No HP Travel', 'Keterangan']) nilai[k] = teks(mentah[k]);

  // ---- hubungan antar tanggal
  const [tT, tB] = [nilai['Tanggal Terbit'], nilai['Tanggal Berangkat']];
  if (tT && tB) {
    const iso = (s: string) => `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`;
    if (iso(tB) < iso(tT)) peringatan.push('Tanggal Berangkat lebih awal dari Tanggal Terbit');
  }

  return galat.length ? { nilai: null, galat, peringatan } : { nilai, galat: [], peringatan };
}

/** Kunci pencocokan duplikat: nomor dokumen, tanpa memperhatikan huruf/spasi. */
export const kunciDokumen = (noDokumen: string) => noDokumen.trim().replace(/\s+/g, ' ').toLowerCase();
