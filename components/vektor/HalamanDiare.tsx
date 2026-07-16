// ================================================================
// SEGMEN 11 — components/vektor/HalamanDiare.tsx
// Server Component bersama untuk /diare-lalat dan /diare-kecoa.
// Route TETAP terpisah (bukan toggle) karena threshold & larangan
// rekomendasi AI berbeda total antara Lalat dan Kecoa — komponen ini
// hanya menghindari duplikasi kode, BUKAN menyatukan datanya.
// ================================================================

import { getValidRole } from '@/lib/auth/utils';
import { getRingkasanVektorDiare, getWilkerRef } from '@/lib/supabase/queries';
import {
  getBreakdownKategori,
  getRentangMingguEpid,
} from '@/lib/supabase/queriesVektorBreakdown';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import FilterWilker from '@/components/vektor/FilterWilker';
import TrenChartMingguan from '@/components/vektor/TrenChartMingguan';
import BreakdownList from '@/components/vektor/BreakdownList';
import { TombolAnalisisAI } from '@/components/TombolAnalisisAI';
import FilterZonaSubLokasi from '@/components/vektor/FilterZonaSubLokasi';

const KONFIG = {
  lalat: {
    ikon: '🪰',
    judul: 'Vektor Diare — Lalat',
    metrik: 'fly_index_rerata' as const,
    labelMetrik: 'Fly Index',
    warna: '#E65100',
    threshold: 8,
    konteks: 'vektor-diare-lalat-mingguan',
  },
  kecoa: {
    ikon: '🪳',
    judul: 'Vektor Diare — Kecoa',
    metrik: 'kepadatan_kecoa_rerata' as const,
    labelMetrik: 'Kepadatan/m²',
    warna: '#5B21B6',
    threshold: 2,
    konteks: 'vektor-diare-kecoa-mingguan',
  },
};

export default async function HalamanDiare({
  jenis,
  searchParams,
}: {
  jenis: 'lalat' | 'kecoa';
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  const cfg = KONFIG[jenis];
  const { wilker, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  const [role, daftarWilker, ringkasan] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getRingkasanVektorDiare(tahun, jenis, wilker),
  ]);

  const { tahunEpid: tahunBerjalan, mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();
  const { mulai, selesai } = getRentangMingguEpid(tahunBerjalan, mingguBerjalan);

  const breakdownLokasi = await getBreakdownKategori({
    tabel: 'vektor_diare',
    kolomTanggal: 'tgl_kegiatan',
    kolomKategori: 'lokasi',
    tglMulai: mulai,
    tglSelesai: selesai,
    kodeWilker: wilker,
    filterTambahan: { jenis_kegiatan: jenis },
  });

  const dataChart = ringkasan.map((r) => ({
    minggu_epid: r.minggu_epid,
    nilai: r[cfg.metrik] ?? 0,
    memenuhi_syarat: r.jml_memenuhi_syarat,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* ... (Header h1 & p tetap sama) */}
        
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
          <FilterZonaSubLokasi />
          {/* 3. PERBAIKI PROPS DI SINI */}
          <TombolAnalisisAI 
            sudahLogin={role !== null}
            role={getValidRole(role)} 
            konteks={cfg.konteks} // Gunakan cfg.konteks dari objek KONFIG
            periodeKey={`${tahunBerjalan}-${mingguBerjalan}`}
            wilayahKerja={wilker ?? undefined}
          />
        </div>
      </div>

      {ringkasan.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Belum ada kegiatan pengamatan {jenis} tercatat untuk tahun {tahun}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Tren {cfg.labelMetrik} — Tahun {tahun}
            </h2>
            <TrenChartMingguan
              data={dataChart}
              seriesList={[{ key: 'nilai', label: cfg.labelMetrik, warna: cfg.warna }]}
            />
          </div>

          <BreakdownList
            judul={`Lokasi Pengamatan — Minggu Epid ke-${mingguBerjalan}`}
            data={breakdownLokasi}
            warna={cfg.warna}
          />
        </div>
      )}
    </div>
  );
}