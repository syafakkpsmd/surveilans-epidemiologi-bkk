// lib/db/modul/inputPenumpangKapal.ts
// Input manual data penumpang kapal (tabel data_penumpang_kapal). SERVER-ONLY: memakai klien MariaDB.
// Validasi murni (tanpa I/O) dipisah dari penulisan agar mudah diuji.
import { getDbClient } from '@/lib/db/client';
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';

/** Wilayah kerja yang menerima kapal: hanya pelabuhan (bandara tidak ada data penumpang kapal). */
export const WILKER_PELABUHAN = WILAYAH_KERJA.filter((w) => w.jenis === 'Pelabuhan');

export interface InputPenumpangKapal {
  kodeWilker: string;
  tanggalTiba: string; // YYYY-MM-DD
  tanggalBerangkat: string | null;
  namaKapal: string;
  abkDatang: number;
  abkBerangkat: number;
  penumpangDatang: number;
  penumpangBerangkat: number;
  siaos: string | null;
  keterangan: string | null;
}

const MAKS_ORANG = 100_000;
const MAKS_HARI_KE_DEPAN = 30; // kedatangan terjadwal boleh dicatat sedikit lebih awal

function teks(v: FormDataEntryValue | null | undefined): string {
  return typeof v === 'string' ? v.trim() : '';
}

function tanggalValid(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000;
}

function bilangan(mentah: string, label: string): number | string {
  if (mentah === '') return 0; // kosong dianggap 0 (kolom di tabel DEFAULT 0)
  if (!/^\d+$/.test(mentah)) return `${label} harus bilangan bulat tanpa tanda minus atau desimal.`;
  const n = Number(mentah);
  if (n > MAKS_ORANG) return `${label} terlalu besar (maksimum ${MAKS_ORANG.toLocaleString('id-ID')}).`;
  return n;
}

/** Validasi isian form. `hariIni` = YYYY-MM-DD (zona waktu server) dan disuntik agar fungsi ini murni. */
export function validasiInput(
  f: FormData,
  hariIni: string,
): { data: InputPenumpangKapal } | { error: string } {
  const kodeWilker = teks(f.get('kode_wilker'));
  if (!WILKER_PELABUHAN.some((w) => w.kode === kodeWilker)) return { error: 'Wilayah kerja tidak valid.' };

  const tanggalTiba = teks(f.get('tanggal_tiba'));
  if (!tanggalValid(tanggalTiba)) return { error: 'Tanggal tiba tidak valid.' };
  const batas = new Date(`${hariIni}T00:00:00Z`);
  batas.setUTCDate(batas.getUTCDate() + MAKS_HARI_KE_DEPAN);
  if (new Date(`${tanggalTiba}T00:00:00Z`) > batas) {
    return { error: `Tanggal tiba lebih dari ${MAKS_HARI_KE_DEPAN} hari ke depan. Periksa kembali tanggalnya.` };
  }

  const berangkatMentah = teks(f.get('tanggal_berangkat'));
  let tanggalBerangkat: string | null = null;
  if (berangkatMentah) {
    if (!tanggalValid(berangkatMentah)) return { error: 'Tanggal berangkat tidak valid.' };
    if (berangkatMentah < tanggalTiba) return { error: 'Tanggal berangkat tidak boleh sebelum tanggal tiba.' };
    tanggalBerangkat = berangkatMentah;
  }

  const namaKapal = teks(f.get('nama_kapal'));
  if (!namaKapal) return { error: 'Nama kapal wajib diisi.' };
  if (namaKapal.length > 255) return { error: 'Nama kapal terlalu panjang (maksimum 255 karakter).' };

  const angka: Record<string, number> = {};
  for (const [kolom, label] of [
    ['abk_datang', 'ABK datang'],
    ['abk_berangkat', 'ABK berangkat'],
    ['penumpang_datang', 'Penumpang datang'],
    ['penumpang_berangkat', 'Penumpang berangkat'],
  ] as const) {
    const n = bilangan(teks(f.get(kolom)), label);
    if (typeof n === 'string') return { error: n };
    angka[kolom] = n;
  }

  const siaos = teks(f.get('siaos'));
  const keterangan = teks(f.get('keterangan'));
  if (siaos.length > 500) return { error: 'Isian SIAOS terlalu panjang (maksimum 500 karakter).' };
  if (keterangan.length > 2000) return { error: 'Keterangan terlalu panjang (maksimum 2000 karakter).' };

  return {
    data: {
      kodeWilker,
      tanggalTiba,
      tanggalBerangkat,
      namaKapal,
      abkDatang: angka.abk_datang,
      abkBerangkat: angka.abk_berangkat,
      penumpangDatang: angka.penumpang_datang,
      penumpangBerangkat: angka.penumpang_berangkat,
      siaos: siaos || null,
      keterangan: keterangan || null,
    },
  };
}

/**
 * Teks `wilker` yang sudah dipakai data lama untuk kode ini (menjaga satu ejaan, mis. "TanjungSantan"
 * vs "Tanjung Santan"); bila belum ada baris, pakai nama pendek dari daftar wilayah kerja.
 */
async function namaWilkerTersimpan(kodeWilker: string): Promise<string> {
  const r = await getDbClient().execute({
    sql: 'SELECT wilker FROM data_penumpang_kapal WHERE kode_wilker = ? ORDER BY id DESC LIMIT 1',
    args: [kodeWilker],
  });
  const ada = r.rows[0]?.wilker;
  if (typeof ada === 'string' && ada.trim()) return ada;
  return WILKER_PELABUHAN.find((w) => w.kode === kodeWilker)!.namaPendek;
}

// Bentrok yang aman diulang: kunci unik (1062), kebuntuan (1213), gagal baca nomor otomatis akibat
// kebuntuan (1467), dan batas waktu kunci (1205). Galat lain (data/skema salah) tidak diulang.
const ERRNO_BISA_DIULANG = new Set([1062, 1213, 1467, 1205]);
const bisaDiulang = (e: unknown) =>
  typeof e === 'object' && e !== null && (ERRNO_BISA_DIULANG.has((e as { errno?: number }).errno ?? 0) || (e as { code?: string }).code === 'ER_DUP_ENTRY');
const MAKS_PERCOBAAN = 8;

/**
 * Simpan satu baris. `no_baris` (bagian kunci unik wilker+no_baris, warisan nomor baris Google Sheets)
 * dihitung di dalam INSERT itu sendiri: MAX(no_baris)+1 untuk wilker tersebut. Bila penyimpanan bersamaan
 * bertabrakan (nomor sama atau kebuntuan), yang kalah diulang dengan jeda acak (maks 8 kali).
 */
export async function simpanPenumpangKapal(d: InputPenumpangKapal): Promise<{ id: number | undefined; noBaris: number }> {
  const db = getDbClient();
  const wilker = await namaWilkerTersimpan(d.kodeWilker);

  for (let percobaan = 1; ; percobaan++) {
    try {
      const hasil = await db.execute({
        sql: `INSERT INTO data_penumpang_kapal
                (wilker, kode_wilker, no_baris, tanggal_tiba, nama_kapal, abk_datang, abk_berangkat,
                 penumpang_datang, penumpang_berangkat, keterangan, tanggal_berangkat, siaos)
              SELECT ?, ?, COALESCE(MAX(no_baris), 0) + 1, ?, ?, ?, ?, ?, ?, ?, ?, ?
                FROM data_penumpang_kapal WHERE wilker = ?`,
        args: [
          wilker, d.kodeWilker, d.tanggalTiba, d.namaKapal, d.abkDatang, d.abkBerangkat,
          d.penumpangDatang, d.penumpangBerangkat, d.keterangan, d.tanggalBerangkat, d.siaos, wilker,
        ],
      });
      const cek = await db.execute({
        sql: 'SELECT no_baris FROM data_penumpang_kapal WHERE id = ?',
        args: [hasil.lastInsertRowid ?? 0],
      });
      return { id: hasil.lastInsertRowid, noBaris: Number(cek.rows[0]?.no_baris) || 0 };
    } catch (e) {
      if (bisaDiulang(e) && percobaan < MAKS_PERCOBAAN) {
        await new Promise((r) => setTimeout(r, Math.random() * 40 * percobaan));
        continue;
      }
      throw e;
    }
  }
}

export interface BarisTerbaru {
  id: number;
  wilker: string;
  tanggal_tiba: string;
  nama_kapal: string | null;
  abk_datang: number;
  abk_berangkat: number;
  penumpang_datang: number;
  penumpang_berangkat: number;
}

/** 10 baris terakhir yang masuk (urut id), untuk konfirmasi visual setelah menyimpan. */
export async function getPenumpangKapalTerbaru(batas = 10): Promise<BarisTerbaru[]> {
  const r = await getDbClient().execute({
    sql: `SELECT id, wilker, tanggal_tiba, nama_kapal, abk_datang, abk_berangkat, penumpang_datang, penumpang_berangkat
            FROM data_penumpang_kapal ORDER BY id DESC LIMIT ${Math.max(1, Math.min(50, Math.trunc(batas)))}`,
    args: [],
  });
  return r.rows.map((x) => ({
    id: Number(x.id),
    wilker: String(x.wilker ?? ''),
    tanggal_tiba: String(x.tanggal_tiba ?? ''),
    nama_kapal: x.nama_kapal == null ? null : String(x.nama_kapal),
    abk_datang: Number(x.abk_datang) || 0,
    abk_berangkat: Number(x.abk_berangkat) || 0,
    penumpang_datang: Number(x.penumpang_datang) || 0,
    penumpang_berangkat: Number(x.penumpang_berangkat) || 0,
  }));
}
