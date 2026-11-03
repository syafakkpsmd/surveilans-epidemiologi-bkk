/**
 * components/status-laporan/BadgeStatus.tsx
 * Badge kecil untuk 1 sel matriks: Sudah / Belum / non-aplikatif (—).
 * SENGAJA pakai warna hijau/kuning generik (emerald/amber), BUKAN hex
 * warna RBA (#2F9E44/#F0A202) -- supaya tidak tertukar makna dengan
 * status risiko RBA di modul lain (lihat DESIGN TOKENS di master prompt).
 */

import type { SelStatus } from '@/lib/status-laporan/core';

export default function BadgeStatus({ status }: { status: SelStatus }) {
  if (status === 'na') {
    return <span className="text-gray-300">—</span>;
  }

  if (status === 'sudah') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        ✅ Sudah
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      ⏳ Belum
    </span>
  );
}