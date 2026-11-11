import { getWilkerRef } from '@/lib/db/queries/umum';
import { getBarisOmkaba } from '@/lib/db/modul/omkaba';
import { getUserRole } from '@/lib/auth/get-user-role';
import { bacaTahun } from '@/lib/tahun';
import FilterTahun from '@/components/FilterTahun';
import FilterWilker from '@/components/vektor/FilterWilker';
import OmkabaDashboardClient from '@/components/omkaba/OmkabaDashboardClient';
import { NAMA_BKK_SINGKAT } from '@/lib/konfigurasi/instansi';

// Berapa tahun ke depan yang boleh dipilih. Harus sama dengan prop `maju` di <FilterTahun />.
const TAHUN_MAJU = 0;

type SearchParams = { wilker?: string; tahun?: string };

export default async function OmkabaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tahun = sp.tahun ? bacaTahun(sp.tahun, TAHUN_MAJU) : new Date().getFullYear();
  const kodeWilker = sp.wilker && sp.wilker !== 'Semua' ? sp.wilker : undefined;

  const [role, daftarWilker, baris] = await Promise.all([getUserRole(), getWilkerRef(), getBarisOmkaba({ tahun, kodeWilker })]);
  const labelWilayah = kodeWilker ? daftarWilker.find((w) => w.kode === kodeWilker)?.nama ?? kodeWilker : 'Semua Wilayah Kerja';
  const bolehInput = (['admin', 'petugas', 'petugas_klinik'] as string[]).includes(role ?? '');

  return (
    <div className="space-y-5 p-4 pt-6 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">📦 Lalu Lintas OMKABA</h1>
          <p className="text-sm text-gray-500">
            Health Certificate lalu lintas OMKABA yang diterbitkan {NAMA_BKK_SINGKAT}: layanan, komoditi, negara, kapal, kelengkapan dokumen, dan PNBP.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <FilterTahun maju={TAHUN_MAJU} />
          <FilterWilker daftarWilker={daftarWilker} />
        </div>
      </div>
      <OmkabaDashboardClient baris={baris} tahun={tahun} labelWilayah={labelWilayah} bolehInput={bolehInput} />
    </div>
  );
}