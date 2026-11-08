'use client';

// ================================================================
// SEGMEN 11 — components/vektor/FilterZonaSubLokasi.tsx
// KHUSUS modul Aedes/DBD/Anopheles. Dropdown Sub-Lokasi hanya tampil untuk wilayah yang dicentang pada modul
// "vektor_sub_lokasi" di pengaturan wilayah kerja; pilihannya diambil dari wilker_ref.sub_lokasi wilayah itu.
// ================================================================

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export type WilayahSubLokasi = { kode: string; subLokasi: string[] };

export default function FilterZonaSubLokasi({ wilayahSubLokasi }: { wilayahSubLokasi: WilayahSubLokasi[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const wilkerAktif = searchParams.get('wilker') ?? '';
  const zonaAktif = searchParams.get('zona') ?? '';
  const subLokasiAktif = searchParams.get('subLokasi') ?? '';
  const daftarSubLokasi = wilayahSubLokasi.find((w) => w.kode === wilkerAktif)?.subLokasi ?? [];

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

      {daftarSubLokasi.length > 0 && (
        <select
          value={subLokasiAktif}
          onChange={(e) => ubahParam('subLokasi', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Semua Sub-Lokasi</option>
          {daftarSubLokasi.map((s) => (
            <option key={s} value={s}>
              {/pelabuhan|dermaga/i.test(s) ? '⚓' : '🏭'} {s}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}