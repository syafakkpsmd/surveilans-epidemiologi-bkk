/**
 * components/status-laporan/TabStatusLaporan.tsx
 * Tab navigasi antar-menu Status Laporan (server component, tanpa JS klien).
 */

import Link from 'next/link';

const TAB = [
  { kunci: 'alat-angkut', label: 'Alat Angkut & Vektor', href: '/dashboard/status-laporan' },
  { kunci: 'lalu-lintas', label: 'Lalu Lintas Orang', href: '/dashboard/status-laporan/lalu-lintas-orang' },
] as const;

export default function TabStatusLaporan({ aktif }: { aktif: (typeof TAB)[number]['kunci'] }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200">
      {TAB.map((t) => (
        <Link
          key={t.kunci}
          href={t.href}
          prefetch={false}
          className={
            t.kunci === aktif
              ? '-mb-px border-b-2 border-[#0F4C5C] px-4 py-2 text-sm font-semibold text-[#0F4C5C]'
              : 'px-4 py-2 text-sm font-medium text-gray-500 hover:text-[#0F2A38]'
          }
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
