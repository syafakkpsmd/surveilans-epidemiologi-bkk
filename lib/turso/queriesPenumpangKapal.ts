import { hitungMingguEpidemiologi } from "@/lib/epi-week";
// SESUAIKAN import ini dengan client Turso yang sudah dipakai project,
// mis. lib/turso/client.ts yang sudah ada (dipakai untuk data_icv).
import { getTursoClient } from '@/lib/turso/client';

const tursoClient = getTursoClient();

interface BarisPenumpangKapal {
  tanggal_tiba: string | null; // YYYY-MM-DD, null kalau kapal belum berangkat / doking
  tanggal_berangkat: string | null; // YYYY-MM-DD, null kalau belum diisi / doking
  penumpang_datang: number;
  penumpang_berangkat: number;
}

/**
 * Ambil semua baris yang RELEVAN untuk rentang tahun kalender [tahunAwal, tahunAkhir]:
 * yaitu baris yang tanggal_tiba ATAU tanggal_berangkat-nya jatuh di rentang itu.
 * Kedua kolom tanggal independen -- kedatangan & keberangkatan dari 1 baris
 * yang sama bisa saja jatuh di bulan/tahun kalender yang berbeda (kapal
 * berlabuh lama), jadi keduanya diambil lalu dikelompokkan terpisah nanti.
 */
async function ambilBarisRentangTahun(
  tahunAwal: number,
  tahunAkhir: number
): Promise<BarisPenumpangKapal[]> {
  const awal = `${tahunAwal}-01-01`;
  const akhir = `${tahunAkhir}-12-31`;

  const hasil = await tursoClient.execute({
    sql: `SELECT tanggal_tiba, tanggal_berangkat, penumpang_datang, penumpang_berangkat
          FROM data_penumpang_kapal
          WHERE (tanggal_tiba IS NOT NULL AND tanggal_tiba BETWEEN ? AND ?)
             OR (tanggal_berangkat IS NOT NULL AND tanggal_berangkat BETWEEN ? AND ?)`,
    args: [awal, akhir, awal, akhir],
  });

  return hasil.rows.map((r: any) => ({
    tanggal_tiba: r.tanggal_tiba ? String(r.tanggal_tiba) : null,
    tanggal_berangkat: r.tanggal_berangkat ? String(r.tanggal_berangkat) : null,
    penumpang_datang: Number(r.penumpang_datang) || 0,
    penumpang_berangkat: Number(r.penumpang_berangkat) || 0,
  }));
}

function parseTanggal(tanggal: string | null): Date | null {
  if (!tanggal) return null;
  const tgl = new Date(tanggal + "T00:00:00");
  return Number.isNaN(tgl.getTime()) ? null : tgl;
}

/**
 * Ambil total penumpang kapal per minggu epidemiologi, digabung dari sheet
 * Samarinda + Lhoktuan (tidak dipisah per wilker, mengikuti pola dashboard
 * ABK/Crew/Penumpang yang sudah ada).
 *
 * PENTING: kedatangan dihitung dari tanggal_tiba, keberangkatan dari
 * tanggal_berangkat -- keduanya dikelompokkan SECARA TERPISAH per baris,
 * jadi kapal yang tiba di minggu X tapi baru berangkat di minggu Y (atau
 * belum berangkat sama sekali / tanggal_berangkat masih kosong) tetap
 * tercatat benar di masing-masing peta tanpa saling memengaruhi.
 *
 * Ambil data 1 tahun kalender sebelum & sesudah karena minggu epid awal/akhir
 * tahun bisa "menyeberang" tahun kalender.
 */
export async function getPenumpangKapalMingguan(
  tahunEpid: number
): Promise<{ petaDatang: Map<number, number>; petaBerangkat: Map<number, number> }> {
  const baris = await ambilBarisRentangTahun(tahunEpid - 1, tahunEpid + 1);

  const petaDatang = new Map<number, number>();
  const petaBerangkat = new Map<number, number>();

  baris.forEach((b) => {
    const tglTiba = parseTanggal(b.tanggal_tiba);
    if (tglTiba) {
      const { tahunEpid: teTiba, mingguEpid: mgTiba } = hitungMingguEpidemiologi(tglTiba);
      if (teTiba === tahunEpid) {
        petaDatang.set(mgTiba, (petaDatang.get(mgTiba) ?? 0) + b.penumpang_datang);
      }
    }

    const tglBerangkat = parseTanggal(b.tanggal_berangkat);
    if (tglBerangkat) {
      const { tahunEpid: teBerangkat, mingguEpid: mgBerangkat } = hitungMingguEpidemiologi(tglBerangkat);
      if (teBerangkat === tahunEpid) {
        petaBerangkat.set(mgBerangkat, (petaBerangkat.get(mgBerangkat) ?? 0) + b.penumpang_berangkat);
      }
    }
  });

  return { petaDatang, petaBerangkat };
}

/**
 * Ambil total penumpang kapal per bulan kalender, digabung dari sheet
 * Samarinda + Lhoktuan. Sama seperti versi mingguan, kedatangan (tanggal_tiba)
 * dan keberangkatan (tanggal_berangkat) dikelompokkan terpisah per baris.
 */
export async function getPenumpangKapalBulanan(
  tahunKalender: number
): Promise<{ petaDatang: Map<number, number>; petaBerangkat: Map<number, number> }> {
  const baris = await ambilBarisRentangTahun(tahunKalender, tahunKalender);

  const petaDatang = new Map<number, number>();
  const petaBerangkat = new Map<number, number>();

  baris.forEach((b) => {
    if (b.tanggal_tiba && b.tanggal_tiba.startsWith(String(tahunKalender))) {
      const bulan = Number(b.tanggal_tiba.split("-")[1]);
      if (bulan) petaDatang.set(bulan, (petaDatang.get(bulan) ?? 0) + b.penumpang_datang);
    }

    if (b.tanggal_berangkat && b.tanggal_berangkat.startsWith(String(tahunKalender))) {
      const bulan = Number(b.tanggal_berangkat.split("-")[1]);
      if (bulan) petaBerangkat.set(bulan, (petaBerangkat.get(bulan) ?? 0) + b.penumpang_berangkat);
    }
  });

  return { petaDatang, petaBerangkat };
}