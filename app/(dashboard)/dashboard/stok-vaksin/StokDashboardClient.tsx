'use client';

import { RingkasanStokKlinik } from '@/lib/klinik/agregasiStok';
import { KartuRingkasanStok } from '@/components/stok/KartuRingkasanStok';
import { TabelStokPerKlinik } from '@/components/stok/TabelStokPerKlinik';
import { DaftarPeringatanStok } from '@/components/stok/DaftarPeringatanStok';
import { GrafikTerbitVsRusak } from '@/components/stok/GrafikTerbitVsRusak';
import { TombolSyncStok } from '@/components/klinik/TombolSyncStok';

type OpsiKlinik = { id: string; nama_klinik: string; kategori: string | null };

type Props = {
  ringkasan: RingkasanStokKlinik[];
  gagalDimuat: boolean;
  role: string;
  daftarKlinikOpsi: OpsiKlinik[]; // BARU
};

export default function StokDashboardClient({ ringkasan, gagalDimuat, role, daftarKlinikOpsi }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Stok Vaksin — Klinik Binaan & BKK</h1>
          <p className="text-xs text-gray-500 mt-1">e-ICV, ICV, Meningitis, Yellow Fever, Polio, Influenza</p>
        </div>
        {(role === 'admin' || role === 'petugas') && (
          <TombolSyncStok label="Sync Semua Klinik + BKK" />
        )}
      </div>

      {gagalDimuat && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ Data stok sementara gagal dimuat dari database. Coba muat ulang halaman.
        </div>
      )}

      <KartuRingkasanStok ringkasan={ringkasan} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TabelStokPerKlinik ringkasan={ringkasan} />
        </div>
        <DaftarPeringatanStok ringkasan={ringkasan} />
      </div>

      {/* GANTI dari <GrafikTerbitVsRusak ringkasan={ringkasan} /> jadi ini: */}
      <GrafikTerbitVsRusak daftarKlinikOpsi={daftarKlinikOpsi} />
    </div>
  );
}