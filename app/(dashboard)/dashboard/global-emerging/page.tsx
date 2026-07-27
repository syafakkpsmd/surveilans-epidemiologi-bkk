// app/(dashboard)/global-emerging/page.tsx

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { hitungMingguEpidemiologi } from '@/lib/epi-week';
import GlobalEmergingFilterBar from '@/components/global-emerging/GlobalEmergingFilterBar';
import GlobalEmergingTrendChart from '@/components/global-emerging/GlobalEmergingTrendChart';
import GlobalEmergingBreakdownCards from '@/components/global-emerging/GlobalEmergingBreakdownCards';
import GlobalEmergingTabelMentah from '@/components/global-emerging/GlobalEmergingTabelMentah';
import GlobalEmergingNegaraChart from '@/components/global-emerging/GlobalEmergingNegaraChart';
import { getRingkasanPenyakitEmerging, getDataMentahPenyakitEmerging } from '@/lib/supabase/global-emerging-queries';
import { DAFTAR_NEGARA, type FilterGlobalEmerging, type JenisPeriode, type Penyakit, type Negara } from '@/types/global-emerging.types';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import GlobalEmergingNegaraMap from '@/components/global-emerging/GlobalEmergingNegaraMapClient';

interface GlobalEmergingPageProps {
  searchParams: Promise<{
    jenis?: string;
    penyakit?: string;
    negara?: string;
    tahun?: string;
    mgAwal?: string;
    mgAkhir?: string;
    bulanAwal?: string;
    bulanAkhir?: string;
    negaraChart?: string;
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

  const mingguBerjalan = mingguEpidSaatIni - 1 > 0 ? mingguEpidSaatIni - 1 : 1;
  const bulanBerjalan = sekarang.getMonth() + 1;

  let mgAwal = params.mgAwal ? parseInt(params.mgAwal, 10) : 1;
  let mgAkhir = params.mgAkhir ? parseInt(params.mgAkhir, 10) : mingguBerjalan;
  if (mgAwal > mgAkhir) [mgAwal, mgAkhir] = [mgAkhir, mgAwal];

  let bulanAwal = params.bulanAwal ? parseInt(params.bulanAwal, 10) : 1;
  let bulanAkhir = params.bulanAkhir ? parseInt(params.bulanAkhir, 10) : bulanBerjalan;
  if (bulanAwal > bulanAkhir) [bulanAwal, bulanAkhir] = [bulanAkhir, bulanAwal];

  const negaraChartAktif = params.negaraChart && (DAFTAR_NEGARA as readonly string[]).includes(params.negaraChart)
    ? params.negaraChart
    : DAFTAR_NEGARA[0];
  const tahunAktif = filter.tahunEpid;

  // Kirimkan rentang bulanAwal dan bulanAkhir untuk mode bulanan
  const periodeKey =
    jenis === 'mingguan'
      ? `${tahunAktif}-W${mgAwal}_W${mgAkhir}`
      : `${tahunAktif}-M${bulanAwal}_M${bulanAkhir}`; // Menghasilkan "2026-M1_M7"

  const [ringkasan, dataMentah, ringkasanNegaraChart] = await Promise.all([
    getRingkasanPenyakitEmerging(supabase, filter),
    getDataMentahPenyakitEmerging(supabase, filter),
    getRingkasanPenyakitEmerging(supabase, {
      jenis,
      tahunEpid: filter.tahunEpid,
      negara: negaraChartAktif as Negara,
    }),
  ]);

  const ringkasanTerfilter = ringkasan.filter((r) => {
    const urutan = jenis === 'mingguan' ? (r.minggu_epid ?? 0) : (r.bulan ?? 0);
    const batasAwal = jenis === 'mingguan' ? mgAwal : bulanAwal;
    const batasAkhir = jenis === 'mingguan' ? mgAkhir : bulanAkhir;
    return urutan >= batasAwal && urutan <= batasAkhir;
  });

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
            {(role === 'petugas' || role === 'admin') && (
              <Link
                href="/dashboard/global-emerging/input"
                className="inline-flex items-center rounded-lg border border-[#0F4C5C] px-4 py-2 text-sm font-medium text-[#0F4C5C] hover:bg-[#0F4C5C] hover:text-white transition"
              >
                + Input Data Manual
              </Link>
            )}
          </div>
        </div>

        <GlobalEmergingFilterBar
          jenisAktif={jenis}
          penyakitAktif={filter.penyakit}
          negaraAktif={filter.negara}
          tahunAktif={filter.tahunEpid}
          mgAwal={mgAwal}
          mgAkhir={mgAkhir}
          bulanAwal={bulanAwal}
          bulanAkhir={bulanAkhir}
          mingguMaks={53}
        />

        {ringkasanTerfilter.length === 0 ? (
          <div className="rounded-[10px] bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-600">
              Belum ada data penyakit infeksi emerging untuk{' '}
              {jenis === 'mingguan' ? 'minggu epidemiologi' : 'bulan'} dan filter yang dipilih.
            </p>
          </div>
        ) : (
          <>
            <GlobalEmergingTrendChart data={ringkasanTerfilter} jenis={jenis} />
            <GlobalEmergingBreakdownCards data={ringkasanTerfilter} />
          </>
        )}
        {filter.penyakit ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Analisis/Prediksi AI — Berdasarkan Penyakit: {filter.penyakit}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={role}
                konteks={`global-emerging-${jenis}`}
                periodeKey={periodeKey}
                wilayahKerja={undefined}
                metrik={filter.penyakit}
                wajibWilayahKerja={false}
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={role}
                konteks={`global-emerging-${jenis}`}
                periodeKey={periodeKey}
                wilayahKerja={undefined}
                metrik={filter.penyakit}
                wajibWilayahKerja={false}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Pilih penyakit di filter untuk menjalankan Analisis/Prediksi AI berdasarkan penyakit.</p>
        )}

        <GlobalEmergingNegaraChart
          data={ringkasanNegaraChart}
          jenis={jenis}
          negaraAktif={negaraChartAktif}
          mgAwal={mgAwal}
          mgAkhir={mgAkhir}
          bulanAwal={bulanAwal}
          bulanAkhir={bulanAkhir}
        />

        {filter.negara ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Analisis/Prediksi AI — Berdasarkan Negara: {filter.negara}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={role}
                konteks={`global-emerging-${jenis}`}
                periodeKey={periodeKey}
                wilayahKerja={undefined}
                metrik={filter.negara}
                wajibWilayahKerja={false}
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={role}
                konteks={`global-emerging-${jenis}`}
                periodeKey={periodeKey}
                wilayahKerja={undefined}
                metrik={filter.negara}
                wajibWilayahKerja={false}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Pilih negara di filter untuk menjalankan Analisis/Prediksi AI berdasarkan negara.</p>
        )}

        <GlobalEmergingNegaraMap
          data={Object.entries(
            ringkasanTerfilter.reduce<Record<string, number>>((acc, r) => {
              if (r.negara) acc[r.negara] = (acc[r.negara] ?? 0) + (r.total_kasus ?? 0);
              return acc;
            }, {})
          ).map(([negara, total_kasus]) => ({ negara, total_kasus }))}
        />
        <GlobalEmergingTabelMentah data={dataMentah} />
      </div>
    </div>
  );
}
