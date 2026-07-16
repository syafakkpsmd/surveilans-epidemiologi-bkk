// ================================================================
// SEGMEN 11 — app/(dashboard)/dashboard/vektor/page.tsx
// HUB navigasi modul vektor. HANYA grid kartu + link, TIDAK ADA
// grafik/detail di sini (aturan hub, sama seperti /dashboard utama).
// ================================================================

import Link from 'next/link';

const KARTU_VEKTOR = [
  {
    href: '/dashboard/vektor/tikus',
    ikon: '🐀',
    judul: 'Vektor Tikus',
    deskripsi: 'TSI, Index Pinjal, uji lab Leptospira/Pes/Hantavirus',
    warna: '#4E342E',
  },
  {
    href: '/dashboard/vektor/aedes',
    ikon: '🦟',
    judul: 'Vektor Aedes (DBD)',
    deskripsi: 'HI, CI, ABJ per zona & sub-lokasi',
    warna: '#B71C1C',
  },
  {
    href: '/dashboard/vektor/anopheles',
    ikon: '🦟',
    judul: 'Vektor Anopheles',
    deskripsi: 'MBR nyamuk dewasa & kepadatan larva',
    warna: '#1B5E20',
  },
  {
    href: '/dashboard/vektor/diare-lalat',
    ikon: '🪰',
    judul: 'Vektor Diare — Lalat',
    deskripsi: 'Fly Index per lokasi pengamatan',
    warna: '#E65100',
  },
  {
    href: '/dashboard/vektor/diare-kecoa',
    ikon: '🪳',
    judul: 'Vektor Diare — Kecoa',
    deskripsi: 'Kepadatan kecoa per m²',
    warna: '#5B21B6',
  },
];

export default function HubVektorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans Vektor</h1>
        <p className="text-sm text-gray-500">
          Pilih kegiatan pengawasan vektor untuk melihat dashboard lengkap.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KARTU_VEKTOR.map((k) => (
          <Link
            key={k.href}
            href={k.href}
            className="rounded-xl border-t-4 bg-white p-5 shadow-sm transition hover:shadow-md"
            style={{ borderTopColor: k.warna }}
          >
            <div className="mb-2 text-3xl">{k.ikon}</div>
            <h2 className="font-semibold text-[#0F2A38]">{k.judul}</h2>
            <p className="mt-1 text-xs text-gray-500">{k.deskripsi}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}