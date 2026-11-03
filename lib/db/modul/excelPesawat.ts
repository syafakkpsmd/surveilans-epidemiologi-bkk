// lib/db/modul/excelPesawat.ts
// Template dan pembaca file Excel (.xlsx) untuk unggah data pesawat. SERVER-ONLY (exceljs).
// File dibaca di server (bukan di browser) dan hanya menghasilkan baris MENTAH; validasi sebenarnya ada di
// inputPesawat.ts supaya form satu-satu dan unggah Excel memakai aturan yang sama.
import ExcelJS from 'exceljs';
import { KOLOM_PESAWAT, type DefKolom } from '@/lib/db/modul/inputPesawat';

export const MAKS_BYTE_EXCEL = 2 * 1024 * 1024; // 2 MB
export const MAKS_BARIS_EXCEL = 2000;
const BARIS_HEADER_MAKS = 10; // header dicari di 10 baris pertama (toleran terhadap judul di atasnya)

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** header/alias/kunci yang sudah dinormalkan -> kolom */
const PETA_HEADER: Map<string, DefKolom> = (() => {
  const m = new Map<string, DefKolom>();
  for (const k of KOLOM_PESAWAT) {
    for (const nama of [k.header, k.kunci, ...(k.alias ?? [])]) m.set(norm(nama), k);
  }
  return m;
})();

// ---------------------------------------------------------------- template

export async function buatTemplatePesawat(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EPIC-AI BKK Samarinda';
  wb.created = new Date();

  const ws = wb.addWorksheet('Data', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = KOLOM_PESAWAT.map((k) => ({
    header: k.header,
    key: k.kunci,
    width: Math.max(14, Math.min(28, k.header.length + 4)),
  }));
  const header = ws.getRow(1);
  header.height = 32;
  header.eachCell((c, i) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KOLOM_PESAWAT[i - 1].wajib ? 'FF0F4C5C' : 'FF4B7B88' } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const BARIS_TERFORMAT = 500;
  KOLOM_PESAWAT.forEach((k, idx) => {
    const kol = idx + 1;
    for (let r = 2; r <= BARIS_TERFORMAT + 1; r++) {
      const sel = ws.getCell(r, kol);
      if (k.jenis === 'tanggal') sel.numFmt = 'yyyy-mm-dd';
      if (k.jenis === 'angka') {
        sel.dataValidation = {
          type: 'whole',
          operator: 'greaterThanOrEqual',
          allowBlank: true,
          formulae: [0],
          showErrorMessage: true,
          errorTitle: 'Bukan bilangan bulat',
          error: 'Isi bilangan bulat 0 atau lebih (kosong dianggap 0).',
        };
      }
    }
  });

  const pt = wb.addWorksheet('Petunjuk');
  pt.columns = [{ width: 28 }, { width: 9 }, { width: 80 }, { width: 16 }];
  pt.addRow(['Petunjuk pengisian: Data Kegiatan Pesawat']).font = { bold: true, size: 14 };
  pt.addRow([]);
  [
    'Isi sheet "Data" mulai baris 2 (satu baris = satu penerbangan). Jangan mengubah judul kolom di baris 1.',
    'Hanya kolom Tanggal dan Maskapai yang wajib. Kolom jumlah yang kosong dianggap 0.',
    'Tanggal setelah hari ini tersimpan sebagai "Rencana" dan baru dihitung dalam statistik setelah tanggalnya tiba.',
    'Baris yang isinya sama persis dengan data yang sudah ada akan dilewati (aman mengunggah file yang sama dua kali).',
    'Satu file maksimum 2.000 baris dan 2 MB. Unggah akan menampilkan pratinjau dan Anda memilih menyimpan atau tidak.',
    'Yang diisi pada kolom sertifikat adalah jumlah ORANG yang diterbitkan sertifikatnya, bukan jumlah pemeriksaan.',
  ].forEach((t) => pt.addRow([t]));
  pt.addRow([]);
  const judul = pt.addRow(['Kolom', 'Wajib', 'Penjelasan', 'Contoh']);
  judul.font = { bold: true };
  for (const k of KOLOM_PESAWAT) pt.addRow([k.header, k.wajib ? 'Ya' : '', k.petunjuk, k.contoh]);
  pt.eachRow((r) => (r.alignment = { vertical: 'top', wrapText: true }));

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------------------------------------------------------- pembaca

export interface BarisExcelMentah {
  nomor: number; // nomor baris di Excel (untuk pesan galat)
  mentah: Record<string, unknown>;
}

export type HasilBacaExcel =
  | { ok: true; baris: BarisExcelMentah[]; peringatan: string[] }
  | { ok: false; galatFile: string };

function nilaiSel(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    const o = v as unknown as Record<string, unknown>;
    if ('result' in o) return nilaiSel(o.result as ExcelJS.CellValue); // sel berumus: pakai hasilnya
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join('');
    if ('text' in o) return String(o.text);
    if ('error' in o) return `#${String(o.error)}`; // sel galat Excel: akan ditolak validasi
    return null;
  }
  return v;
}

const kosong = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

export async function bacaExcelPesawat(buffer: Buffer): Promise<HasilBacaExcel> {
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    return { ok: false, galatFile: 'File bukan Excel .xlsx yang valid. Simpan dari Excel sebagai "Excel Workbook (*.xlsx)".' };
  }

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    return { ok: false, galatFile: 'File Excel rusak atau tidak dapat dibaca.' };
  }
  const ws = wb.getWorksheet('Data') ?? wb.worksheets[0];
  if (!ws) return { ok: false, galatFile: 'File tidak memiliki sheet.' };

  // Cari baris judul
  let barisHeader = 0;
  let petaKolom = new Map<number, DefKolom>();
  for (let r = 1; r <= Math.min(BARIS_HEADER_MAKS, ws.rowCount); r++) {
    const peta = new Map<number, DefKolom>();
    ws.getRow(r).eachCell({ includeEmpty: false }, (c, kol) => {
      const v = nilaiSel(c.value);
      const def = typeof v === 'string' ? PETA_HEADER.get(norm(v)) : undefined;
      if (def && ![...peta.values()].includes(def)) peta.set(kol, def);
    });
    const kunci = new Set([...peta.values()].map((d) => d.kunci));
    if (kunci.has('tanggal') && kunci.has('maskapai')) {
      barisHeader = r;
      petaKolom = peta;
      break;
    }
  }
  if (!barisHeader) {
    return { ok: false, galatFile: 'Judul kolom tidak ditemukan. Pakai template resmi: kolom "Tanggal" dan "Maskapai" harus ada di baris judul.' };
  }

  const peringatan: string[] = [];
  const ada = new Set([...petaKolom.values()].map((d) => d.kunci));
  const hilang = KOLOM_PESAWAT.filter((k) => !ada.has(k.kunci)).map((k) => k.header);
  if (hilang.length > 0) peringatan.push(`Kolom tidak ditemukan dan dianggap kosong/0: ${hilang.join(', ')}.`);

  const baris: BarisExcelMentah[] = [];
  for (let r = barisHeader + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const mentah: Record<string, unknown> = {};
    let adaIsi = false;
    for (const [kol, def] of petaKolom) {
      const v = nilaiSel(row.getCell(kol).value);
      mentah[def.kunci] = v;
      if (!kosong(v)) adaIsi = true;
    }
    if (!adaIsi) continue; // baris kosong dilewati
    baris.push({ nomor: r, mentah });
    if (baris.length > MAKS_BARIS_EXCEL) {
      return { ok: false, galatFile: `File berisi lebih dari ${MAKS_BARIS_EXCEL.toLocaleString('id-ID')} baris. Pecah menjadi beberapa file.` };
    }
  }
  if (baris.length === 0) return { ok: false, galatFile: 'Tidak ada baris data di bawah judul kolom.' };

  return { ok: true, baris, peringatan };
}
