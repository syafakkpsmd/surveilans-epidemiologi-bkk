// app/(dashboard)/global-emerging/page.tsx
// Halaman modul Penyakit Infeksi Emerging — disesuaikan supaya konsisten
// PERSIS dengan pola app/(dashboard)/cop/page.tsx yang sudah jalan
// (import getStatusAkses, hitungMingguEpidemiologi, TombolAnalisisAI,
// TombolPrediksiAI semuanya dari lokasi asli project Anda).

import { createClient } from '@/lib/supabase/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { hitungMingguEpidemiologi } from '@/lib/epi-week';
import { TombolAnalisisAI } from '@/components/TombolAnalisisAI';
import { TombolPrediksiAI } from '@/components/TombolPrediksiAI';
import GlobalEmergingFilterBar from '@/components/global-emerging/GlobalEmergingFilterBar';
import GlobalEmergingTrendChart from '@/components/global-emerging/GlobalEmergingTrendChart';
import GlobalEmergingBreakdownCards from '@/components/global-emerging/GlobalEmergingBreakdownCards';
import GlobalEmergingTabelMentah from '@/components/global-emerging/GlobalEmergingTabelMentah';
import { getRingkasanPenyakitEmerging, getDataMentahPenyakitEmerging } from '@/lib/supabase/global-emerging-queries';
import type { FilterGlobalEmerging, JenisPeriode, Penyakit, Negara } from '@/types/global-emerging.types';

interface GlobalEmergingPageProps {
  searchParams: Promise<{
    jenis?: string;
    penyakit?: string;
    negara?: string;
    tahun?: string;
  }>;
}

function tahunEpidSaatIni(): number {
  return new Date().getFullYear();
}

export default async function GlobalEmergingPage({ searchParams }: GlobalEmergingPageProps) {
  const params = await searchParams;

  const jenis: JenisPeriode = params.jenis === 'bulanan' ? 'bulanan' : 'mingguan';
  const filter: FilterGlobalEmerging = {
    jenis,
    tahunEpid: params.tahun ? Number(params.tahun) : tahunEpidSaatIni(),
    penyakit: params.penyakit as Penyakit | undefined,
    negara: params.negara as Negara | undefined,
  };

  const supabase = await createClient();
  const { sudahLogin, role } = await getStatusAkses();

  const sekarang = new Date();
  const { tahunEpid: tahunEpidSaatIniAI, mingguEpid: mingguEpidSaatIni } =
    hitungMingguEpidemiologi(sekarang);
  const periodeKey =
    jenis === 'mingguan'
      ? `${tahunEpidSaatIniAI}-W${mingguEpidSaatIni}`
      : `${sekarang.getFullYear()}-${sekarang.getMonth() + 1}`;

  // CATATAN: wilayahKerja sengaja undefined (modul ini pakai konsep
  // "negara", bukan wilayah kerja pelabuhan). Backend /api/analisis-ai
  // perlu ditambah dukungan konteks "global-emerging-*" (lihat chat).
  const metrikAi = filter.penyakit ?? filter.negara ?? undefined;

  const [ringkasan, dataMentah] = await Promise.all([
    getRingkasanPenyakitEmerging(supabase, filter),
    getDataMentahPenyakitEmerging(supabase, filter),
  ]);

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F2A38]">
              Penyakit Infeksi Emerging
            </h1>
            <p className="text-sm text-gray-500">
              Pemantauan {filter.tahunEpid} — {jenis === 'mingguan' ? 'per minggu epidemiologi' : 'per bulan'}
            </p>
          </div>
          <div className="flex gap-2">
            <TombolAnalisisAI
              sudahLogin={sudahLogin}
              role={role}
              konteks={`global-emerging-${jenis}`}
              periodeKey={periodeKey}
              wilayahKerja={undefined}
              metrik={metrikAi}
            />
            <TombolPrediksiAI
              sudahLogin={sudahLogin}
              role={role}
              konteks={`global-emerging-${jenis}`}
              periodeKey={periodeKey}
              wilayahKerja={undefined}
              metrik={metrikAi}
            />
          </div>
        </div>

        <GlobalEmergingFilterBar
          jenisAktif={jenis}
          penyakitAktif={filter.penyakit}
          negaraAktif={filter.negara}
        />

        {ringkasan.length === 0 ? (
          <div className="rounded-[10px] bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-600">
              Belum ada data penyakit infeksi emerging untuk{' '}
              {jenis === 'mingguan' ? 'minggu epidemiologi' : 'bulan'} dan filter yang dipilih.
            </p>
          </div>
        ) : (
          <>
            <GlobalEmergingTrendChart data={ringkasan} jenis={jenis} />
            <GlobalEmergingBreakdownCards data={ringkasan} />
          </>
        )}

        <GlobalEmergingTabelMentah data={dataMentah} />
      </div>
    </div>
  );
}
