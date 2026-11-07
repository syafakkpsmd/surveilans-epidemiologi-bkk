// app/(dashboard)/dashboard/limbah-b3/page.tsx  (FILE BARU)
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getNamaWilkerModul } from '@/lib/wilayah-kerja/server';
import { getPemeriksaanLimbahB3 } from '@/lib/db/modul/limbahB3';
import LimbahB3Client from './LimbahB3Client';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ wilayah?: string | string[]; tahun?: string | string[] }> };

export default async function LimbahB3Page({ searchParams }: Props) {
  const p = await searchParams;
  const wilayah = Array.isArray(p.wilayah) ? p.wilayah[0] : p.wilayah;
  const tahunParam = Array.isArray(p.tahun) ? p.tahun[0] : p.tahun;
  const tahunParsed = tahunParam ? parseInt(tahunParam, 10) : NaN;
  const tahun = Number.isFinite(tahunParsed) ? tahunParsed : new Date().getFullYear();

  const [role, daftarWilayah, rows] = await Promise.all([
    getUserRole(),
    getNamaWilkerModul('limbah_b3'), // wilayah yang dicentang admin untuk modul ini
    getPemeriksaanLimbahB3(tahun),
  ]);

  // "Hari ini" menurut WITA, dihitung di server dan dioper ke klien supaya tidak beda antara server dan browser.
  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
  const bolehInput = role === 'admin' || role === 'petugas';

  return (
    <LimbahB3Client
      daftarWilayah={daftarWilayah ?? []}
      rows={rows}
      tahun={tahun}
      hariIni={hariIni}
      wilayahParam={wilayah}
      aksiHeader={
        bolehInput ? (
          <Link
            href="/dashboard/limbah-b3/input"
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            + Input / Unggah Data
          </Link>
        ) : null
      }
    />
  );
}
