import { getSkltData, getTahunSklt } from '@/lib/turso/sklt';
import SkltClient from './SkltClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'SKLT — Laik Terbang APT Pranoto' };

export default async function SkltPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const sp = await searchParams; // Next.js 15/16: searchParams adalah Promise

  // "Sekarang" dalam WITA (UTC+8)
  const wita = new Date(Date.now() + 8 * 3600 * 1000);
  const tahunIni = wita.getUTCFullYear();
  const bulanIni = wita.getUTCMonth() + 1;
  const hariIni = wita.toISOString().slice(0, 10);

  const daftarTahun = await getTahunSklt();
  const diminta = Number(sp.tahun);
  const tahun = Number.isFinite(diminta) && diminta > 2000
    ? diminta
    : daftarTahun.includes(tahunIni) ? tahunIni : (daftarTahun[0] ?? tahunIni);

  const rows = await getSkltData(tahun);
  const tahunOpsi = Array.from(new Set([...daftarTahun, tahun, tahunIni])).sort((a, b) => b - a);

  return (
    <SkltClient
      rows={rows}
      tahun={tahun}
      tahunOpsi={tahunOpsi}
      tahunIni={tahunIni}
      bulanIni={bulanIni}
      hariIni={hariIni}
    />
  );
}