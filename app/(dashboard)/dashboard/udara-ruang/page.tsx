// app/(dashboard)/dashboard/udara-ruang/page.tsx  (FILE BARU)
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getNamaWilkerModul } from '@/lib/wilayah-kerja/server';
import { getPengukuranUdara } from '@/lib/db/modul/udaraRuang';
import UdaraRuangClient from './UdaraRuangClient';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ wilayah?: string | string[]; tahun?: string | string[] }> };

export default async function UdaraRuangPage({ searchParams }: Props) {
  const p = await searchParams;
  const wilayah = Array.isArray(p.wilayah) ? p.wilayah[0] : p.wilayah;
  const tahunParam = Array.isArray(p.tahun) ? p.tahun[0] : p.tahun;
  const tahunParsed = tahunParam ? parseInt(tahunParam, 10) : NaN;
  const tahun = Number.isFinite(tahunParsed) ? tahunParsed : new Date().getFullYear();

  const [role, daftarWilayah, rows] = await Promise.all([
    getUserRole(),
    getNamaWilkerModul('udara_ruang'),
    getPengukuranUdara(tahun),
  ]);
  const bolehInput = role === 'admin' || role === 'petugas';

  return (
    <UdaraRuangClient
      daftarWilayah={daftarWilayah ?? []}
      rows={rows}
      tahun={tahun}
      wilayahParam={wilayah}
      aksiHeader={
        bolehInput ? (
          <Link href="/dashboard/udara-ruang/input" className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
            + Input / Unggah Data
          </Link>
        ) : null
      }
    />
  );
}
