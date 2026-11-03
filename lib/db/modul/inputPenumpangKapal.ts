// lib/db/modul/inputPenumpangKapal.ts
// Input manual data penumpang kapal (tabel data_penumpang_kapal). SERVER-ONLY: memakai klien PostgreSQL.
// Satu input = satu baris, jenis 'datang' ATAU 'berangkat'. Kolom sisi lain diisi 0.
// Validasi murni (tanpa I/O) dipisah dari penulisan agar mudah diuji.
import { getDbClient } from '@/lib/db/client';
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';

/** Wilayah kerja yang menerima kapal: hanya pelabuhan (bandara tidak ada data penumpang kapal). */
export const WILKER_PELABUHAN = WILAYAH_KERJA.filter((w) => w.jenis === 'Pelabuhan');

export type JenisInput = 'datang' | 'berangkat';

export interface InputPenumpangKapal {
  jenis: JenisInput;
  kodeWilker: string;
  kapalId: string; // uuid dari tabel kapal
  namaKapal: string; // hanya untuk pesan; yang disimpan adalah nama dari tabel kapal
  tanggalTiba: string; // YYYY-MM-DD (untuk jenis 'berangkat': sama dengan tanggal berangkat)
  tanggalBerangkat: string | null;
  abkDatang: number;
  abkBerangkat: number;
  penumpangDatang: number;
  penumpangBerangkat: number;
  siaos: string | null;
  keterangan: string | null;
}

const MAKS_ORANG = 100_000;
const MAKS_HARI_KE_DEPAN = 30;
const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function teks(v: FormDataEntryValue | null | undefined): string {
  return typeof v === 'string' ? v.trim() : '';
}

function tanggalValid(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000;
}

function bilangan(mentah: string, label: string): number | string {
  if (mentah === '') return 0;
  if (!/^\d+$/.test(mentah)) return `${label} harus bilangan bulat tanpa tanda minus atau desimal.`;
  const n = Number(mentah);
  if (n > MAKS_ORANG) return `${label} terlalu besar (maksimum ${MAKS_ORANG.toLocaleString('id-ID')}).`;
  return n;
}

/** Validasi isian form. `hariIni` = YYYY-MM-DD dan disuntik agar fungsi ini murni. */
export function validasiInput(
  f: FormData,
  hariIni: string,
): { data: InputPenumpangKapal } | { error: string } {
  const jenis: JenisInput = teks(f.get('jenis')) === 'berangkat' ? 'berangkat' : 'datang';

  const kodeWilker = teks(f.get('kode_wilker'));
  if (!WILKER_PELABUHAN.some((w) => w.kode === kodeWilker)) return { error: 'Wilayah kerja tidak valid.' };

  const kapalId = teks(f.get('kapal_id'));
  if (!kapalId) return { error: 'Pilih kapal terlebih dahulu.' };
  if (!POLA_UUID.test(kapalId)) return { error: 'Kapal tidak valid.' };
  const namaKapal = teks(f.get('nama_kapal'));

  const labelTanggal = jenis === 'datang' ? 'Tanggal tiba' : 'Tanggal berangkat';
  const tanggal = teks(f.get(jenis === 'datang' ? 'tanggal_tiba' : 'tanggal_berangkat'));
  if (!tanggalValid(tanggal)) return { error: `${labelTanggal} tidak valid.` };
  const batas = new Date(`${hariIni}T00:00:00Z`);
  batas.setUTCDate(batas.getUTCDate() + MAKS_HARI_KE_DEPAN);
  if (new Date(`${tanggal}T00:00:00Z`) > batas) {
    return { error: `${labelTanggal} lebih dari ${MAKS_HARI_KE_DEPAN} hari ke depan. Periksa kembali tanggalnya.` };
  }

  // Hanya dua isian angka yang relevan untuk jenis ini; sisi lain 0.
  const [kolomAbk, kolomPnp, labelAbk, labelPnp] =
    jenis === 'datang'
      ? (['abk_datang', 'penumpang_datang', 'ABK datang', 'Penumpang datang'] as const)
      : (['abk_berangkat', 'penumpang_berangkat', 'ABK berangkat', 'Penumpang berangkat'] as const);
  const abk = bilangan(teks(f.get(kolomAbk)), labelAbk);
  if (typeof abk === 'string') return { error: abk };
  const pnp = bilangan(teks(f.get(kolomPnp)), labelPnp);
  if (typeof pnp === 'string') return { error: pnp };

  const siaos = teks(f.get('siaos'));
  const keterangan = teks(f.get('keterangan'));
  if (siaos.length > 500) return { error: 'Isian SIAOS terlalu panjang (maksimum 500 karakter).' };
  if (keterangan.length > 2000) return { error: 'Keterangan terlalu panjang (maksimum 2000 karakter).' };

  return {
    data: {
      jenis,
      kodeWilker,
      kapalId,
      namaKapal,
      tanggalTiba: tanggal,
      tanggalBerangkat: jenis === 'berangkat' ? tanggal : null,
      abkDatang: jenis === 'datang' ? abk : 0,
      abkBerangkat: jenis === 'berangkat' ? abk : 0,
      penumpangDatang: jenis === 'datang' ? pnp : 0,
      penumpangBerangkat: jenis === 'berangkat' ? pnp : 0,
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

/** Nama kapal dari tabel kapal, hanya bila kapal itu aktif dan terdaftar di pelabuhan tersebut. */
async function namaKapalTerdaftar(kapalId: string, kodeWilker: string): Promise<string> {
  const r = await getDbClient().execute({
    sql: `SELECT k.nama FROM kapal k JOIN kapal_wilker w ON w.kapal_id = k.id
           WHERE k.id = ?::uuid AND w.wilker = ? AND k.aktif LIMIT 1`,
    args: [kapalId, kodeWilker],
  });
  const nama = r.rows[0]?.nama;
  if (typeof nama !== 'string' || !nama) throw new Error('Kapal tidak terdaftar di pelabuhan ini.');
  return nama;
}

// Bentrok yang aman diulang (SQLSTATE PostgreSQL): kunci unik (23505), kebuntuan (40P01), kegagalan serialisasi (40001),
// dan kunci tidak tersedia (55P03). Galat lain (data/skema salah) tidak diulang.
const KODE_BISA_DIULANG = new Set(['23505', '40P01', '40001', '55P03']);
const bisaDiulang = (e: unknown) =>
  typeof e === 'object' && e !== null && KODE_BISA_DIULANG.has(String((e as { code?: string }).code ?? ''));
const MAKS_PERCOBAAN = 8;

/**
 * Simpan satu baris. `no_baris` (bagian kunci unik wilker+no_baris, warisan nomor baris Google Sheets)
 * dihitung di dalam INSERT itu sendiri: MAX(no_baris)+1 untuk wilker tersebut. Bila penyimpanan bersamaan
 * bertabrakan (nomor sama atau kebuntuan), yang kalah diulang dengan jeda acak (maks 8 kali).
 */
export async function simpanPenumpangKapal(d: InputPenumpangKapal): Promise<{ id: number | undefined; noBaris: number }> {
  const db = getDbClient();
  const wilker = await namaWilkerTersimpan(d.kodeWilker);
  const namaKapal = await namaKapalTerdaftar(d.kapalId, d.kodeWilker);

  for (let percobaan = 1; ; percobaan++) {
    try {
      const hasil = await db.execute({
        sql: `INSERT INTO data_penumpang_kapal
                (wilker, kode_wilker, no_baris, tanggal_tiba, nama_kapal, kapal_id, abk_datang, abk_berangkat,
                 penumpang_datang, penumpang_berangkat, keterangan, tanggal_berangkat, siaos)
              SELECT ?::text, ?::text, COALESCE(MAX(no_baris), 0) + 1, ?::date, ?::text, ?::uuid,
                     ?::int, ?::int, ?::int, ?::int, ?::text, ?::date, ?::text
                FROM data_penumpang_kapal WHERE wilker = ?::text
              RETURNING id, no_baris`,
        args: [
          wilker, d.kodeWilker, d.tanggalTiba, namaKapal, d.kapalId,
          d.abkDatang, d.abkBerangkat, d.penumpangDatang, d.penumpangBerangkat,
          d.keterangan, d.tanggalBerangkat, d.siaos, wilker,
        ],
      });
      const baru = hasil.rows[0];
      return { id: baru?.id === undefined ? undefined : Number(baru.id), noBaris: Number(baru?.no_baris) || 0 };
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