// lib/klinik/icv-excel.ts
//
// Membaca berkas Excel data ICV / e-ICV (unduhan sheet lama atau template), memvalidasi tiap baris dengan validasiIcv(),
// dan membuat template kosong. SERVER-ONLY (exceljs lewat lib/input-data/parse-excel).
// Tanggal teks yang ambigu (mis. 02/01/2026) diselesaikan per kolom: bila ada satu saja nilai seperti 25/10/2026 di kolom itu,
// seluruh kolom dibaca hari/bulan/tahun (tentukanUrutanKolom). Selebihnya dibaca hari/bulan/tahun (gaya Indonesia) dan ditandai.
import ExcelJS from 'exceljs';
import { MAKS_BARIS, MAKS_BYTE, bacaGrid, petakanKolom, type GalatBaris } from '@/lib/input-data/parse-excel';
import { kunciJudul } from '@/lib/input-data/modul';
import { selMentah } from '@/lib/input-data/nilai';
import { tentukanUrutanKolom, type UrutanTanggal } from '@/lib/tanggal/parse-tanggal';
import { JUDUL_ICV, OPSI_KOMORBID, OPSI_LAYANAN, OPSI_VAKSIN, judulDikenali, kunciDokumen, validasiIcv, type MentahIcv } from './icv-input';

export interface BarisSah { baris: number; nilai: Record<string, string>; peringatan: string[] }
export interface HasilBacaIcv {
  fatal: string | null;
  jumlahBaris: number;
  sah: BarisSah[];
  galat: GalatBaris[];
  kolomDiabaikan: string[];
  /** urutan hari/bulan yang disimpulkan per kolom tanggal (null = tidak ada bukti, dibaca hari/bulan) */
  urutan: Record<string, UrutanTanggal | null>;
}

const KOLOM_TANGGAL = ['Tanggal Terbit', 'Tanggal Lahir', 'Tanggal Berangkat', 'Masa Berlaku MM Sampai'];

export async function bacaExcelIcv(buffer: Buffer, opsi: { hariIni?: Date } = {}): Promise<HasilBacaIcv> {
  const kosong: HasilBacaIcv = { fatal: null, jumlahBaris: 0, sah: [], galat: [], kolomDiabaikan: [], urutan: {} };
  if (buffer.byteLength > MAKS_BYTE) return { ...kosong, fatal: `Berkas lebih dari ${MAKS_BYTE / 1024 / 1024} MB.` };

  const g = await bacaGrid(buffer);
  if ('fatal' in g) return { ...kosong, fatal: g.fatal };

  const peta = new Map<string, string>();
  for (const j of judulDikenali()) peta.set(kunciJudul(j), j);
  peta.set(kunciJudul('No Dokumen'), 'No Dokumen ICV / e-ICV');
  peta.set(kunciJudul('No. Dokumen ICV'), 'No Dokumen ICV / e-ICV');
  const pk = petakanKolom(g.grid, peta);
  if (!pk) return { ...kosong, fatal: 'Baris judul kolom tidak ditemukan. Gunakan template dari tombol "Unduh template".' };

  const ada = new Set(pk.kolomKe.values());
  const hilang = ['No Dokumen ICV / e-ICV', 'Tanggal Terbit', 'Nama', 'Tanggal Lahir', 'Jenis Kelamin'].filter((k) => !ada.has(k));
  if (hilang.length) return { ...kosong, kolomDiabaikan: pk.diabaikan, fatal: `Kolom wajib tidak ditemukan: ${hilang.join(', ')}.` };

  // baris data -> objek mentah
  const baris: { r: number; mentah: MentahIcv }[] = [];
  for (let r = pk.barisJudul + 1; r < g.grid.length; r++) {
    const row = g.grid[r];
    const mentah: MentahIcv = {};
    let isi = false;
    for (const [n, nama] of pk.kolomKe) {
      const v = selMentah(row[n]);
      mentah[nama] = v;
      if (v !== null && String(v).trim() !== '') isi = true;
    }
    if (!isi) continue;
    if (baris.length >= MAKS_BARIS) return { ...kosong, kolomDiabaikan: pk.diabaikan, fatal: `Berkas lebih dari ${MAKS_BARIS} baris data. Pecah menjadi beberapa berkas.` };
    baris.push({ r: r + 1, mentah }); // nomor baris 1-based seperti di Excel
  }

  // urutan hari/bulan per kolom tanggal dari seluruh isi kolom
  const urutan: Record<string, UrutanTanggal | null> = {};
  for (const k of KOLOM_TANGGAL) {
    const s = tentukanUrutanKolom(baris.map((b) => b.mentah[k]));
    urutan[k] = s.bertentangan ? null : s.urutan;
  }
  const bertentangan = KOLOM_TANGGAL.filter((k) => tentukanUrutanKolom(baris.map((b) => b.mentah[k])).bertentangan);

  const hasil: HasilBacaIcv = { ...kosong, kolomDiabaikan: pk.diabaikan, urutan, jumlahBaris: baris.length };
  if (bertentangan.length) {
    return { ...hasil, fatal: `Kolom ${bertentangan.join(', ')} bercampur dua gaya tanggal (hari/bulan dan bulan/hari). Samakan format kolom itu lalu unggah ulang.` };
  }

  const terlihat = new Map<string, number>();
  for (const b of baris) {
    const h = validasiIcv(b.mentah, { urutan, hariIni: opsi.hariIni });
    if (!h.nilai) { hasil.galat.push({ baris: b.r, pesan: h.galat }); continue; }
    const kd = kunciDokumen(h.nilai['No Dokumen ICV / e-ICV']);
    const pertama = terlihat.get(kd);
    if (pertama !== undefined) { hasil.galat.push({ baris: b.r, pesan: [`No Dokumen ICV / e-ICV sama dengan baris ${pertama} di berkas`] }); continue; }
    terlihat.set(kd, b.r);
    hasil.sah.push({ baris: b.r, nilai: h.nilai, peringatan: h.peringatan });
  }
  return hasil;
}

export async function buatTemplateIcv(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data ICV');
  ws.addRow(JUDUL_ICV);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  JUDUL_ICV.forEach((j, i) => {
    const kol = ws.getColumn(i + 1);
    kol.width = Math.max(14, j.length + 4);
    if (['NIK', 'No Paspor', 'No HP', 'No HP Travel', 'No Dokumen ICV / e-ICV'].includes(j)) kol.numFmt = '@'; // teks: NIK 16 digit tidak boleh jadi angka
  });
  const petunjuk = wb.addWorksheet('Petunjuk');
  for (const t of [
    'Kolom wajib: No Dokumen ICV / e-ICV, Tanggal Terbit, Nama, Tanggal Lahir, Jenis Kelamin, dan Jenis Vaksin 1 (untuk layanan Vaksinasi).',
    'Tanggal: HH/BB/TTTT (mis. 27/10/2026), TTTT-BB-HH, atau "27 Oktober 2026". Sel tanggal asli Excel juga diterima.',
    'NIK dan No Paspor: format sel Teks agar digit tidak rusak. Jenis Kelamin: Laki-laki atau Perempuan. WUS (hanya Perempuan): Ya atau Tidak.',
    `Jenis Vaksin 1-3: ${OPSI_VAKSIN.join(', ')} (di luar daftar tetap diterima dengan peringatan).`,
    `Komorbid: satu penyakit per kolom (Komorbid 1, Komorbid 2, ... sampai Komorbid 6), jangan dipisah koma. Contoh: ${OPSI_KOMORBID.slice(0, 4).join(', ')}.`,
    `Jenis Layanan: ${OPSI_LAYANAN.join(', ')} (kosong = Vaksinasi). KIPI: Ya atau Tidak (kosong = Tidak).`,
    'Nomor dokumen yang sudah ada di klinik ini dilewati (tidak menimpa). Kolom lain di luar template diabaikan.',
  ]) petunjuk.addRow([t]);
  petunjuk.getColumn(1).width = 130;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
