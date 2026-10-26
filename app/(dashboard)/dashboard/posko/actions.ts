'use server';

// Server action modul Posko: atur periode & input data harian (penyakit, KLB, PTM) langsung dari aplikasi.
// Tabel yang ditulis SAMA dengan yang diisi lewat Google Sheet (upsert, jadi tidak dobel).
import { tabelTidakAda } from '@/lib/db/errors';
import { revalidatePath } from 'next/cache';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { bolehKelolaPosko } from '@/lib/auth/aksesPosko';
import { getTursoClient } from '@/lib/turso/client';
import { hariIniWita } from '@/lib/posko/queries';
import { JENIS_KE_SLUG, type JenisPosko } from '@/lib/posko/konstanta';
import {
  adalahGalatKolomBelumAda,
  bangunPerintahInputHarian,
  tanggalSah,
  validasiInputHarian,
  type InputHarianPayload,
} from '@/lib/posko/perintahInput';

export type HasilAksiPosko = { ok: boolean; pesan: string };

const BATAS_HARI_PERIODE = 120;

async function pastikanBolehKelola(): Promise<HasilAksiPosko | null> {
  const { role } = await getStatusAkses();
  return bolehKelolaPosko(role)
    ? null
    : { ok: false, pesan: 'Hanya Admin, Petugas, atau Petugas Klinik yang bisa mengubah data posko. Silakan login.' };
}

function segarkan(posko: JenisPosko) {
  const slug = JENIS_KE_SLUG[posko];
  revalidatePath(`/dashboard/posko/${slug}`);
  revalidatePath(`/dashboard/posko/${slug}/infografis`);
  revalidatePath(`/dashboard/posko/${slug}/input`);
}

// ------------------------------------------------------------------ atur periode
export async function simpanPeriodePosko(input: {
  posko: JenisPosko;
  tahun: number;
  nama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
}): Promise<HasilAksiPosko> {
  const ditolak = await pastikanBolehKelola();
  if (ditolak) return ditolak;

  if (input.posko !== 'nataru' && input.posko !== 'idul_fitri') return { ok: false, pesan: 'Jenis posko tidak dikenal.' };
  if (!Number.isInteger(input.tahun) || input.tahun < 2020 || input.tahun > 2100) return { ok: false, pesan: 'Tahun posko tidak valid.' };
  if (!tanggalSah(input.tanggalMulai) || !tanggalSah(input.tanggalSelesai)) return { ok: false, pesan: 'Tanggal mulai/selesai tidak valid.' };
  if (input.tanggalMulai > input.tanggalSelesai) return { ok: false, pesan: 'Tanggal mulai tidak boleh setelah tanggal selesai.' };
  const lamaHari =
    (Date.parse(`${input.tanggalSelesai}T00:00:00Z`) - Date.parse(`${input.tanggalMulai}T00:00:00Z`)) / 86400000 + 1;
  if (lamaHari > BATAS_HARI_PERIODE) return { ok: false, pesan: `Periode terlalu panjang (maksimal ${BATAS_HARI_PERIODE} hari).` };

  const nama = String(input.nama ?? '').trim().slice(0, 120);
  try {
    await getTursoClient().execute({
      sql: `INSERT INTO posko_periode (posko, tahun, nama, tanggal_mulai, tanggal_selesai) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              nama = VALUES(nama), tanggal_mulai = VALUES(tanggal_mulai), tanggal_selesai = VALUES(tanggal_selesai)`,
      args: [input.posko, input.tahun, nama, input.tanggalMulai, input.tanggalSelesai],
    });
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      pesan: tabelTidakAda(pesan)
        ? 'Tabel posko belum dibuat di database. Jalankan file posko_turso.sql terlebih dulu.'
        : `Gagal menyimpan periode: ${pesan}`,
    };
  }
  segarkan(input.posko);
  return { ok: true, pesan: 'Periode posko tersimpan.' };
}

// ------------------------------------------------------------------ input data harian
export async function simpanInputHarianPosko(input: InputHarianPayload): Promise<HasilAksiPosko> {
  const ditolak = await pastikanBolehKelola();
  if (ditolak) return ditolak;

  const salah = validasiInputHarian(input, hariIniWita());
  if (salah) return { ok: false, pesan: salah };

  try {
    const db = getTursoClient();

    // tanggal harus berada dalam salah satu periode posko ini; tahun diambil dari periode itu
    const periode = await db.execute({
      sql: `SELECT tahun FROM posko_periode WHERE posko = ? AND ? BETWEEN tanggal_mulai AND tanggal_selesai ORDER BY tahun DESC LIMIT 1`,
      args: [input.posko, input.tanggal],
    });
    if (periode.rows.length === 0) {
      return { ok: false, pesan: 'Tanggal ini di luar periode posko. Atur periode posko terlebih dulu.' };
    }

    await db.batch(bangunPerintahInputHarian(input, Number(periode.rows[0].tahun)), 'write'); // satu transaksi
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      pesan: tabelTidakAda(pesan)
        ? 'Tabel posko belum dibuat di database. Jalankan file posko_turso.sql terlebih dulu.'
        : adalahGalatKolomBelumAda(pesan)
          ? 'Kolom jenis kelamin PTM belum ada di Turso. Jalankan file posko_ptm_jenis_kelamin.sql terlebih dulu.'
          : `Gagal menyimpan: ${pesan}`,
    };
  }

  segarkan(input.posko);
  return { ok: true, pesan: `Data ${input.wilayah} tanggal ${input.tanggal} tersimpan.` };
}
