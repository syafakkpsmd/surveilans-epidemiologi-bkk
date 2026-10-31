// lib/klinik/stok-excel.ts
// Membaca Excel stok (ICV/e-ICV dan vaksin) -> entri tervalidasi. SERVER-ONLY (exceljs). Menerima judul kolom template
// maupun judul tab Sheets lama ("Stok Pelayanan", "E-ICV Terbit", "Vaksin Rusak", ...); kolom "Sisa" diabaikan (dihitung ulang).
import ExcelJS from 'exceljs';
import { kunciJudul } from '@/lib/input-data/modul';
import { bacaGrid, petakanKolom } from '@/lib/input-data/parse-excel';
import { selMentah } from '@/lib/input-data/nilai';
import { tentukanUrutanKolom, type UrutanTanggal } from '@/lib/tanggal/parse-tanggal';
import { JENIS_STOK_INPUT, validasiStok, type EntriStok } from './stok-input';

const MAKS_BYTE = 10 * 1024 * 1024;
const MAKS_BARIS = 5000;

const JUDUL: [string, string[]][] = [
  ['jenis', ['Jenis Stok', 'Jenis', 'Jenis Vaksin', 'Vaksin']],
  ['tanggal', ['Tanggal']],
  ['masuk', ['Stok Masuk', 'Stok Pelayanan', 'Masuk', 'Stok Baru']],
  ['terbit', ['Terbit', 'Vaksin Terbit', 'E-ICV Terbit', 'ICV Terbit', 'e-ICV Terbit']],
  ['rusak', ['Rusak', 'Vaksin Rusak']],
  ['keterangan', ['Keterangan']],
];

export interface HasilBacaStok {
  fatal: string | null;
  jumlahBaris: number;
  sah: { baris: number; nilai: EntriStok; peringatan: string[] }[];
  galat: { baris: number; pesan: string[] }[];
  kolomDiabaikan: string[];
  urutanTanggal: UrutanTanggal | null;
}

export async function bacaExcelStok(buffer: Buffer, opsi: { hariIni?: Date; jenisBawaan?: string } = {}): Promise<HasilBacaStok> {
  const kosong: HasilBacaStok = { fatal: null, jumlahBaris: 0, sah: [], galat: [], kolomDiabaikan: [], urutanTanggal: null };
  if (buffer.byteLength > MAKS_BYTE) return { ...kosong, fatal: `Berkas lebih dari ${MAKS_BYTE / 1024 / 1024} MB.` };
  const g = await bacaGrid(buffer);
  if ('fatal' in g) return { ...kosong, fatal: g.fatal };

  const peta = new Map<string, string>();
  for (const [nama, daftar] of JUDUL) for (const j of daftar) peta.set(kunciJudul(j), nama);
  const pk = petakanKolom(g.grid, peta);
  if (!pk) return { ...kosong, fatal: 'Baris judul kolom tidak ditemukan. Gunakan template dari tombol "Unduh template".' };

  const ada = new Set(pk.kolomKe.values());
  if (!ada.has('tanggal')) return { ...kosong, kolomDiabaikan: pk.diabaikan, fatal: 'Kolom wajib tidak ditemukan: Tanggal.' };
  if (!['masuk', 'terbit', 'rusak'].some((k) => ada.has(k))) {
    return { ...kosong, kolomDiabaikan: pk.diabaikan, fatal: 'Tidak ada kolom angka: perlu salah satu dari Stok Masuk, Terbit, atau Rusak.' };
  }
  if (!ada.has('jenis') && !opsi.jenisBawaan) {
    return { ...kosong, kolomDiabaikan: pk.diabaikan, fatal: 'Kolom Jenis Stok tidak ada. Tambahkan kolomnya, atau pilih jenis stok di atas sebelum memeriksa berkas.' };
  }

  const baris: { r: number; mentah: Record<string, unknown> }[] = [];
  for (let r = pk.barisJudul + 1; r < g.grid.length; r++) {
    const mentah: Record<string, unknown> = {};
    for (const [n, nama] of pk.kolomKe) mentah[nama] = selMentah(g.grid[r][n]);
    const tanpaIsi = (v: unknown) => v === null || v === undefined || String(v).trim() === '';
    // baris yang hanya berisi tanggal (sisa templat Sheets sampai Desember) bukan data
    if (tanpaIsi(mentah.masuk) && tanpaIsi(mentah.terbit) && tanpaIsi(mentah.rusak) && tanpaIsi(mentah.keterangan)) continue;
    if (baris.length >= MAKS_BARIS) return { ...kosong, kolomDiabaikan: pk.diabaikan, fatal: `Berkas lebih dari ${MAKS_BARIS} baris data. Pecah menjadi beberapa berkas.` };
    baris.push({ r: r + 1, mentah });
  }

  const sk = tentukanUrutanKolom(baris.map((b) => b.mentah.tanggal));
  const hasil: HasilBacaStok = { ...kosong, kolomDiabaikan: pk.diabaikan, jumlahBaris: baris.length, urutanTanggal: sk.urutan };
  if (sk.bertentangan) return { ...hasil, fatal: 'Kolom Tanggal bercampur dua gaya (hari/bulan dan bulan/hari). Samakan formatnya lalu unggah ulang.' };

  const terlihat = new Map<string, number>();
  for (const b of baris) {
    const h = validasiStok(b.mentah, { hariIni: opsi.hariIni, urutan: sk.urutan, jenisBawaan: opsi.jenisBawaan });
    if (!h.nilai) { hasil.galat.push({ baris: b.r, pesan: h.galat }); continue; }
    const kunci = `${h.nilai.jenis}|${h.nilai.tanggal}`;
    const pertama = terlihat.get(kunci);
    if (pertama !== undefined) { hasil.galat.push({ baris: b.r, pesan: [`Jenis dan tanggal sama dengan baris ${pertama} di berkas`] }); continue; }
    terlihat.set(kunci, b.r);
    hasil.sah.push({ baris: b.r, nilai: h.nilai, peringatan: h.peringatan });
  }
  return hasil;
}

export async function buatTemplateStok(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Stok');
  ws.addRow(['Jenis Stok', 'Tanggal', 'Stok Masuk', 'Terbit', 'Rusak', 'Keterangan']);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  [16, 14, 12, 10, 10, 40].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.getColumn(2).numFmt = 'dd/mm/yyyy';
  const p = wb.addWorksheet('Petunjuk');
  for (const t of [
    `Jenis Stok: ${JENIS_STOK_INPUT.map((j) => j.label).join(', ')} (boleh kosong bila jenis dipilih di halaman unggah).`,
    'Satu baris per tanggal per jenis. Stok Masuk = tambahan stok ke pelayanan pada hari itu (stok awal diisi sebagai Stok Masuk di tanggal mulai).',
    'Terbit = jumlah yang dipakai/diterbitkan hari itu; Rusak = yang rusak. Kolom Sisa TIDAK perlu diisi (dihitung otomatis).',
    'Tanggal: HH/BB/TTTT (mis. 27/10/2026), TTTT-BB-HH, atau "27 Oktober 2026"; tidak boleh lebih dari besok.',
    'Tanggal yang sudah terisi di aplikasi akan DIGANTI oleh isi berkas. Unggahan ditolak bila membuat sisa stok negatif.',
    'Judul kolom tab Sheets lama juga dikenali (Stok Pelayanan, E-ICV Terbit, Vaksin Terbit, Vaksin Rusak); kolom Sisa diabaikan.',
  ]) p.addRow([t]);
  p.getColumn(1).width = 130;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
