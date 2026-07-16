'use client';

// ================================================================
// SEGMEN 11 — components/vektor/FilterZonaSubLokasi.tsx
// KHUSUS modul Aedes/DBD. Sub-Lokasi (Pelabuhan Umum / TPK Palaran)
// hanya tampil kalau wilker aktif = WK01, sesuai KONTEKS PROYEK.
// ================================================================

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const SUB_LOKASI_WK01 = ['Pelabuhan Umum', 'TPK Palaran'];

export default function FilterZonaSubLokasi() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const wilkerAktif = searchParams.get('wilker') ?? '';
  const zonaAktif = searchParams.get('zona') ?? '';
  const subLokasiAktif = searchParams.get('subLokasi') ?? '';
  const isWK01 = wilkerAktif === 'WK01';

  function ubahParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Kalau ganti zona/wilker, reset sub-lokasi supaya tidak nyangkut
    // ke kombinasi yang tidak valid.
    if (key === 'zona' || key === 'wilker') {
      params.delete('subLokasi');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={zonaAktif}
        onChange={(e) => ubahParam('zona', e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">Semua Zona</option>
        <option value="Perimeter">🔵 Perimeter</option>
        <option value="Buffer">🟢 Buffer</option>
      </select>

      {isWK01 && (
        <select
          value={subLokasiAktif}
          onChange={(e) => ubahParam('subLokasi', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Semua Sub-Lokasi</option>
          {SUB_LOKASI_WK01.map((s) => (
            <option key={s} value={s}>
              {s === 'Pelabuhan Umum' ? '⚓' : '🏭'} {s}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}