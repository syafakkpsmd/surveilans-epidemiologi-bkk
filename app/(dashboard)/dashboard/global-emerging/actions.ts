'use server';

// app/(dashboard)/global-emerging/actions.ts
// Server Actions untuk input manual & upload CSV data penyakit emerging.
// Dipakai untuk 10 penyakit yang belum ada sumber otomatis (Hantavirus,
// Legionellosis, Infeksi Virus B, MERS-CoV, H5N1, Demam Lassa, CCHF,
// Meningitis, Oropouche, Listeriosis) -- tapi tidak dibatasi, bisa juga
// dipakai koreksi/tambahan untuk Covid-19/Mpox kalau perlu.
//
// PENTING: verifikasi role dilakukan DI SINI (server), bukan cuma di UI
// -- pola sama seperti /api/analisis-ai, jangan percaya role dari client.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { DAFTAR_PENYAKIT, DAFTAR_NEGARA } from '@/types/global-emerging.types';

export type HasilSimpan =
  | { sukses: true; jumlahBarisTersimpan: number; peringatan?: string[] }
  | { sukses: false; error: string; detailBaris?: string[] };

type BarisMentah = {
  penyakit: string;
  negara: string;
  jenis_periode: string;
  tahun_epid: string | number;
  minggu_epid?: string | number;
  bulan?: string | number;
  jumlah_kasus: string | number;
  jumlah_kematian: string | number;
  sumber?: string;
};

type BarisTervalidasi = {
  penyakit: string;
  negara: string;
  jenis_periode: 'mingguan' | 'bulanan';
  tahun_epid: number;
  minggu_epid: number;
  bulan: number;
  jumlah_kasus: number;
  jumlah_kematian: number;
  sumber: string;
};

/**
 * Validasi satu baris. Return string pesan error kalau tidak valid,
 * atau null kalau valid.
 */
function validasiBaris(b: BarisMentah, nomorBaris: number): { data?: BarisTervalidasi; error?: string } {
  const prefiks = `Baris ${nomorBaris}`;

  if (!DAFTAR_PENYAKIT.includes(b.penyakit as any)) {
    return { error: `${prefiks}: penyakit "${b.penyakit}" tidak dikenal. Nilai valid: ${DAFTAR_PENYAKIT.join(', ')}` };
  }
  if (!DAFTAR_NEGARA.includes(b.negara as any)) {
    return { error: `${prefiks}: negara "${b.negara}" tidak dikenal. Nilai valid: ${DAFTAR_NEGARA.join(', ')}` };
  }
  if (b.jenis_periode !== 'mingguan' && b.jenis_periode !== 'bulanan') {
    return { error: `${prefiks}: jenis_periode harus "mingguan" atau "bulanan", ditemukan "${b.jenis_periode}"` };
  }

  const tahunEpid = Number(b.tahun_epid);
  if (!Number.isInteger(tahunEpid) || tahunEpid < 2000 || tahunEpid > 2100) {
    return { error: `${prefiks}: tahun_epid tidak valid ("${b.tahun_epid}")` };
  }

  let mingguEpid = 0;
  let bulan = 0;

  if (b.jenis_periode === 'mingguan') {
    mingguEpid = Number(b.minggu_epid);
    if (!Number.isInteger(mingguEpid) || mingguEpid < 1 || mingguEpid > 53) {
      return { error: `${prefiks}: minggu_epid wajib 1-53 untuk jenis_periode mingguan (ditemukan "${b.minggu_epid}")` };
    }
  } else {
    bulan = Number(b.bulan);
    if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) {
      return { error: `${prefiks}: bulan wajib 1-12 untuk jenis_periode bulanan (ditemukan "${b.bulan}")` };
    }
  }

  const jumlahKasus = Number(b.jumlah_kasus);
  if (!Number.isFinite(jumlahKasus) || jumlahKasus < 0) {
    return { error: `${prefiks}: jumlah_kasus tidak valid ("${b.jumlah_kasus}")` };
  }

  const jumlahKematian = b.jumlah_kematian === undefined || b.jumlah_kematian === ''
    ? 0
    : Number(b.jumlah_kematian);
  if (!Number.isFinite(jumlahKematian) || jumlahKematian < 0) {
    return { error: `${prefiks}: jumlah_kematian tidak valid ("${b.jumlah_kematian}")` };
  }

  return {
    data: {
      penyakit: b.penyakit,
      negara: b.negara,
      jenis_periode: b.jenis_periode,
      tahun_epid: tahunEpid,
      minggu_epid: mingguEpid,
      bulan,
      jumlah_kasus: jumlahKasus,
      jumlah_kematian: jumlahKematian,
      sumber: b.sumber?.trim() || 'Input manual petugas',
    },
  };
}

async function verifikasiPetugasAtauAdmin() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) {
    throw new Error('Input data manual hanya untuk Petugas/Admin yang sudah login.');
  }
}

/**
 * Simpan SATU baris dari form input manual.
 */
export async function simpanInputManual(formData: FormData): Promise<HasilSimpan> {
  try {
    await verifikasiPetugasAtauAdmin();
  } catch (err) {
    return { sukses: false, error: err instanceof Error ? err.message : 'Tidak diizinkan.' };
  }

  const baris: BarisMentah = {
    penyakit: String(formData.get('penyakit') ?? ''),
    negara: String(formData.get('negara') ?? ''),
    jenis_periode: String(formData.get('jenis_periode') ?? ''),
    tahun_epid: String(formData.get('tahun_epid') ?? ''),
    minggu_epid: String(formData.get('minggu_epid') ?? ''),
    bulan: String(formData.get('bulan') ?? ''),
    jumlah_kasus: String(formData.get('jumlah_kasus') ?? ''),
    jumlah_kematian: String(formData.get('jumlah_kematian') ?? ''),
    sumber: String(formData.get('sumber') ?? ''),
  };

  const { data, error } = validasiBaris(baris, 1);
  if (error || !data) {
    return { sukses: false, error: error ?? 'Data tidak valid.' };
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from('laporan_penyakit_emerging')
    .upsert([data], {
      onConflict: 'penyakit,negara,jenis_periode,tahun_epid,minggu_epid,bulan,sumber',
    });

  if (dbError) {
    return { sukses: false, error: `Gagal menyimpan ke database: ${dbError.message}` };
  }

  revalidatePath('/dashboard/global-emerging');
  return { sukses: true, jumlahBarisTersimpan: 1 };
}

/**
 * Simpan BANYAK baris hasil parsing CSV (dilakukan di client dengan
 * papaparse, dikirim ke sini sebagai array objek per baris).
 * Validasi ulang di server (jangan percaya hasil parsing client).
 */
export async function simpanUploadCsv(barisMentah: BarisMentah[]): Promise<HasilSimpan> {
  try {
    await verifikasiPetugasAtauAdmin();
  } catch (err) {
    return { sukses: false, error: err instanceof Error ? err.message : 'Tidak diizinkan.' };
  }

  if (!Array.isArray(barisMentah) || barisMentah.length === 0) {
    return { sukses: false, error: 'File CSV kosong atau formatnya tidak terbaca.' };
  }

  if (barisMentah.length > 5000) {
    return { sukses: false, error: 'Maksimal 5000 baris per upload. Pecah file jadi beberapa bagian.' };
  }

  const dataValid: BarisTervalidasi[] = [];
  const errorBaris: string[] = [];

  barisMentah.forEach((b, i) => {
    const { data, error } = validasiBaris(b, i + 2); // +2: baris 1 = header CSV
    if (error) {
      errorBaris.push(error);
    } else if (data) {
      dataValid.push(data);
    }
  });

  if (errorBaris.length > 0) {
    return {
      sukses: false,
      error: `${errorBaris.length} baris tidak valid, tidak ada yang disimpan (perbaiki dulu semua baris bermasalah lalu upload ulang).`,
      detailBaris: errorBaris.slice(0, 30), // batasi supaya tidak kepanjangan
    };
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from('laporan_penyakit_emerging')
    .upsert(dataValid, {
      onConflict: 'penyakit,negara,jenis_periode,tahun_epid,minggu_epid,bulan,sumber',
    });

  if (dbError) {
    return { sukses: false, error: `Gagal menyimpan ke database: ${dbError.message}` };
  }

  revalidatePath('/dashboard/global-emerging');
  return { sukses: true, jumlahBarisTersimpan: dataValid.length };
}
