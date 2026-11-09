// lib/input-data/tanggal-kolom.ts  (FILE BARU)
// Penghubung antara parse-excel.ts dan lib/tanggal/parse-tanggal.ts.
// Murni (tanpa database). Dipakai hanya oleh modul yang memasang `pakaiParseTanggal: true`.
//
// Cara kerja:
//  1. Sebelum baris dibaca satu per satu, SELURUH isi tiap kolom tanggal dipindai dengan
//     tentukanUrutanKolom() -> kolom itu hari-bulan (dmy) atau bulan-hari (mdy) atau belum pasti.
//  2. Tiap sel diurai dengan parseTanggal() memakai urutan hasil pemindaian (bawaan 'dmy').
//  3. Hasilnya string 'YYYY-MM-DD' yang lalu diteruskan ke validasiBaris() seperti biasa.
//
// Galat (baris ditolak): tanggal tidak terbaca / tidak valid / tahun di luar rentang.
// Peringatan (baris tetap masuk, tetapi ditandai di pratinjau): tanggal ambigu yang urutannya
// tidak bisa dipastikan, dan tanggal lebih dari 1 hari ke depan (kemungkinan salah ketik).
import { parseTanggal, tentukanUrutanKolom, type UrutanTanggal } from '@/lib/tanggal/parse-tanggal';
import { teksKosong } from './nilai';

export interface PeringatanBaris {
  baris: number;
  pesan: string[];
}

export interface HasilSiapTanggal {
  nilai: unknown;
  galat?: string;
  peringatan?: string;
}

export interface PenyiapTanggal {
  /** opsi.masaDepanBoleh: kolom yang wajar berisi tanggal ke depan (mis. batas waktu tindak lanjut): tidak diberi peringatan. */
  siapkan(namaKolom: string, nilai: unknown, opsi?: { masaDepanBoleh?: boolean; tahunMin?: number; tahunMaks?: number }): HasilSiapTanggal;
  // opsi.tahunMin/tahunMaks: rentang tahun wajar kolom ini (bawaan parseTanggal: 2000 sampai tahun depan). Tanggal lahir memakai rentangTanggalLahir().
  /** Catatan untuk seluruh berkas, mis. kolom bercampur dua gaya tanggal. */
  peringatanUmum: string[];
}

export function buatPenyiapTanggal(
  nilaiPerKolom: Record<string, unknown[]>,
  labelKolom: Record<string, string>,
): PenyiapTanggal {
  const urutanKolom = new Map<string, UrutanTanggal | null>();
  const peringatanUmum: string[] = [];

  for (const [nama, nilai] of Object.entries(nilaiPerKolom)) {
    const s = tentukanUrutanKolom(nilai);
    urutanKolom.set(nama, s.urutan);
    if (s.bertentangan) {
      peringatanUmum.push(
        `Kolom "${labelKolom[nama] ?? nama}" bercampur dua gaya tanggal (${s.buktiDmy} baris hari/bulan, ${s.buktiMdy} baris bulan/hari). ` +
          'Angka yang ambigu dibaca hari/bulan/tahun; periksa baris bertanda peringatan.',
      );
    }
  }

  return {
    peringatanUmum,
    siapkan(namaKolom, nilai, opsi = {}) {
      if (teksKosong(nilai)) return { nilai }; // kosong: biarkan validasiBaris yang memutuskan (wajib atau tidak)
      // exceljs menyerahkan sel tanggal sebagai Date pada tengah malam UTC. parseTanggal membaca komponen LOKAL,
      // jadi bangun ulang Date lokal dari komponen UTC agar hari tidak bergeser di server dengan zona waktu apa pun.
      if (nilai instanceof Date && !Number.isNaN(nilai.getTime())) {
        nilai = new Date(nilai.getUTCFullYear(), nilai.getUTCMonth(), nilai.getUTCDate());
      }
      const urutan = urutanKolom.get(namaKolom) ?? null;
      const r = parseTanggal(nilai, { urutanAmbigu: urutan ?? 'dmy', tahunMin: opsi.tahunMin, tahunMaks: opsi.tahunMaks });
      if (!r.iso) return { nilai, galat: r.pesan ?? 'tanggal tidak terbaca' };

      const peringatan: string[] = [];
      // Bila urutan kolom sudah terbukti dari baris lain, angka ambigu pasti mengikutinya: tidak perlu ditandai.
      if (r.ambigu && urutan === null) peringatan.push(r.pesan ?? 'ambigu (dibaca hari/bulan/tahun)');
      if (r.masaDepan && !opsi.masaDepanBoleh) peringatan.push('tanggal lebih dari 1 hari ke depan, periksa kemungkinan salah ketik');
      return { nilai: r.iso, ...(peringatan.length ? { peringatan: peringatan.join('; ') } : {}) };
    },
  };
}
