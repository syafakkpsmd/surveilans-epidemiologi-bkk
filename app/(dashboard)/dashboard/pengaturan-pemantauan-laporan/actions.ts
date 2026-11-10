// app/(dashboard)/dashboard/pengaturan-pemantauan-laporan/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getPengguna } from '@/lib/auth/session';
import { getDbClient, type DbStatement } from '@/lib/db/client';
import { KATALOG, periodeBoleh, type PeriodeKegiatan } from '@/lib/pemantauan-laporan/katalog';

const HALAMAN = '/dashboard/pengaturan-pemantauan-laporan';

function kembali(pesan: string): never {
  redirect(`${HALAMAN}?error=${encodeURIComponent(pesan)}`);
}

const teks = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function bilanganBulat(f: FormData, nama: string, min: number, maks: number, label: string, kegiatan: string): number {
  const v = Number(teks(f, nama));
  if (!Number.isInteger(v) || v < min || v > maks) kembali(`${kegiatan}: ${label} harus bilangan bulat ${min}-${maks}.`);
  return v;
}

function tanggalMmDdValid(mmdd: string): boolean {
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd);
  if (!m) return false;
  const bln = Number(m[1]);
  const hari = Number(m[2]);
  const d = new Date(Date.UTC(2024, bln - 1, hari)); // 2024 = kabisat, 29 Feb sah
  return d.getUTCMonth() === bln - 1 && d.getUTCDate() === hari;
}

/** Simpan pengaturan semua kegiatan sekaligus (satu transaksi). Khusus admin. */
export async function simpanPengaturanPemantauan(formData: FormData) {
  if ((await getUserRole()) !== 'admin') kembali('Hanya admin yang boleh mengubah pengaturan pemantauan laporan.');
  const pengguna = await getPengguna();

  const perintah: DbStatement[] = [];
  for (const k of KATALOG) {
    const periode = teks(formData, `periode__${k.kunci}`) as PeriodeKegiatan;
    if (!periodeBoleh(k).includes(periode)) kembali(`${k.label}: pilihan periode tidak valid.`);

    // Kolom siklus selalu dibaca; hanya DIWAJIBKAN valid bila periode = SIKLUS.
    let target: number | null = null;
    let interval: number | null = null;
    let mulai = teks(formData, `mulai__${k.kunci}`) || '01-01';
    let tenggang = 10;
    if (periode === 'SIKLUS') {
      target = bilanganBulat(formData, `target__${k.kunci}`, 1, 60, 'target per tahun', k.label);
      interval = bilanganBulat(formData, `interval__${k.kunci}`, 1, 366, 'interval hari', k.label);
      tenggang = bilanganBulat(formData, `tenggang__${k.kunci}`, 0, 60, 'tenggang input (hari)', k.label);
      if (!tanggalMmDdValid(mulai)) kembali(`${k.label}: awal siklus harus berformat BB-HH yang valid (mis. 01-01).`);
    } else {
      const t = Number(teks(formData, `target__${k.kunci}`));
      const i = Number(teks(formData, `interval__${k.kunci}`));
      const g = Number(teks(formData, `tenggang__${k.kunci}`));
      target = Number.isInteger(t) && t >= 1 && t <= 60 ? t : null;
      interval = Number.isInteger(i) && i >= 1 && i <= 366 ? i : null;
      tenggang = Number.isInteger(g) && g >= 0 && g <= 60 ? g : 10;
      if (!tanggalMmDdValid(mulai)) mulai = '01-01';
    }
    const hariKerja = teks(formData, `hk__${k.kunci}`) !== 'kalender';

    perintah.push({
      sql: `INSERT INTO kegiatan_laporan (kunci, periode, target_per_tahun, interval_hari, hari_kerja, mulai_siklus, tenggang_hari, diubah_oleh, diubah_pada)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, now())
            ON CONFLICT (kunci) DO UPDATE SET
              periode = EXCLUDED.periode, target_per_tahun = EXCLUDED.target_per_tahun, interval_hari = EXCLUDED.interval_hari,
              hari_kerja = EXCLUDED.hari_kerja, mulai_siklus = EXCLUDED.mulai_siklus, tenggang_hari = EXCLUDED.tenggang_hari,
              diubah_oleh = EXCLUDED.diubah_oleh, diubah_pada = now()`,
      args: [k.kunci, periode, target, interval, hariKerja, mulai, tenggang, pengguna?.email ?? null],
    });
  }

  try {
    await getDbClient().batch(perintah);
  } catch {
    kembali('Gagal menyimpan. Pastikan migrasi 26_kegiatan_laporan.sql sudah dijalankan.');
  }
  revalidatePath('/dashboard/ketepatan-laporan');
  revalidatePath(HALAMAN);
  redirect(`${HALAMAN}?ok=1`);
}
