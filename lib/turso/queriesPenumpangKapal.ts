import { hitungMingguEpidemiologi } from "@/lib/epi-week";
// SESUAIKAN import ini dengan client Turso yang sudah dipakai project,
// mis. lib/turso/client.ts yang sudah ada (dipakai untuk data_icv).
// Contoh umum: import { tursoClient } from "@/lib/turso/client";
import { getTursoClient } from '@/lib/turso/client';

const tursoClient = getTursoClient();

interface BarisPenumpangKapal {
  tanggal: string; // YYYY-MM-DD
  penumpang_datang: number;
  penumpang_berangkat: number;
}

async function ambilBarisTahun(tahun: number): Promise<BarisPenumpangKapal[]> {
  const hasil = await tursoClient.execute({
    sql: `SELECT tanggal, penumpang_datang, penumpang_berangkat
          FROM data_penumpang_kapal
          WHERE strftime('%Y', tanggal) = ?`,
    args: [String(tahun)],
  });

  return hasil.rows.map((r: any) => ({
    tanggal: String(r.tanggal),
    penumpang_datang: Number(r.penumpang_datang) || 0,
    penumpang_berangkat: Number(r.penumpang_berangkat) || 0,
  }));
}

/**
 * Ambil total penumpang kapal (datang & berangkat) per minggu epidemiologi,
 * digabung dari sheet Samarinda + Lhoktuan (tidak dipisah per wilker,
 * mengikuti pola dashboard ABK/Crew/Penumpang yang sudah ada).
 *
 * Ambil data 1 tahun kalender sebelum & sesudah karena minggu epid awal/akhir
 * tahun bisa "menyeberang" tahun kalender.
 */
export async function getPenumpangKapalMingguan(
  tahunEpid: number
): Promise<{ petaDatang: Map<number, number>; petaBerangkat: Map<number, number> }> {
  const baris = [
    ...(await ambilBarisTahun(tahunEpid - 1)),
    ...(await ambilBarisTahun(tahunEpid)),
    ...(await ambilBarisTahun(tahunEpid + 1)),
  ];

  const petaDatang = new Map<number, number>();
  const petaBerangkat = new Map<number, number>();

  baris.forEach((b) => {
    const tgl = new Date(b.tanggal + "T00:00:00");
    if (Number.isNaN(tgl.getTime())) return;

    const { tahunEpid: teBaris, mingguEpid } = hitungMingguEpidemiologi(tgl);
    if (teBaris !== tahunEpid) return;

    petaDatang.set(mingguEpid, (petaDatang.get(mingguEpid) ?? 0) + b.penumpang_datang);
    petaBerangkat.set(mingguEpid, (petaBerangkat.get(mingguEpid) ?? 0) + b.penumpang_berangkat);
  });

  return { petaDatang, petaBerangkat };
}

/**
 * Ambil total penumpang kapal (datang & berangkat) per bulan kalender,
 * digabung dari sheet Samarinda + Lhoktuan.
 */
export async function getPenumpangKapalBulanan(
  tahunKalender: number
): Promise<{ petaDatang: Map<number, number>; petaBerangkat: Map<number, number> }> {
  const baris = await ambilBarisTahun(tahunKalender);

  const petaDatang = new Map<number, number>();
  const petaBerangkat = new Map<number, number>();

  baris.forEach((b) => {
    const bulan = Number(b.tanggal.split("-")[1]);
    if (!bulan) return;
    petaDatang.set(bulan, (petaDatang.get(bulan) ?? 0) + b.penumpang_datang);
    petaBerangkat.set(bulan, (petaBerangkat.get(bulan) ?? 0) + b.penumpang_berangkat);
  });

  return { petaDatang, petaBerangkat };
}