// lib/input-data/parse-excel.ts
// SERVER-ONLY (exceljs). Membaca berkas .xlsx menjadi baris tervalidasi + daftar galat per baris.
// Memakai exceljs untuk MEMBACA (paket npm `xlsx` sengaja tidak dipakai membaca: rentan).
import ExcelJS from 'exceljs';
import { kunciJudul, type ModulInput } from './modul';
import { kunciDuplikat, validasiBaris, type NilaiBaris } from './validasi';
import { selMentah, teksKosong } from './nilai';

export const MAKS_BYTE = 5 * 1024 * 1024;
export const MAKS_BARIS = 20000;
export const MAKS_GALAT_DITAMPILKAN = 200;

export interface GalatBaris { baris: number; pesan: string[] }

export interface HasilParse {
  /** Galat yang menghentikan seluruh berkas (format, kolom wajib tidak ada, dsb). */
  fatal: string | null;
  jumlahBaris: number;
  sah: { baris: number; nilai: NilaiBaris }[];
  galat: GalatBaris[];
  /** Judul kolom di berkas yang tidak dikenal (diabaikan). */
  kolomDiabaikan: string[];
}

function petaJudul(modul: ModulInput): Map<string, string> {
  const peta = new Map<string, string>();
  for (const k of modul.kolom) {
    for (const j of [k.label, k.nama, ...(k.alias ?? [])]) peta.set(kunciJudul(j), k.nama);
  }
  return peta;
}

export async function bacaExcel(buffer: Buffer | ArrayBuffer | Uint8Array, modul: ModulInput, tahun: number): Promise<HasilParse> {
  const kosong: HasilParse = { fatal: null, jumlahBaris: 0, sah: [], galat: [], kolomDiabaikan: [] };
  const panjang = (buffer as Buffer).byteLength;
  if (panjang > MAKS_BYTE) return { ...kosong, fatal: `Berkas lebih dari ${MAKS_BYTE / 1024 / 1024} MB.` };

  const wb = new ExcelJS.Workbook();
  try {
    // exceljs hanya membaca .xlsx; berkas lama .xls ditolak dengan pesan jelas.
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    return { ...kosong, fatal: 'Berkas tidak dapat dibaca. Gunakan format .xlsx (bukan .xls atau .csv).' };
  }
  const ws = wb.worksheets.find((s) => s.rowCount > 0);
  if (!ws) return { ...kosong, fatal: 'Berkas tidak memiliki lembar yang berisi data.' };

  const peta = petaJudul(modul);
  // Cari baris judul: dalam 15 baris pertama, baris dengan kolom dikenal terbanyak.
  let barisJudul = 0;
  let terbaik = 0;
  const batas = Math.min(ws.rowCount, 15);
  for (let r = 1; r <= batas; r++) {
    let hit = 0;
    ws.getRow(r).eachCell((c) => {
      const s = selMentah(c.value);
      if (typeof s === 'string' && peta.has(kunciJudul(s))) hit++;
    });
    if (hit > terbaik) { terbaik = hit; barisJudul = r; }
  }
  if (!barisJudul) return { ...kosong, fatal: 'Baris judul kolom tidak ditemukan. Gunakan template dari tombol "Unduh template".' };

  const kolomKe = new Map<number, string>(); // nomor kolom Excel -> nama kolom tabel
  const diabaikan: string[] = [];
  ws.getRow(barisJudul).eachCell((c, n) => {
    const s = selMentah(c.value);
    if (typeof s !== 'string' || !s.trim()) return;
    const nama = peta.get(kunciJudul(s));
    if (nama && ![...kolomKe.values()].includes(nama)) kolomKe.set(n, nama);
    else diabaikan.push(s.trim());
  });
  const ada = new Set(kolomKe.values());
  const hilang = modul.kolom.filter((k) => k.wajib && !ada.has(k.nama)).map((k) => k.label);
  if (hilang.length) return { ...kosong, kolomDiabaikan: diabaikan, fatal: `Kolom wajib tidak ditemukan: ${hilang.join(', ')}.` };

  const hasil: HasilParse = { ...kosong, kolomDiabaikan: diabaikan };
  const terlihat = new Set<string>();
  for (let r = barisJudul + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const mentah: Record<string, unknown> = {};
    let isi = false;
    for (const [n, nama] of kolomKe) {
      const v = selMentah(row.getCell(n).value);
      mentah[nama] = v;
      if (!teksKosong(v)) isi = true;
    }
    if (!isi) continue; // baris kosong dilewati
    hasil.jumlahBaris++;
    if (hasil.jumlahBaris > MAKS_BARIS) return { ...hasil, fatal: `Berkas lebih dari ${MAKS_BARIS} baris data. Pecah menjadi beberapa berkas.` };

    const h = validasiBaris(modul, mentah, tahun);
    if (!h.nilai) { hasil.galat.push({ baris: r, pesan: h.galat }); continue; }
    const kd = kunciDuplikat(modul.kunci, h.nilai);
    if (kd) {
      if (terlihat.has(kd)) { hasil.galat.push({ baris: r, pesan: ['Duplikat: wilayah, nama kapal, dan tanggal sama dengan baris lain di berkas'] }); continue; }
      terlihat.add(kd);
    }
    hasil.sah.push({ baris: r, nilai: h.nilai });
  }
  return hasil;
}

/** Template Excel kosong: satu lembar, judul kolom = label modul, satu baris contoh tidak disertakan. */
export async function buatTemplate(modul: ModulInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  ws.addRow(modul.kolom.map((k) => k.label + (k.wajib ? ' *' : '')));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  modul.kolom.forEach((k, i) => {
    const kol = ws.getColumn(i + 1);
    kol.width = Math.max(14, k.label.length + 4);
    if (k.tipe === 'tanggal') kol.numFmt = 'yyyy-mm-dd';
  });
  const cat = wb.addWorksheet('Petunjuk');
  [
    ['Kolom bertanda * wajib diisi.'],
    ['Tanggal: TTTT-BB-HH (mis. 2026-10-23) atau HH/BB/TTTT.'],
    ['Jumlah: bilangan bulat tanpa titik/koma.'],
    ['RBA: Hijau, Kuning, atau Merah.'],
    ['Wilayah Kerja: Samarinda, Tanjung Santan, Tanjung Laut, Lhoktuan, Sangatta, atau Sangkulirang.'],
    ['Judul kolom jangan diubah; kolom lain di luar template diabaikan.'],
  ].forEach((r) => cat.addRow(r));
  cat.getColumn(1).width = 100;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
