'use server';

// Server Action input data pesawat: satu per satu dan simpan hasil unggah Excel.
// PENTING: peran diverifikasi DI SINI (server). Isi yang dikirim browser tidak dipercaya: setiap baris
// divalidasi ulang dan duplikat dicek ulang sebelum menulis.

import { revalidatePath } from 'next/cache';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getPengguna } from '@/lib/auth/session';
import {
  WILKER_BANDARA,
  barisMentahDariForm,
  hitungIdentitasDiDb,
  naikkanRencanaKeFinal,
  periksaBanyak,
  simpanBarisPesawat,
  tandaiDuplikat,
  validasiBarisPesawat,
} from '@/lib/db/modul/inputPesawat';
import { MAKS_BARIS_EXCEL } from '@/lib/db/modul/excelPesawat';

export type HasilSimpanPesawat =
  | { sukses: true; pesan: string }
  | { sukses: false; error: string; perluKonfirmasi?: boolean };

export type HasilSimpanUnggah =
  | { sukses: true; tersimpan: number; dilewati: number; pesan: string }
  | { sukses: false; error: string };

const PESAN_DITOLAK = 'Hanya Petugas atau Admin yang boleh menginput data.';
const PESAN_GAGAL = 'Gagal menyimpan ke database. Coba lagi; bila terus berulang, hubungi admin.';
const KODE_WILKER = WILKER_BANDARA[0].kode; // satu-satunya bandara: WK07

async function bolehInput(): Promise<boolean> {
  const { sudahLogin, role } = await getStatusAkses();
  return sudahLogin && (role === 'petugas' || role === 'admin');
}

// Tanggal "hari ini" menurut zona waktu kantor, bukan UTC server.
const hariIniKantor = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });

function segarkan() {
  revalidatePath('/dashboard/input-data/pesawat');
  revalidatePath('/dashboard/alat-angkut/pesawat');
}

export async function simpanPesawatSatuan(formData: FormData): Promise<HasilSimpanPesawat> {
  if (!(await bolehInput())) return { sukses: false, error: PESAN_DITOLAK };

  const hariIni = hariIniKantor();
  const v = validasiBarisPesawat(barisMentahDariForm(formData), hariIni, KODE_WILKER);
  if ('galat' in v) return { sukses: false, error: v.galat.join(' ') };

  try {
    // Isian sama persis dengan data yang sudah ada: minta konfirmasi (bisa saja memang dua penerbangan identik).
    const sudahAda = tandaiDuplikat([v.data], await hitungIdentitasDiDb([v.data]))[0];
    if (sudahAda && formData.get('izinkan_duplikat') !== '1') {
      return {
        sukses: false,
        perluKonfirmasi: true,
        error: 'Data dengan isian yang sama persis sudah ada. Bila ini penerbangan terpisah, centang "Simpan tetap" lalu simpan lagi.',
      };
    }

    const pengguna = await getPengguna();
    await simpanBarisPesawat([v.data], pengguna?.id ?? null);
    await naikkanRencanaKeFinal(hariIni);
    segarkan();
    const rencana = v.data.status_data === 'rencana' ? ' Tersimpan sebagai RENCANA (belum dihitung statistik sampai tanggalnya tiba).' : '';
    return { sukses: true, pesan: `Data ${v.data.maskapai} tanggal ${v.data.tanggal} tersimpan.${rencana}` };
  } catch (e) {
    console.error('[input-pesawat] gagal menyimpan satuan:', e);
    return { sukses: false, error: PESAN_GAGAL };
  }
}

/** `baris` = data hasil pratinjau; tetap divalidasi ulang di sini. */
export async function simpanUnggahPesawat(baris: unknown): Promise<HasilSimpanUnggah> {
  if (!(await bolehInput())) return { sukses: false, error: PESAN_DITOLAK };
  if (!Array.isArray(baris) || baris.length === 0) return { sukses: false, error: 'Tidak ada baris untuk disimpan.' };
  if (baris.length > MAKS_BARIS_EXCEL) return { sukses: false, error: `Maksimum ${MAKS_BARIS_EXCEL} baris per penyimpanan.` };

  const hariIni = hariIniKantor();
  const masukan = baris.map((b, i) => ({
    nomor: i + 1,
    mentah: b && typeof b === 'object' ? (b as Record<string, unknown>) : {},
  }));
  const hasil = await periksaBanyak(masukan, hariIni, KODE_WILKER);

  const galat = hasil.find((h) => h.status === 'galat');
  if (galat) {
    return { sukses: false, error: `Baris ${galat.nomor} tidak valid: ${galat.galat?.join(' ')}. Periksa ulang file lalu coba lagi.` };
  }
  const siap = hasil.filter((h) => h.status === 'siap').map((h) => h.data!);
  const dilewati = hasil.length - siap.length;
  if (siap.length === 0) {
    return { sukses: true, tersimpan: 0, dilewati, pesan: 'Tidak ada baris baru: semua baris sudah ada di database.' };
  }

  try {
    const pengguna = await getPengguna();
    await simpanBarisPesawat(siap, pengguna?.id ?? null); // satu transaksi: semua atau tidak sama sekali
    await naikkanRencanaKeFinal(hariIni);
    segarkan();
    const rencana = siap.filter((b) => b.status_data === 'rencana').length;
    const catatan = [
      dilewati > 0 ? `${dilewati} baris dilewati karena sudah ada` : '',
      rencana > 0 ? `${rencana} baris berstatus RENCANA` : '',
    ].filter(Boolean);
    return {
      sukses: true,
      tersimpan: siap.length,
      dilewati,
      pesan: `${siap.length} baris tersimpan${catatan.length ? ` (${catatan.join('; ')})` : ''}.`,
    };
  } catch (e) {
    console.error('[input-pesawat] gagal menyimpan unggahan:', e);
    return { sukses: false, error: `${PESAN_GAGAL} Tidak ada baris yang tersimpan.` };
  }
}
