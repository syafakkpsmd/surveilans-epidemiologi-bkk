// SERVER-ONLY. Data laporan penyakit infeksi emerging nasional (tabel laporan_penyakit_nasional).
import { getDbClient } from '@/lib/db/client';
import { DAFTAR_PENYAKIT_NASIONAL } from '@/lib/ai/konstanta-penyakit';

/** Penyakit tambahan dari petugas (di luar daftar dasar di kode). */
export async function getPenyakitTambahan(): Promise<string[]> {
  const { rows } = await getDbClient().execute(
    'SELECT nama FROM penyakit_nasional_tambahan WHERE aktif ORDER BY nama ASC'
  );
  return rows.map((r) => String(r.nama));
}

/** Daftar dasar + tambahan, tanpa duplikat (tidak peka huruf besar/kecil). */
export async function getDaftarPenyakit(): Promise<string[]> {
  const dasar = [...DAFTAR_PENYAKIT_NASIONAL] as string[];
  const ada = new Set(dasar.map((p) => p.toLowerCase()));
  const tambahan = (await getPenyakitTambahan()).filter((p) => !ada.has(p.toLowerCase()));
  return [...dasar, ...tambahan];
}

/** Tambah penyakit. Bila sudah ada, nama yang sudah ada dikembalikan (tidak dibuat ganda). */
export async function tambahPenyakit(nama: string): Promise<string> {
  const sudahDasar = (DAFTAR_PENYAKIT_NASIONAL as readonly string[]).find((p) => p.toLowerCase() === nama.toLowerCase());
  if (sudahDasar) return sudahDasar;
  const { rows } = await getDbClient().execute({
    sql: `INSERT INTO penyakit_nasional_tambahan (nama) VALUES (?)
          ON CONFLICT (lower(nama)) DO UPDATE SET aktif = true
          RETURNING nama`,
    args: [nama],
  });
  return String(rows[0].nama);
}

export interface BarisEmerging {
  penyakit: string;
  propinsi: string;
  tahun_epid: number;
  minggu_epid: number;
  jumlah_kasus: number;
  jumlah_kematian: number;
}

// Cadangan bila tabel masih kosong. Bila tabel sudah berisi, ejaan provinsi mengikuti data yang ada.
const PROVINSI_CADANGAN = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi', 'Sumatera Selatan', 'Bengkulu', 'Lampung',
  'Kepulauan Bangka Belitung', 'Kepulauan Riau', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta',
  'Jawa Timur', 'Banten', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Kalimantan Barat',
  'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara',
  'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat', 'Maluku',
  'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
];

export async function getDaftarPropinsi(): Promise<string[]> {
  const { rows } = await getDbClient().execute(
    'SELECT DISTINCT propinsi FROM laporan_penyakit_nasional ORDER BY propinsi ASC'
  );
  const dariDb = rows.map((r) => String(r.propinsi));
  return dariDb.length ? dariDb : PROVINSI_CADANGAN;
}

export async function getDataEmerging(tahun: number, penyakit?: string): Promise<BarisEmerging[]> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT penyakit, propinsi, tahun_epid, minggu_epid, jumlah_kasus, jumlah_kematian
            FROM laporan_penyakit_nasional
           WHERE tahun_epid = ? ${penyakit ? 'AND penyakit = ?' : ''}`,
    args: penyakit ? [tahun, penyakit] : [tahun],
  });
  return rows as BarisEmerging[];
}

export interface InputEmerging {
  penyakit: string;
  tahun: number;
  minggu: number;
  baris: { propinsi: string; kasus: number; kematian: number }[];
}

const MAKS = 1_000_000;

function bilangan(mentah: string, label: string): number | string {
  if (mentah === '') return 0;
  if (!/^\d+$/.test(mentah)) return `${label} harus bilangan bulat tanpa minus atau desimal.`;
  const n = Number(mentah);
  return n > MAKS ? `${label} terlalu besar.` : n;
}

/** Validasi murni. Baris dengan kasus DAN kematian kosong dilewati (tidak ditulis). */
export function validasiInputEmerging(f: FormData, propinsiSah: string[], penyakitSah: string[]): { data: InputEmerging } | { error: string } {
  const penyakit = String(f.get('penyakit') ?? '').trim();
  if (!penyakitSah.includes(penyakit)) return { error: 'Penyakit tidak valid.' };

  const tahun = Number(f.get('tahun'));
  if (!Number.isInteger(tahun) || tahun < 2020 || tahun > 2100) return { error: 'Tahun tidak valid.' };
  const minggu = Number(f.get('minggu'));
  if (!Number.isInteger(minggu) || minggu < 1 || minggu > 53) return { error: 'Minggu epidemiologi harus 1 sampai 53.' };

  const baris: InputEmerging['baris'] = [];
  for (const [kunci, nilai] of f.entries()) {
    if (!kunci.startsWith('kasus__') || typeof nilai !== 'string') continue;
    const propinsi = kunci.slice('kasus__'.length);
    if (!propinsiSah.includes(propinsi)) return { error: `Provinsi tidak dikenal: ${propinsi}` };
    const mati = String(f.get(`mati__${propinsi}`) ?? '').trim();
    const kasusMentah = nilai.trim();
    if (kasusMentah === '' && mati === '') continue;

    const kasus = bilangan(kasusMentah, `Kasus ${propinsi}`);
    if (typeof kasus === 'string') return { error: kasus };
    const kematian = bilangan(mati, `Kematian ${propinsi}`);
    if (typeof kematian === 'string') return { error: kematian };
    if (kematian > kasus) return { error: `${propinsi}: kematian (${kematian}) melebihi kasus (${kasus}).` };
    baris.push({ propinsi, kasus, kematian });
  }
  if (!baris.length) return { error: 'Belum ada angka yang diisi.' };
  return { data: { penyakit, tahun, minggu, baris } };
}

/** Upsert semua baris dalam satu transaksi. */
export async function simpanEmerging(d: InputEmerging): Promise<number> {
  await getDbClient().batch(
    d.baris.map((b) => ({
      sql: `INSERT INTO laporan_penyakit_nasional
              (penyakit, propinsi, tahun_epid, minggu_epid, jumlah_kasus, jumlah_kematian)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (penyakit, propinsi, tahun_epid, minggu_epid)
            DO UPDATE SET jumlah_kasus = EXCLUDED.jumlah_kasus, jumlah_kematian = EXCLUDED.jumlah_kematian`,
      args: [d.penyakit, b.propinsi, d.tahun, d.minggu, b.kasus, b.kematian],
    }))
  );
  return d.baris.length;
}

/** Data satu penyakit pada satu minggu, untuk halaman edit. */
export async function getDataMinggu(penyakit: string, tahun: number, minggu: number): Promise<BarisEmerging[]> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT penyakit, propinsi, tahun_epid, minggu_epid, jumlah_kasus, jumlah_kematian
            FROM laporan_penyakit_nasional
           WHERE penyakit = ? AND tahun_epid = ? AND minggu_epid = ?`,
    args: [penyakit, tahun, minggu],
  });
  return rows as BarisEmerging[];
}

export async function hapusBarisEmerging(penyakit: string, propinsi: string, tahun: number, minggu: number): Promise<boolean> {
  const hasil = await getDbClient().execute({
    sql: `DELETE FROM laporan_penyakit_nasional
           WHERE penyakit = ? AND propinsi = ? AND tahun_epid = ? AND minggu_epid = ?`,
    args: [penyakit, propinsi, tahun, minggu],
  });
  return hasil.rowsAffected > 0;
}