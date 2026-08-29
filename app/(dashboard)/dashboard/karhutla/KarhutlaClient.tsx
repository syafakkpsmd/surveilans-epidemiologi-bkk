'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";



const PetaHotspotKarhutla = dynamic(() => import('@/components/karhutla/PetaHotspotKarhutla'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm h-105 flex items-center justify-center text-sm text-gray-400">
      Memuat peta...
    </div>
  ),
});

function buatPeriodeKey(f: StateFilterPeriode): string {
  const prefix = f.granularitas === 'bulanan' ? 'M' : 'W'; // 'mingguan' & 'skdr' sama-sama per-minggu
  return `${f.tahun}-${prefix}${f.periodeAwal}_${prefix}${f.periodeAkhir}`;
}

function tambahkanParamWilayah(params: URLSearchParams, wilayahKeys: string[]) {
  wilayahKeys.forEach((k) => params.append('wilayah', k));
}

export default function KarhutlaClient({
  role, trenAwal, hotspotAwal, daftarWilayahIspa, daftarLokasiUdara, daftarWilayahSkdr,
}: {
  role: string | null;
  trenAwal: TitikTrenIspa[];
  hotspotAwal: HotspotRow[];
  daftarWilayahIspa: WilayahIspaRow[];
  daftarLokasiUdara: LokasiUdaraRow[];
  daftarWilayahSkdr: string[];
}) {
  const isAdmin = role === 'admin';
  const router = useRouter();
  const [sinkronBerjalan, setSinkronBerjalan] = useState(false);
  const [pesanSinkron, setPesanSinkron] = useState<{ tipe: 'sukses' | 'error'; teks: string } | null>(null);

  async function sinkronisasiHotspotSekarang() {
    setSinkronBerjalan(true);
    setPesanSinkron(null);
    try {
      const res = await fetch('/api/hotspot-karhutla', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Gagal sinkronisasi.');
      setPesanSinkron({ tipe: 'sukses', teks: json.pesan ?? `Sinkronisasi berhasil, ${json.jumlah ?? 0} titik diproses.` });
      router.refresh();
    } catch (err) {
      setPesanSinkron({ tipe: 'error', teks: (err as Error).message });
    } finally {
      setSinkronBerjalan(false);
    }
  }

  const [tren, setTren] = useState(trenAwal);
  const [filterWilayahKurva, setFilterWilayahKurva] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [formTerbuka, setFormTerbuka] = useState<'ispa' | 'udara' | null>(null);

  const opsiWilayah = buatOpsiWilayahIspa(daftarWilayahIspa);

  const tahunSekarang = new Date().getFullYear();
  const [filterPeriode, setFilterPeriode] = useState<StateFilterPeriode>({
    granularitas: 'mingguan', tahun: tahunSekarang, periodeAwal: 1, periodeAkhir: 53, wilayahKeys: [], wilayahSkdr: undefined,
  });
  const [dataPerbandingan, setDataPerbandingan] = useState<TitikPerbandinganIspaHotspot[]>([]);
  const [memuatPerbandingan, setMemuatPerbandingan] = useState(false);

  useEffect(() => {
    if (filterPeriode.periodeAwal > filterPeriode.periodeAkhir) return;

    const controller = new AbortController();
    setMemuatPerbandingan(true);

    let url: string;
    if (filterPeriode.granularitas === 'skdr') {
      const params = new URLSearchParams({
        tahun: String(filterPeriode.tahun),
        awal: String(filterPeriode.periodeAwal),
        akhir: String(filterPeriode.periodeAkhir),
      });
      if (filterPeriode.wilayahSkdr) params.set('wilayah', filterPeriode.wilayahSkdr);
      url = `/api/karhutla-perbandingan-skdr?${params.toString()}`;
    } else {
      const params = new URLSearchParams({
        granularitas: filterPeriode.granularitas,
        tahun: String(filterPeriode.tahun),
        awal: String(filterPeriode.periodeAwal),
        akhir: String(filterPeriode.periodeAkhir),
      });
      tambahkanParamWilayah(params, filterPeriode.wilayahKeys);
      url = `/api/karhutla-perbandingan?${params.toString()}`;
    }

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setDataPerbandingan(json.data ?? []))
      .catch((err) => { if (err.name !== 'AbortError') console.error('Gagal ambil data perbandingan:', err); })
      .finally(() => setMemuatPerbandingan(false));

    return () => controller.abort();
  }, [filterPeriode]);

  const periodeKey = buatPeriodeKey(filterPeriode);
  const kontekPerbandingan =
    filterPeriode.granularitas === 'mingguan' ? 'karhutla-ispa-mingguan'
    : filterPeriode.granularitas === 'bulanan' ? 'karhutla-ispa-bulanan'
    : 'skdr-ispa-mingguan';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
        {isAdmin && (
          <button
            onClick={sinkronisasiHotspotSekarang}
            disabled={sinkronBerjalan}
            className="inline-flex items-center gap-1.5 rounded-md border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sinkronBerjalan ? '⏳ Menyinkronkan...' : '🔄 Sinkronisasi Hotspot Sekarang'}
          </button>
        )}
        <a
          href="/dashboard/karhutla/data"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          📋 Lihat Semua Data &amp; Unduh Excel/CSV
        </a>
      </div>

      {pesanSinkron && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            pesanSinkron.tipe === 'sukses'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {pesanSinkron.teks}
        </div>
      )}

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
        <FilterRentangPeriodeKarhutla
          nilai={filterPeriode}
          onUbah={setFilterPeriode}
          daftarWilayahIspa={daftarWilayahIspa}
          daftarWilayahSkdr={daftarWilayahSkdr}
        />
        {memuatPerbandingan ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Memuat data perbandingan...
          </div>
        ) : (
          <KurvaPerbandinganIspaHotspot
            data={dataPerbandingan}
            sumberLabel={filterPeriode.granularitas === 'skdr' ? 'ISPA-AA mingguan, SKDR' : 'ISPA harian, modul karhutla'}
          />
        )}
        {/* TODO: BoxAnalisisAI / BoxPrediksiAI — lihat catatan di riwayat sebelumnya */}
      </div>
      <GrafikMultiParameterHarianKarhutla daftarLokasiUdara={daftarLokasiUdara} />

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