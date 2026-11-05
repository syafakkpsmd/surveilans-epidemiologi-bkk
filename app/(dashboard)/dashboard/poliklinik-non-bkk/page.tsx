import { getNamaWilkerModul } from '@/lib/wilayah-kerja/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPengguna } from '@/lib/auth/session';
import { getDbClient } from '@/lib/db/client';
import {
  cekAkses, getKunjunganNonBkk, getDaftarPoliklinikAktif,
} from '@/lib/db/modul/poliklinikNonBkk';
import {
  hitungRingkasanKunjungan, hitungTrenMingguanKunjungan, hitungTrenBulananKunjungan, hitungTopDiagnosa,
  hitungDonutJenisKelaminKunjungan, hitungDonutKelompokUsia, hitungDonutKategoriPasien,
  hitungPolaHariKunjungan,
} from '@/lib/db/modul/poliklinik';
import PoliklinikClient from '../poliklinik/PoliklinikClient';

export const dynamic = 'force-dynamic';

const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tombol = 'rounded border px-3 py-1.5 text-sm hover:bg-gray-50';
const tombolUtama = 'rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90';

export default async function DashboardNonBkk({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; poliklinik?: string }>;
}) {
  const p = await getPengguna();
  if (!p) redirect('/login');

  const admin = p.role === 'admin';
  const semua = admin || p.role === 'petugas_klinik' || p.role === 'petugas';
  if (!semua && p.role !== 'poliklinik') redirect('/dashboard');

  // Akun poliklinik dengan satu tautan langsung ke dashboard kliniknya
  if (!semua) {
    const { rows } = await getDbClient().execute({
      sql: `SELECT p.id::text AS id FROM poliklinik_non_bkk p
              JOIN poliklinik_non_bkk_akses a ON a.poliklinik_id = p.id
             WHERE a.user_id = ?::uuid AND p.aktif ORDER BY p.nama`,
      args: [p.id],
    });
    if (rows.length === 1) redirect(`/dashboard/poliklinik-non-bkk/${rows[0].id}`);
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          {rows.length === 0
            ? 'Akun Anda belum ditautkan ke poliklinik. Hubungi admin.'
            : 'Pilih poliklinik Anda dari daftar.'}
        </p>
        {rows.map((r) => (
          <Link key={String(r.id)} href={`/dashboard/poliklinik-non-bkk/${r.id}`} className="mt-2 block text-sm underline">
            Buka poliklinik
          </Link>
        ))}
      </div>
    );
  }

  const sp = await searchParams;
  const tahunIni = new Date().getFullYear();
  const parsed = sp.tahun ? parseInt(sp.tahun, 10) : tahunIni;
  const tahun = Number.isInteger(parsed) && parsed >= 2020 && parsed <= tahunIni + 1 ? parsed : tahunIni;

  const wilkerPoliklinik = await getNamaWilkerModul('poliklinik');
  const daftar = await getDaftarPoliklinikAktif();
  const terpilih = sp.poliklinik && POLA_UUID.test(sp.poliklinik) && daftar.some((d) => d.id === sp.poliklinik)
    ? sp.poliklinik : undefined;
  const namaTerpilih = daftar.find((d) => d.id === terpilih)?.nama;

  const rows = await getKunjunganNonBkk(tahun, terpilih);
  const akses = terpilih ? await cekAkses(terpilih) : null;

  return (
    <PoliklinikClient
      mode="klinik"
      judul={namaTerpilih ?? 'Poliklinik Non-BKK'}
      subjudul={namaTerpilih ? 'Rekap kunjungan pasien poliklinik' : 'Rekap kunjungan semua poliklinik non-BKK'}
      basePath={terpilih ? `/dashboard/poliklinik-non-bkk?poliklinik=${terpilih}` : '/dashboard/poliklinik-non-bkk'}
      aksiHeader={
        <>
          <form method="get" className="flex gap-2">
            <input type="hidden" name="tahun" value={tahun} />
            <select name="poliklinik" defaultValue={terpilih ?? ''} className="rounded border px-3 py-1.5 text-sm">
              <option value="">Semua poliklinik</option>
              {daftar.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
            <button className={tombol}>Terapkan</button>
          </form>
          {akses?.kelola && terpilih && (
            <Link href={`/dashboard/poliklinik-non-bkk/${terpilih}/input`} className={tombolUtama}>
              Input / Edit Data
            </Link>
          )}
          {admin && (
            <Link href="/admin/master" className={tombol}>Pengaturan Poliklinik</Link>
          )}
          <Link href="/dashboard/poliklinik" className={tombol}>Poliklinik BKK</Link>
        </>
      }
      tahunBerjalan={tahun}
      wilayahTerpilih="semua"
      daftarWilker={wilkerPoliklinik}
      ringkasan={hitungRingkasanKunjungan(rows)}
      trenMingguan={hitungTrenMingguanKunjungan(rows)}
      trenBulanan={hitungTrenBulananKunjungan(rows)}
      topDiagnosa={hitungTopDiagnosa(rows, 10)}
      donutJenisKelamin={hitungDonutJenisKelaminKunjungan(rows)}
      donutKelompokUsia={hitungDonutKelompokUsia(rows)}
      donutKategoriPasien={hitungDonutKategoriPasien(rows)}
      breakdownWilker={[]}
      polaHari={hitungPolaHariKunjungan(rows)}
    />
  );
}