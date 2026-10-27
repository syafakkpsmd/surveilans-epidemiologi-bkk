// lib/input-data/parse-excel.ts
// SERVER-ONLY (exceljs). Membaca berkas tabel menjadi baris tervalidasi + daftar galat per baris.
// Format yang dibaca:
//   * .xlsx            -> exceljs (paket npm `xlsx` sengaja tidak dipakai membaca: rentan)
//   * .xls ekspor Sinkarkes = tabel HTML berekstensi .xls -> pembaca tabel HTML di bawah
//   * .xls biner lama (BIFF) -> ditolak dengan pesan "simpan ulang sebagai .xlsx"
import ExcelJS from 'exceljs';
import { kunciJudul, type ModulInput, type KolomModul } from './modul';
import { kunciBaris, validasiBaris, type NilaiBaris } from './validasi';
import { selMentah, teksKosong } from './nilai';
import { type KodeWilker } from '@/lib/wilayah-kerja';

export const MAKS_BYTE = 5 * 1024 * 1024;
export const MAKS_BARIS = 20000;
export const MAKS_GALAT_DITAMPILKAN = 200;

export interface GalatBaris { baris: number; pesan: string[] }

export interface HasilParse {
  /** Galat yang menghentikan seluruh berkas (format, kolom wajib tidak ada, dsb). */
  fatal: string | null;
  /** true bila berkas tidak punya kolom wilayah kerja: pengguna harus memilih wilayah untuk seluruh baris. */
  perluWilayah: boolean;
  jumlahBaris: number;
  sah: { baris: number; nilai: NilaiBaris }[];
  galat: GalatBaris[];
  /** Judul kolom di berkas yang tidak dikenal (diabaikan). */
  kolomDiabaikan: string[];
  /** Nama kolom tabel yang ADA di berkas; unggahan hanya memperbarui kolom ini pada baris yang sudah ada. */
  kolomAda: string[];
}

type Grid = unknown[][];

// ------------------------------------------------------------------ pembaca tabel HTML

const ENTITAS: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };

function dekodeEntitas(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITAS[e.toLowerCase()] ?? m;
  });
}

/** Ambil teks sel HTML. Awalan apostrof tunggal (penanda "teks" dari Excel/Sinkarkes) dibuang. */
function teksSel(html: string): string {
  const t = dekodeEntitas(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
  return t.startsWith("'") ? t.slice(1) : t;
}

export function bacaTabelHtml(teks: string): Grid {
  const bersih = teks.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  const grid: Grid = [];
  const reTr = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = reTr.exec(bersih))) {
    const baris: string[] = [];
    const reTd = /<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi;
    let c: RegExpExecArray | null;
    while ((c = reTd.exec(m[1]))) {
      baris.push(teksSel(c[2]));
      const span = /colspan\s*=\s*["']?(\d+)/i.exec(c[1]);
      const n = span ? Math.min(Number(span[1]), 200) : 1;
      for (let i = 1; i < n; i++) baris.push(''); // sel gabungan: judul laporan tidak menggeser kolom
    }
    grid.push(baris);
  }
  return grid;
}

// ------------------------------------------------------------------ grid dari berkas

export async function bacaGrid(buffer: Buffer): Promise<{ grid: Grid } | { fatal: string }> {
  if (buffer.length > MAKS_BYTE) return { fatal: `Berkas lebih dari ${MAKS_BYTE / 1024 / 1024} MB.` };
  const kepala = buffer.subarray(0, 8);
  if (kepala[0] === 0x50 && kepala[1] === 0x4b) { // 'PK' = zip = .xlsx
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      return { fatal: 'Berkas .xlsx tidak dapat dibaca.' };
    }
    const ws = wb.worksheets.find((s) => s.rowCount > 0);
    if (!ws) return { fatal: 'Berkas tidak memiliki lembar yang berisi data.' };
    const grid: Grid = [];
    ws.eachRow({ includeEmpty: true }, (row, nomor) => {
      const sel: unknown[] = [];
      for (let k = 1; k <= ws.columnCount; k++) sel.push(selMentah(row.getCell(k).value));
      while (grid.length < nomor - 1) grid.push([]);
      grid.push(sel);
    });
    return { grid };
  }
  if (kepala[0] === 0xd0 && kepala[1] === 0xcf && kepala[2] === 0x11 && kepala[3] === 0xe0) {
    return { fatal: 'Format .xls biner lama tidak didukung. Buka di Excel lalu Simpan Sebagai .xlsx.' };
  }
  const teks = buffer.toString('utf8');
  if (/<table\b/i.test(teks)) {
    const grid = bacaTabelHtml(teks);
    if (/Excel Workbook Frameset/i.test(teks) && grid.every((b) => b.every((x) => teksKosongSel(x)))) {
      return { fatal: 'Berkas ini hanya kerangka "Web Page" Excel tanpa data (isi data ada di folder pendampingnya). Buka di Excel lalu Simpan Sebagai .xlsx, atau ekspor ulang dari Sinkarkes.' };
    }
    return { grid };
  }
  return { fatal: 'Format berkas tidak dikenal. Gunakan .xlsx atau ekspor .xls dari Sinkarkes.' };
}

const teksKosongSel = (x: unknown) => teksKosong(x);

// ------------------------------------------------------------------ pemetaan kolom

function petaJudul(modul: ModulInput): Map<string, string> {
  const peta = new Map<string, string>();
  for (const k of modul.kolom) {
    for (const j of [k.label, k.nama, ...(k.alias ?? [])]) {
      const kj = kunciJudul(j);
      if (!peta.has(kj)) peta.set(kj, k.nama); // judul pertama menang; tabrakan dicegah oleh uji
    }
  }
  return peta;
}

/** Cari baris judul (15 baris pertama) dan petakan nomor kolom -> nama kolom tabel. */
export function petakanKolom(grid: Grid, peta: Map<string, string>):
  { barisJudul: number; kolomKe: Map<number, string>; diabaikan: string[] } | null {
  let barisJudul = -1;
  let terbaik = 0;
  const batas = Math.min(grid.length, 15);
  for (let r = 0; r < batas; r++) {
    let hit = 0;
    for (const x of grid[r]) {
      const s = selMentah(x);
      if (typeof s === 'string' && peta.has(kunciJudul(s))) hit++;
    }
    if (hit > terbaik) { terbaik = hit; barisJudul = r; }
  }
  if (barisJudul < 0) return null;
  const kolomKe = new Map<number, string>();
  const diabaikan: string[] = [];
  grid[barisJudul].forEach((x, n) => {
    const s = selMentah(x);
    if (typeof s !== 'string' || !s.trim()) return;
    const nama = peta.get(kunciJudul(s));
    if (nama && ![...kolomKe.values()].includes(nama)) kolomKe.set(n, nama);
    else if (kunciJudul(s) !== 'no') diabaikan.push(s.trim());
  });
  return { barisJudul, kolomKe, diabaikan };
}

export async function bacaExcel(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  modul: ModulInput,
  tahun: number,
  opsi: { wilayahDefault?: KodeWilker | null } = {},
): Promise<HasilParse> {
  const kosong: HasilParse = { fatal: null, perluWilayah: false, jumlahBaris: 0, sah: [], galat: [], kolomDiabaikan: [], kolomAda: [] };
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  const g = await bacaGrid(buf);
  if ('fatal' in g) return { ...kosong, fatal: g.fatal };

  const pk = petakanKolom(g.grid, petaJudul(modul));
  if (!pk) return { ...kosong, fatal: 'Baris judul kolom tidak ditemukan. Gunakan template dari tombol "Unduh template" atau ekspor asli Sinkarkes.' };
  const { barisJudul, kolomKe } = pk;
  const ada = new Set(kolomKe.values());
  const tanpaWilayah = !ada.has(modul.kolomWilayah);
  const hilang = modul.kolom.filter((k) => k.wajib && !ada.has(k.nama) && !(tanpaWilayah && k.nama === modul.kolomWilayah)).map((k) => k.label);
  if (hilang.length) return { ...kosong, kolomDiabaikan: pk.diabaikan, fatal: `Kolom wajib tidak ditemukan: ${hilang.join(', ')}.` };
  if (tanpaWilayah && !opsi.wilayahDefault) {
    return { ...kosong, kolomDiabaikan: pk.diabaikan, perluWilayah: true, fatal: 'Berkas tidak punya kolom wilayah kerja (Induk/Wilker). Pilih wilayah kerja untuk seluruh baris berkas ini.' };
  }

  const hasil: HasilParse = { ...kosong, kolomDiabaikan: pk.diabaikan, kolomAda: [...new Set([...ada, ...(tanpaWilayah ? [modul.kolomWilayah] : [])])] };
  const terlihat = new Set<string>();
  for (let r = barisJudul + 1; r < g.grid.length; r++) {
    const row = g.grid[r];
    const mentah: Record<string, unknown> = {};
    let isi = false;
    for (const [n, nama] of kolomKe) {
      const v = selMentah(row[n]);
      mentah[nama] = v;
      if (!teksKosong(v)) isi = true;
    }
    if (!isi) continue; // baris kosong dilewati
    if (tanpaWilayah && opsi.wilayahDefault) mentah[modul.kolomWilayah] = opsi.wilayahDefault;
    hasil.jumlahBaris++;
    if (hasil.jumlahBaris > MAKS_BARIS) return { ...hasil, fatal: `Berkas lebih dari ${MAKS_BARIS} baris data. Pecah menjadi beberapa berkas.` };

    const nomor = r + 1;
    const h = validasiBaris(modul, mentah, tahun);
    if (!h.nilai) { hasil.galat.push({ baris: nomor, pesan: h.galat }); continue; }
    const kd = kunciBaris(modul, h.nilai);
    if (kd) {
      if (terlihat.has(kd)) { hasil.galat.push({ baris: nomor, pesan: ['Duplikat: wilayah, nama kapal, dan tanggal sama dengan baris lain di berkas'] }); continue; }
      terlihat.add(kd);
    }
    hasil.sah.push({ baris: nomor, nilai: h.nilai });
  }
  return hasil;
}

/** Judul semua kolom yang dikenal modul, dalam urutan template (kolom manual tidak disertakan: diisi di aplikasi). */
export function kolomTemplate(modul: ModulInput): KolomModul[] {
  return modul.kolom.filter((k) => !k.manual);
}

/** Template Excel kosong: judul kolom = label modul. */
export async function buatTemplate(modul: ModulInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  const kol = kolomTemplate(modul);
  ws.addRow(kol.map((k) => k.label + (k.wajib ? ' *' : '')));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  kol.forEach((k, i) => {
    const c = ws.getColumn(i + 1);
    c.width = Math.max(14, k.label.length + 4);
    if (k.tipe === 'tanggal') c.numFmt = 'yyyy-mm-dd';
  });
  const cat = wb.addWorksheet('Petunjuk');
  [
    ['Kolom bertanda * wajib diisi.'],
    ['Berkas ekspor asli Sinkarkes (.xls) juga bisa langsung diunggah tanpa diubah; kolom yang tidak dikenal diabaikan.'],
    ['Tanggal: TTTT-BB-HH (mis. 2026-10-23) atau HH/BB/TTTT. Jam: JJ:MM.'],
    ['Jumlah: bilangan bulat tanpa titik/koma. Berat dan Jumlah Bayar: pakai titik untuk desimal, tanpa pemisah ribuan.'],
    ['Induk/Wilker: Samarinda, Tanjung Santan, Tanjung Laut, Lhoktuan, Sangatta, atau Sangkulirang (boleh ditulis "Pelabuhan Laut Sangatta").'],
    ['RBA, Faktor Risiko, Daerah Terjangkit, Kelengkapan Dokumen, Orang Sakit, Keberadaan Vektor, Sanitasi, dan Tujuan Berlayar diisi petugas di aplikasi setelah data masuk.'],
  ].forEach((r) => cat.addRow(r));
  cat.getColumn(1).width = 110;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
