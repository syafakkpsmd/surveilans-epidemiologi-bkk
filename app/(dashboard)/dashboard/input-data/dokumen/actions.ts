'use server';
// app/(dashboard)/dashboard/input-data/dokumen/actions.ts
import { revalidatePath } from 'next/cache';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getPengguna } from '@/lib/auth/session';
import {
  FOLDER_DASAR,
  KONFIG,
  adalahJenis,
  normalisasiKunci,
  type HasilAksi,
  type JenisDokumen,
  type MasukanDokumen,
} from '@/lib/dokumen-pemeriksaan/konfigurasi';
import {
  cariDiDataBesar,
  hapusDokumenDb,
  simpanDokumen,
  sinkronkanDokumen,
} from '@/lib/dokumen-pemeriksaan/server';

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

async function peranPetugas(): Promise<'admin' | 'petugas' | null> {
  const { sudahLogin, role } = await getStatusAkses();
  return sudahLogin && (role === 'petugas' || role === 'admin') ? role : null;
}

export async function simpanDokumenAction(m: MasukanDokumen): Promise<HasilAksi> {
  if (!(await peranPetugas())) return { ok: false, galat: 'Tidak berwenang.' };
  if (!adalahJenis(m.jenis)) return { ok: false, galat: 'Jenis dokumen tidak dikenal.' };

  const kunci = normalisasiKunci(m.kunci ?? '');
  if (!kunci) return { ok: false, galat: `${KONFIG[m.jenis].labelKunci} wajib diisi.` };
  if (!m.wilayahKerja?.trim()) return { ok: false, galat: 'Wilayah kerja wajib diisi.' };
  if (!TANGGAL.test(m.tanggalPemeriksaan ?? '')) return { ok: false, galat: 'Tanggal pemeriksaan tidak valid.' };
  if (!Array.isArray(m.berkas) || m.berkas.length < 1 || m.berkas.length > 10) {
    return { ok: false, galat: 'Unggah 1 sampai 10 berkas.' };
  }

  // Berkas harus benar-benar milik akun Cloudinary kita dan berada di folder jenis ini.
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const awalUrl = `https://res.cloudinary.com/${cloud}/`;
  const awalId = `${FOLDER_DASAR}/${m.jenis}/`;
  for (const b of m.berkas) {
    if (!b.url?.startsWith(awalUrl) || !b.publicId?.startsWith(awalId) || (b.tipe !== 'pdf' && b.tipe !== 'image')) {
      return { ok: false, galat: 'Berkas tidak valid. Coba unggah ulang.' };
    }
  }

  if (m.jenis === 'phqc') {
    if (m.alasanPhqc !== 'lebih_14_hari' && m.alasanPhqc !== 'daerah_terjangkit') {
      return { ok: false, galat: 'Pilih alasan PHQC (lebih dari 14 hari atau dari daerah terjangkit).' };
    }
    if (m.alasanPhqc === 'lebih_14_hari') {
      if (!m.tanggalKedatangan || !TANGGAL.test(m.tanggalKedatangan)) {
        return { ok: false, galat: 'Tanggal kedatangan wajib diisi untuk alasan lebih dari 14 hari.' };
      }
      const selisih = (Date.parse(m.tanggalPemeriksaan) - Date.parse(m.tanggalKedatangan)) / 86_400_000;
      if (!(selisih > 14)) {
        return {
          ok: false,
          galat: `Selisih tanggal pemeriksaan dan kedatangan baru ${Math.round(selisih)} hari; harus lebih dari 14 hari.`,
        };
      }
    }
  }

  const p = await getPengguna();
  const orang = p as unknown as { nama?: string | null; email?: string | null; id?: string | number } | null;
  const oleh = orang?.nama || orang?.email || String(orang?.id ?? 'petugas');

  try {
    const n = await simpanDokumen(m, kunci, oleh);
    await sinkronkanDokumen(m.jenis);
    revalidatePath(`/dashboard/input-data/dokumen/${m.jenis}`);
    return { ok: true, pesan: `${n} berkas tersimpan.` };
  } catch (e) {
    console.error('[dokumen-pemeriksaan] simpan gagal', e);
    return { ok: false, galat: 'Gagal menyimpan dokumen.' };
  }
}

export async function sinkronkanAction(jenis: JenisDokumen): Promise<HasilAksi> {
  if (!(await peranPetugas())) return { ok: false, galat: 'Tidak berwenang.' };
  if (!adalahJenis(jenis)) return { ok: false, galat: 'Jenis dokumen tidak dikenal.' };
  const n = await sinkronkanDokumen(jenis);
  revalidatePath(`/dashboard/input-data/dokumen/${jenis}`);
  return { ok: true, pesan: n > 0 ? `${n} dokumen baru tersinkron.` : 'Tidak ada dokumen baru yang cocok dengan data besar.' };
}

export async function hapusDokumenAction(jenis: JenisDokumen, id: number): Promise<HasilAksi> {
  if ((await peranPetugas()) !== 'admin') return { ok: false, galat: 'Hanya admin yang boleh menghapus dokumen.' };
  if (!adalahJenis(jenis) || !Number.isFinite(id)) return { ok: false, galat: 'Permintaan tidak valid.' };
  const ok = await hapusDokumenDb(id);
  revalidatePath(`/dashboard/input-data/dokumen/${jenis}`);
  return ok ? { ok: true, pesan: 'Dokumen dihapus.' } : { ok: false, galat: 'Dokumen tidak ditemukan.' };
}

/** Dipakai form: setelah kunci diisi, isi otomatis nama kapal & wilayah kalau data besarnya sudah ada. */
export async function cariKunciAction(
  jenis: JenisDokumen,
  kunci: string,
): Promise<{ ditemukan: boolean; namaKapal?: string; wilayahKerja?: string }> {
  if (!(await peranPetugas()) || !adalahJenis(jenis)) return { ditemukan: false };
  const k = normalisasiKunci(kunci ?? '');
  if (!k) return { ditemukan: false };
  const d = await cariDiDataBesar(jenis, k);
  return d ? { ditemukan: true, ...d } : { ditemukan: false };
}