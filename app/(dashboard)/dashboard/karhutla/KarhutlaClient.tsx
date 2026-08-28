'use client';

import { useEffect, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import FormInputIspaHarian from '@/components/karhutla/FormInputIspaHarian';
import FormInputKualitasUdaraHarian from '@/components/karhutla/FormInputKualitasUdaraHarian';
import KurvaEpidemikIspaPm25, { type TitikTrenIspa } from '@/components/karhutla/KurvaEpidemikIspaPm25';
import KurvaPerbandinganIspaHotspot from '@/components/karhutla/KurvaPerbandinganIspaHotspot';
import FilterRentangPeriodeKarhutla, { type StateFilterPeriode } from '@/components/karhutla/FilterRentangPeriodeKarhutla';
import FilterGrafikHarianKarhutla, { type StateFilterHarian } from '@/components/karhutla/FilterGrafikHarianKarhutla';
import GrafikHarianRentangKarhutla from '@/components/karhutla/GrafikHarianRentangKarhutla';
import PilihWilayahMultiSelect from '@/components/karhutla/PilihWilayahMultiSelect';
import ModalSederhana from '@/components/ui/ModalSederhana';
import { buatOpsiWilayahIspa } from '@/lib/karhutla/constants';
import type { HotspotRow } from '@/components/karhutla/PetaHotspotKarhutla';
import type {
  TitikPerbandinganIspaHotspot,
  TitikTrenHarianRentang,
  WilayahIspaRow,
  LokasiUdaraRow,
} from '@/lib/supabase/queries-karhutla-server';
import GrafikMultiParameterHarianKarhutla from '@/components/karhutla/GrafikMultiParameterHarianKarhutla';

// TODO: sesuaikan import ini dengan lokasi BoxAnalisisAI/BoxPrediksiAI di project Anda
// import BoxAnalisisAI from '@/components/ai/BoxAnalisisAI';
// import BoxPrediksiAI from '@/components/ai/BoxPrediksiAI';

const PetaHotspotKarhutla = dynamic(() => import('@/components/karhutla/PetaHotspotKarhutla'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm h-105 flex items-center justify-center text-sm text-gray-400">
      Memuat peta...
    </div>
  ),
});

function buatPeriodeKey(f: StateFilterPeriode): string {
  const prefix = f.granularitas === 'mingguan' ? 'W' : 'M';
  return `${f.tahun}-${prefix}${f.periodeAwal}_${prefix}${f.periodeAkhir}`;
}

function tambahkanParamWilayah(params: URLSearchParams, wilayahKeys: string[]) {
  wilayahKeys.forEach((k) => params.append('wilayah', k));
}

export default function KarhutlaClient({
  role, trenAwal, hotspotAwal, daftarWilayahIspa, daftarLokasiUdara,
}: {
  role: string | null;
  trenAwal: TitikTrenIspa[];
  hotspotAwal: HotspotRow[];
  daftarWilayahIspa: WilayahIspaRow[];
  daftarLokasiUdara: LokasiUdaraRow[];
}) {
  const isAdmin = role === 'admin';

  const [tren, setTren] = useState(trenAwal);
  const [filterWilayahKurva, setFilterWilayahKurva] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [formTerbuka, setFormTerbuka] = useState<'ispa' | 'udara' | null>(null);

  const opsiWilayah = buatOpsiWilayahIspa(daftarWilayahIspa);

  const tahunSekarang = new Date().getFullYear();
  const [filterPeriode, setFilterPeriode] = useState<StateFilterPeriode>({
    granularitas: 'mingguan', tahun: tahunSekarang, periodeAwal: 1, periodeAkhir: 53, wilayahKeys: [],
  });
  const [dataPerbandingan, setDataPerbandingan] = useState<TitikPerbandinganIspaHotspot[]>([]);
  const [memuatPerbandingan, setMemuatPerbandingan] = useState(false);

  useEffect(() => {
    if (filterPeriode.periodeAwal > filterPeriode.periodeAkhir) return;

    const controller = new AbortController();
    setMemuatPerbandingan(true);

    const params = new URLSearchParams({
      granularitas: filterPeriode.granularitas,
      tahun: String(filterPeriode.tahun),
      awal: String(filterPeriode.periodeAwal),
      akhir: String(filterPeriode.periodeAkhir),
    });
    tambahkanParamWilayah(params, filterPeriode.wilayahKeys);

    fetch(`/api/karhutla-perbandingan?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setDataPerbandingan(json.data ?? []))
      .catch((err) => { if (err.name !== 'AbortError') console.error('Gagal ambil data perbandingan:', err); })
      .finally(() => setMemuatPerbandingan(false));

    return () => controller.abort();
  }, [filterPeriode]);

  const periodeKey = buatPeriodeKey(filterPeriode);
  const kontekPerbandingan = filterPeriode.granularitas === 'mingguan' ? 'karhutla-ispa-mingguan' : 'karhutla-ispa-bulanan';

  const hariIniStr = new Date().toISOString().slice(0, 10);
  const tigaPuluhHariLalu = new Date();
  tigaPuluhHariLalu.setDate(tigaPuluhHariLalu.getDate() - 30);
  const [filterHarian, setFilterHarian] = useState<StateFilterHarian>({
    tanggalAwal: tigaPuluhHariLalu.toISOString().slice(0, 10),
    tanggalAkhir: hariIniStr,
    wilayahKeys: [],
    parameter: 'pm25',
  });
  const [dataHarian, setDataHarian] = useState<TitikTrenHarianRentang[]>([]);
  const [memuatHarian, setMemuatHarian] = useState(false);

  useEffect(() => {
    if (filterHarian.tanggalAwal > filterHarian.tanggalAkhir) return;

    const controller = new AbortController();
    setMemuatHarian(true);

    const params = new URLSearchParams({
      awal: filterHarian.tanggalAwal,
      akhir: filterHarian.tanggalAkhir,
      parameter: filterHarian.parameter,
    });
    tambahkanParamWilayah(params, filterHarian.wilayahKeys);

    fetch(`/api/karhutla-tren-harian?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setDataHarian(json.data ?? []))
      .catch((err) => { if (err.name !== 'AbortError') console.error('Gagal ambil data tren harian:', err); })
      .finally(() => setMemuatHarian(false));

    return () => controller.abort();
  }, [filterHarian]);

  async function muatUlangTren(wilayahKeys: string[]) {
    setFilterWilayahKurva(wilayahKeys);
    startTransition(async () => {
      const params = new URLSearchParams();
      tambahkanParamWilayah(params, wilayahKeys);
      const res = await fetch(`/api/tren-ispa?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTren(json.data);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <a
          href="/dashboard/karhutla/data"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          📋 Lihat Semua Data &amp; Unduh Excel/CSV
        </a>
      </div>

      <PetaHotspotKarhutla hotspots={hotspotAwal} />

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter wilayah untuk kurva:</label>
        <PilihWilayahMultiSelect
          opsi={opsiWilayah}
          nilai={filterWilayahKurva}
          onUbah={muatUlangTren}
        />
        {isPending && <span className="text-xs text-gray-400">Memuat...</span>}
      </div>

      <KurvaEpidemikIspaPm25 data={tren} />

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Grafik Harian (Rentang Tanggal Bebas)</h2>
        <FilterGrafikHarianKarhutla nilai={filterHarian} onUbah={setFilterHarian} daftarWilayahIspa={daftarWilayahIspa} />
        {memuatHarian ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Memuat grafik...
          </div>
        ) : (
          <GrafikHarianRentangKarhutla data={dataHarian} parameter={filterHarian.parameter} />
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Analisis Kasus ISPA vs Titik Panas</h2>
        <FilterRentangPeriodeKarhutla nilai={filterPeriode} onUbah={setFilterPeriode} daftarWilayahIspa={daftarWilayahIspa} />
        {memuatPerbandingan ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Memuat data perbandingan...
          </div>
        ) : (
          <KurvaPerbandinganIspaHotspot data={dataPerbandingan} />
        )}
        {/* TODO: BoxAnalisisAI / BoxPrediksiAI — lihat catatan di riwayat sebelumnya */}
      </div>
      <GrafikMultiParameterHarianKarhutla daftarWilayahIspa={daftarWilayahIspa} />

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setFormTerbuka('ispa')}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
            [+] Input Kasus ISPA
        </button>

        <button onClick={() => setFormTerbuka('udara')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            [+] Input Kualitas Udara
        </button>

        {isAdmin && (
            <Link
            href="/dashboard/pengaturan-lokasi-karhutla"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
            ⚙ Kelola Lokasi dan Wilayah
            </Link>
        )}
      </div>

      {formTerbuka === 'ispa' && (
        <ModalSederhana judul="Input Kasus ISPA" onTutup={() => setFormTerbuka(null)}>
            <FormInputIspaHarian
            daftarWilayah={daftarWilayahIspa}
            onBerhasilSimpan={() => { muatUlangTren(filterWilayahKurva); setFormTerbuka(null); }}
            />
        </ModalSederhana>
        )}

        {formTerbuka === 'udara' && (
        <ModalSederhana judul="Input Kualitas Udara" onTutup={() => setFormTerbuka(null)}>
            <FormInputKualitasUdaraHarian
            daftarLokasi={daftarLokasiUdara}
            onBerhasilSimpan={() => setFormTerbuka(null)}
            />
        </ModalSederhana>
        )}
    </div>
  );
}