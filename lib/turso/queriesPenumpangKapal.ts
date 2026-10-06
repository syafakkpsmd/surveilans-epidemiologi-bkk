import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { getTursoClient } from "@/lib/turso/client";

// =============================================================
// Agregat mingguan/bulanan (dipakai chart ABK/Crew/Penumpang) --
// dijumlahkan lintas wilker, cuma butuh tanggal_tiba + penumpang_datang/berangkat.
// =============================================================

interface BarisPenumpangKapal {
  tanggal_tiba: string; // YYYY-MM-DD
  penumpang_datang: number;
  penumpang_berangkat: number;
}

/** "Tanjung Santan" / "TanjungSantan" -> "tanjungsantan" (pembanding wilker yang tahan beda spasi/huruf besar). */
function normalisasiWilker(nama: string): string {
  return nama.replace(/\s+/g, "").toLowerCase();
}

async function ambilBarisTahun(tahun: number, wilker?: string): Promise<BarisPenumpangKapal[]> {
  const args: (string | number)[] = [String(tahun)];
  let kondisiWilker = "";
  if (wilker) {
    kondisiWilker = ` AND REPLACE(LOWER(wilker), ' ', '') = ?`;
    args.push(normalisasiWilker(wilker));
  }

  const hasil = await getTursoClient().execute({
    sql: `SELECT tanggal_tiba, penumpang_datang, penumpang_berangkat
          FROM data_penumpang_kapal
          WHERE strftime('%Y', tanggal_tiba) = ?${kondisiWilker}`,
    args,
  });

  return hasil.rows.map((r: any) => ({
    tanggal_tiba: String(r.tanggal_tiba ?? ""),
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
  tahunEpid: number,
  wilker?: string
): Promise<{ petaDatang: Map<number, number>; petaBerangkat: Map<number, number> }> {
  // 3 tahun diambil PARALEL (sebelumnya 3 await berurutan = 3x round-trip Turso).
  const [sebelum, ini, sesudah] = await Promise.all([
    ambilBarisTahun(tahunEpid - 1, wilker),
    ambilBarisTahun(tahunEpid, wilker),
    ambilBarisTahun(tahunEpid + 1, wilker),
  ]);
  const baris = [...sebelum, ...ini, ...sesudah];

  const petaDatang = new Map<number, number>();
  const petaBerangkat = new Map<number, number>();

  baris.forEach((b) => {
    if (!b.tanggal_tiba) return;
    const tgl = new Date(b.tanggal_tiba + "T00:00:00");
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
  tahunKalender: number,
  wilker?: string
): Promise<{ petaDatang: Map<number, number>; petaBerangkat: Map<number, number> }> {
  const baris = await ambilBarisTahun(tahunKalender, wilker);

  const petaDatang = new Map<number, number>();
  const petaBerangkat = new Map<number, number>();

  baris.forEach((b) => {
    if (!b.tanggal_tiba) return;
    const bulan = Number(b.tanggal_tiba.split("-")[1]);
    if (!bulan) return;
    petaDatang.set(bulan, (petaDatang.get(bulan) ?? 0) + b.penumpang_datang);
    petaBerangkat.set(bulan, (petaBerangkat.get(bulan) ?? 0) + b.penumpang_berangkat);
  });

  return { petaDatang, petaBerangkat };
}

// =============================================================
// Listing MENTAH (bukan agregat) untuk dashboard Lalu Lintas Orang --
// menampilkan 1 baris per pelayaran, bukan dijumlahkan per periode.
// =============================================================

export interface BarisPenumpangKapalMentah {
  wilker: string;
  no_baris: number;
  tanggal_tiba: string;
  tanggal_berangkat: string;
  nama_kapal: string;
  abk_datang: number;
  abk_berangkat: number;
  penumpang_datang: number;
  penumpang_berangkat: number;
  siaos: string;
  keterangan: string;
}

export interface FilterPenumpangKapalMentah {
  tahun: number;
  granularitas: "mingguan" | "bulanan";
  awal: number; // minggu 1-53 atau bulan 1-12
  akhir: number;
  wilker?: string;
}

/**
 * Ambil daftar pelayaran mentah, difilter rentang minggu/bulan epidemiologi
 * berdasar tanggal_tiba. Dipakai untuk tabel Penumpang Kapal di dashboard
 * Lalu Lintas Orang (bukan untuk chart agregat).
 *
 * Baris dengan tanggal_tiba kosong (kapal baru berangkat/doking, sesuai
 * skema GAS terbaru) tidak lolos filter rentang minggu/bulan -- baris itu
 * memang tidak punya "kapan" untuk dikelompokkan, jadi tidak akan pernah
 * muncul di tabel manapun sampai tanggal_tiba diisi.
 */
export async function getPenumpangKapalMentah(
  filter: FilterPenumpangKapalMentah
): Promise<BarisPenumpangKapalMentah[]> {
  // Ambil 1 tahun kalender sebelum & sesudah karena minggu epid awal/akhir
  // tahun bisa "menyeberang" tahun kalender (sama pola dengan getPenumpangKapalMingguan).
  const tahunYangDiambil =
    filter.granularitas === "mingguan"
      ? [filter.tahun - 1, filter.tahun, filter.tahun + 1]
      : [filter.tahun];

  const kondisiTahun = tahunYangDiambil.map(() => `strftime('%Y', tanggal_tiba) = ?`).join(" OR ");
  const args: (string | number)[] = tahunYangDiambil.map(String);

  let kondisiWilker = "";
  if (filter.wilker) {
    kondisiWilker = ` AND wilker = ?`;
    args.push(filter.wilker);
  }

  let hasil;
  try {
    hasil = await getTursoClient().execute({
      sql: `SELECT wilker, no_baris, tanggal_tiba, tanggal_berangkat, nama_kapal,
                   abk_datang, abk_berangkat, penumpang_datang, penumpang_berangkat, siaos, keterangan
            FROM data_penumpang_kapal
            WHERE (${kondisiTahun})${kondisiWilker}
            ORDER BY wilker ASC, tanggal_tiba ASC, no_baris ASC`,
      args,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("no such table")) return [];
    throw err;
  }

  const semuaBaris: BarisPenumpangKapalMentah[] = hasil.rows.map((r: any) => ({
    wilker: String(r.wilker ?? ""),
    no_baris: Number(r.no_baris),
    tanggal_tiba: String(r.tanggal_tiba ?? ""),
    tanggal_berangkat: String(r.tanggal_berangkat ?? ""),
    nama_kapal: String(r.nama_kapal ?? ""),
    abk_datang: Number(r.abk_datang) || 0,
    abk_berangkat: Number(r.abk_berangkat) || 0,
    penumpang_datang: Number(r.penumpang_datang) || 0,
    penumpang_berangkat: Number(r.penumpang_berangkat) || 0,
    siaos: String(r.siaos ?? ""),
    keterangan: String(r.keterangan ?? ""),
  }));

  // Filter rentang minggu/bulan di JS (epi-week tidak bisa dihitung di SQLite).
  return semuaBaris.filter((b) => {
    if (!b.tanggal_tiba) return false;
    const tgl = new Date(b.tanggal_tiba + "T00:00:00");
    if (Number.isNaN(tgl.getTime())) return false;

    if (filter.granularitas === "mingguan") {
      const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(tgl);
      return tahunEpid === filter.tahun && mingguEpid >= filter.awal && mingguEpid <= filter.akhir;
    }
    const bulan = tgl.getMonth() + 1;
    return tgl.getFullYear() === filter.tahun && bulan >= filter.awal && bulan <= filter.akhir;
  });
}

/** Daftar wilayah kerja yang ada datanya di data_penumpang_kapal, untuk dropdown filter. */
export async function getWilayahKerjaPenumpangKapal(): Promise<string[]> {
  try {
    const hasil = await getTursoClient().execute({
      sql: `SELECT DISTINCT wilker FROM data_penumpang_kapal ORDER BY wilker`,
      args: [],
    });
    return hasil.rows.map((r: any) => String(r.wilker));
  } catch (err) {
    if (err instanceof Error && err.message.includes("no such table")) return [];
    throw err;
  }
}