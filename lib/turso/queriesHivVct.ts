import { getTursoClient } from "@/lib/turso/client";

// Catatan: tabel di Turso bernama `hiv_data` dengan kolom `wilayah_kerja`
// dan `hubungan_berisiko` (dibuat/diisi oleh GAS syncHivKeTurso). Di sini
// kolom itu di-alias jadi `wilker` / `hubungan_beresiko` supaya field JS
// yang dipakai di route export Excel/PDF, preview, dan client tidak perlu
// ikut berubah.

export interface BarisHivVct {
  wilker: string;
  no_baris: number;
  tanggal_kegiatan: string; // YYYY-MM-DD
  nik: string;
  nama: string;
  sex: string;
  tanggal_lahir: string;
  alamat: string;
  status_perkawinan: string;
  kunjungan: string;
  hasil: string;
  jenis_reagen: string;
  hubungan_beresiko: string;
}

function tabelBelumAda(err: unknown): boolean {
  const pesan = err instanceof Error ? err.message : String(err);
  return pesan.includes("no such table");
}

/** Daftar wilayah kerja yang ada datanya, untuk isi dropdown filter. */
export async function getWilayahKerjaHiv(): Promise<string[]> {
  try {
    const hasil = await getTursoClient().execute({
      sql: `SELECT DISTINCT wilayah_kerja FROM hiv_data ORDER BY wilayah_kerja`,
      args: [],
    });
    return hasil.rows.map((r: any) => String(r.wilayah_kerja));
  } catch (err) {
    // Tabel belum pernah dibuat (sync GAS belum pernah jalan) -- anggap
    // saja belum ada data, jangan sampai bikin halaman crash.
    if (tabelBelumAda(err)) return [];
    throw err;
  }
}

export interface FilterHivVct {
  tahun: number;
  bulan?: number; // 1-12, omit/undefined = seluruh tahun
  wilker?: string; // omit/undefined = semua wilayah kerja
}

/**
 * Ambil baris data HIV VCT sesuai filter, diurutkan per wilker lalu
 * tanggal kegiatan. Dipakai untuk generate Excel/PDF unduhan & preview.
 */
export async function getBarisHivVct(filter: FilterHivVct): Promise<BarisHivVct[]> {
  const kondisi: string[] = [`strftime('%Y', tanggal_kegiatan) = ?`];
  const args: (string | number)[] = [String(filter.tahun)];

  if (filter.bulan) {
    kondisi.push(`strftime('%m', tanggal_kegiatan) = ?`);
    args.push(String(filter.bulan).padStart(2, "0"));
  }
  if (filter.wilker) {
    kondisi.push(`wilayah_kerja = ?`);
    args.push(filter.wilker);
  }

  let hasil;
  try {
    hasil = await getTursoClient().execute({
      sql: `SELECT wilayah_kerja AS wilker, no_baris, tanggal_kegiatan, nik, nama, sex, tanggal_lahir,
                   alamat, status_perkawinan, kunjungan, hasil, jenis_reagen,
                   hubungan_berisiko AS hubungan_beresiko
            FROM hiv_data
            WHERE ${kondisi.join(" AND ")}
            ORDER BY wilayah_kerja ASC, tanggal_kegiatan ASC, no_baris ASC`,
      args,
    });
  } catch (err) {
    if (tabelBelumAda(err)) return [];
    throw err;
  }

  return hasil.rows.map((r: any) => ({
    wilker: String(r.wilker),
    no_baris: Number(r.no_baris),
    tanggal_kegiatan: String(r.tanggal_kegiatan ?? ""),
    nik: String(r.nik ?? ""),
    nama: String(r.nama ?? ""),
    sex: String(r.sex ?? ""),
    tanggal_lahir: String(r.tanggal_lahir ?? ""),
    alamat: String(r.alamat ?? ""),
    status_perkawinan: String(r.status_perkawinan ?? ""),
    kunjungan: String(r.kunjungan ?? ""),
    hasil: String(r.hasil ?? ""),
    jenis_reagen: String(r.jenis_reagen ?? ""),
    hubungan_beresiko: String(r.hubungan_beresiko ?? ""),
  }));
}