// SERVER-ONLY. Edit dan hapus data laporan_penyakit_emerging (Global Emerging), dikenali lewat id.
import { getDbClient } from '@/lib/db/client';
import { DAFTAR_PENYAKIT, DAFTAR_NEGARA } from '@/types/global-emerging.types';

export interface BarisGlobal {
  id: number;
  penyakit: string;
  negara: string;
  jenis_periode: 'mingguan' | 'bulanan';
  tahun_epid: number;
  minggu_epid: number;
  bulan: number;
  jumlah_kasus: number;
  jumlah_kematian: number;
  sumber: string;
}

export interface FilterEdit {
  tahun?: number;
  penyakit?: string;
  negara?: string;
  jenis?: 'mingguan' | 'bulanan';
}

const BATAS_TAMPIL = 100;

export async function getBarisGlobal(f: FilterEdit): Promise<BarisGlobal[]> {
  const kondisi: string[] = [];
  const args: (string | number)[] = [];
  if (f.tahun) { kondisi.push('tahun_epid = ?'); args.push(f.tahun); }
  if (f.penyakit) { kondisi.push('penyakit = ?'); args.push(f.penyakit); }
  if (f.negara) { kondisi.push('negara = ?'); args.push(f.negara); }
  if (f.jenis) { kondisi.push('jenis_periode = ?'); args.push(f.jenis); }
  const { rows } = await getDbClient().execute({
    sql: `SELECT id, penyakit, negara, jenis_periode, tahun_epid, minggu_epid, bulan,
                 jumlah_kasus, jumlah_kematian, sumber
            FROM laporan_penyakit_emerging
           ${kondisi.length ? 'WHERE ' + kondisi.join(' AND ') : ''}
           ORDER BY tahun_epid DESC, (CASE WHEN jenis_periode = 'mingguan' THEN minggu_epid ELSE bulan END) DESC, id DESC
           LIMIT ${BATAS_TAMPIL}`,
    args,
  });
  return rows as unknown as BarisGlobal[];
}

export interface InputGlobal {
  penyakit: string;
  negara: string;
  jenis: 'mingguan' | 'bulanan';
  tahun: number;
  minggu: number; // 0 untuk bulanan
  bulan: number; // 0 untuk mingguan
  kasus: number;
  kematian: number;
  sumber: string;
}

const teks = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

function bilangan(mentah: string, label: string): number | string {
  if (mentah === '') return 0;
  if (!/^\d+$/.test(mentah)) return `${label} harus bilangan bulat tanpa minus atau desimal.`;
  const n = Number(mentah);
  return n > 100_000_000 ? `${label} terlalu besar.` : n;
}

export function validasiGlobal(f: FormData): { data: InputGlobal } | { error: string } {
  const penyakit = teks(f.get('penyakit'));
  const negara = teks(f.get('negara'));
  const jenis = teks(f.get('jenis_periode'));
  if (!penyakit) return { error: 'Pilih penyakit.' };
  if (!negara) return { error: 'Pilih negara.' };
  if (jenis !== 'mingguan' && jenis !== 'bulanan') return { error: 'Jenis periode tidak valid.' };

  const tahun = Number(teks(f.get('tahun_epid')));
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) return { error: 'Tahun tidak valid.' };

  let minggu = 0;
  let bulan = 0;
  if (jenis === 'mingguan') {
    minggu = Number(teks(f.get('minggu_epid')));
    if (!Number.isInteger(minggu) || minggu < 1 || minggu > 53) return { error: 'Minggu epidemiologi harus 1 sampai 53.' };
  } else {
    bulan = Number(teks(f.get('bulan')));
    if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) return { error: 'Bulan harus 1 sampai 12.' };
  }

  const kasus = bilangan(teks(f.get('jumlah_kasus')), 'Jumlah kasus');
  if (typeof kasus === 'string') return { error: kasus };
  const kematian = bilangan(teks(f.get('jumlah_kematian')), 'Jumlah kematian');
  if (typeof kematian === 'string') return { error: kematian };
  if (kematian > kasus) return { error: `Kematian (${kematian}) tidak boleh melebihi kasus (${kasus}).` };

  const sumber = teks(f.get('sumber')).slice(0, 300) || 'Edit manual';
  return { data: { penyakit, negara, jenis, tahun, minggu, bulan, kasus, kematian, sumber } };
}

/** Pastikan nilai penyakit dan negara yang dipilih sah. Nilai lama di baris yang diedit tetap boleh dipertahankan. */
export async function nilaiLamaBaris(id: string): Promise<{ penyakit: string; negara: string } | null> {
  const { rows } = await getDbClient().execute({
    sql: 'SELECT penyakit, negara FROM laporan_penyakit_emerging WHERE id = ?::bigint',
    args: [id],
  });
  return rows[0] ? { penyakit: String(rows[0].penyakit), negara: String(rows[0].negara) } : null;
}

export const penyakitSah = (p: string) => (DAFTAR_PENYAKIT as readonly string[]).includes(p);
export const negaraSah = (n: string) => (DAFTAR_NEGARA as readonly string[]).includes(n);

/** true bila ada baris LAIN dengan kunci unik yang sama (sama dengan UNIQUE di database, termasuk sumber). */
export async function adaKembaran(id: string, d: InputGlobal): Promise<boolean> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT 1 FROM laporan_penyakit_emerging
           WHERE penyakit = ? AND negara = ? AND jenis_periode = ? AND tahun_epid = ?
             AND minggu_epid = ? AND bulan = ? AND sumber = ? AND id <> ?::bigint LIMIT 1`,
    args: [d.penyakit, d.negara, d.jenis, d.tahun, d.minggu, d.bulan, d.sumber, id],
  });
  return rows.length > 0;
}

export async function ubahBarisGlobal(id: string, d: InputGlobal): Promise<boolean> {
  const hasil = await getDbClient().execute({
    sql: `UPDATE laporan_penyakit_emerging
             SET penyakit = ?, negara = ?, jenis_periode = ?, tahun_epid = ?, minggu_epid = ?, bulan = ?,
                 jumlah_kasus = ?, jumlah_kematian = ?, sumber = ?
           WHERE id = ?::bigint`,
    args: [d.penyakit, d.negara, d.jenis, d.tahun, d.minggu, d.bulan, d.kasus, d.kematian, d.sumber, id],
  });
  return hasil.rowsAffected > 0;
}

export async function hapusBarisGlobal(id: string): Promise<boolean> {
  const hasil = await getDbClient().execute({
    sql: 'DELETE FROM laporan_penyakit_emerging WHERE id = ?::bigint',
    args: [id],
  });
  return hasil.rowsAffected > 0;
}