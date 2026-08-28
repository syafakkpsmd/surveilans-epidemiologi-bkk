'use client';

import ModalSederhana from '@/components/ui/ModalSederhana';
import { useEffect, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import FormInputIspaHarian from '@/components/karhutla/FormInputIspaHarian';
import FormInputKualitasUdaraHarian from '@/components/karhutla/FormInputKualitasUdaraHarian';
import KurvaEpidemikIspaPm25, { type TitikTrenIspa } from '@/components/karhutla/KurvaEpidemikIspaPm25';
import KurvaPerbandinganIspaHotspot from '@/components/karhutla/KurvaPerbandinganIspaHotspot';
import FilterRentangPeriodeKarhutla, { type StateFilterPeriode } from '@/components/karhutla/FilterRentangPeriodeKarhutla';
import FilterGrafikHarianKarhutla, { type StateFilterHarian } from '@/components/karhutla/FilterGrafikHarianKarhutla';
import GrafikHarianRentangKarhutla from '@/components/karhutla/GrafikHarianRentangKarhutla';
import { DAFTAR_WILAYAH_KARHUTLA } from '@/lib/karhutla/constants';
import type { HotspotRow } from '@/components/karhutla/PetaHotspotKarhutla';
import type {
  TitikPerbandinganIspaHotspot,
  TitikTrenHarianRentang,
  WilayahIspaRow,
  LokasiUdaraRow,
} from '@/lib/supabase/queries-karhutla-server';

// TODO: sesuaikan import ini dengan lokasi BoxAnalisisAI/BoxPrediksiAI di project Anda
// (pola yang sama sudah dipakai di halaman PHQC/COP/Vektor Tikus/TTU)
// import BoxAnalisisAI from '@/components/ai/BoxAnalisisAI';
// import BoxPrediksiAI from '@/components/ai/BoxPrediksiAI';

// Leaflet butuh window -> wajib dynamic import tanpa SSR (pola sama dgn PetaWilker existing)
const PetaHotspotKarhutla = dynamic(() => import('@/components/karhutla/PetaHotspotKarhutla'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm h-105 flex items-center justify-center text-sm text-gray-400">
      Memuat peta...
    </div>
  ),
});

/** periodeKey konsisten dengan konvensi project (lihat pola SKDR Tren): "<tahun>-W<awal>_W<akhir>" atau "<tahun>-M<awal>_M<akhir>" */
function buatPeriodeKey(f: StateFilterPeriode): string {
  const prefix = f.granularitas === 'mingguan' ? 'W' : 'M';
  return `${f.tahun}-${prefix}${f.periodeAwal}_${prefix}${f.periodeAkhir}`;
}

export default function KarhutlaClient({
  trenAwal,
  hotspotAwal,
  daftarWilayahIspa,
  daftarLokasiUdara,
}: {
  trenAwal: TitikTrenIspa[];
  hotspotAwal: HotspotRow[];
  daftarWilayahIspa: WilayahIspaRow[];
  daftarLokasiUdara: LokasiUdaraRow[];
}) {
  const [tren, setTren] = useState(trenAwal);
  const [filterWilayah, setFilterWilayah] = useState('Semua');
  const [formTerbuka, setFormTerbuka] = useState<'ispa' | 'udara' | null>(null);
  const [isPending, startTransition] = useTransition();

  // --- Filter rentang periode untuk perbandingan ISPA vs Hotspot ---
  const tahunSekarang = new Date().getFullYear();
  const [filterPeriode, setFilterPeriode] = useState<StateFilterPeriode>({
    granularitas: 'mingguan',
    tahun: tahunSekarang,
    periodeAwal: 1,
    periodeAkhir: 53,
    wilayahKey: 'Semua',
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
      wilayah: filterPeriode.wilayahKey,
    });

    fetch(`/api/karhutla-perbandingan?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setDataPerbandingan(json.data ?? []))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Gagal ambil data perbandingan:', err);
      })
      .finally(() => setMemuatPerbandingan(false));

    return () => controller.abort();
  }, [filterPeriode]);

  const periodeKey = buatPeriodeKey(filterPeriode);
  const kontekPerbandingan = filterPeriode.granularitas === 'mingguan' ? 'karhutla-ispa-mingguan' : 'karhutla-ispa-bulanan';

  // --- Grafik harian dengan rentang tanggal bebas ---
  const hariIniStr = new Date().toISOString().slice(0, 10);
  const tigaPuluhHariLalu = new Date();
  tigaPuluhHariLalu.setDate(tigaPuluhHariLalu.getDate() - 30);
  const [filterHarian, setFilterHarian] = useState<StateFilterHarian>({
    tanggalAwal: tigaPuluhHariLalu.toISOString().slice(0, 10),
    tanggalAkhir: hariIniStr,
    wilayahKey: 'Semua',
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
      wilayah: filterHarian.wilayahKey,
      parameter: filterHarian.parameter,
    });

    fetch(`/api/karhutla-tren-harian?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setDataHarian(json.data ?? []))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Gagal ambil data tren harian:', err);
      })
      .finally(() => setMemuatHarian(false));

    return () => controller.abort();
  }, [filterHarian]);

  async function muatUlangTren(wilayahKey: string) {
    setFilterWilayah(wilayahKey);
    startTransition(async () => {
      const res = await fetch(`/api/tren-ispa?wilayah=${encodeURIComponent(wilayahKey)}`);
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
          📋 Lihat Semua Data &amp; Unduh CSV
        </a>
      </div>

      <PetaHotspotKarhutla hotspots={hotspotAwal} />

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter wilayah untuk kurva:</label>
        <select
          value={filterWilayah}
          onChange={(e) => muatUlangTren(e.target.value)}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="Semua">Semua Wilayah</option>
          {DAFTAR_WILAYAH_KARHUTLA.map((w) => (
            <option key={w.label} value={w.zona ? `${w.kode_wilker}::${w.zona}` : w.kode_wilker}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      <KurvaEpidemikIspaPm25 data={tren} />

      {/* ================= Grafik Harian dengan Rentang Tanggal Bebas ================= */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Grafik Harian (Rentang Tanggal Bebas)</h2>

        <FilterGrafikHarianKarhutla nilai={filterHarian} onUbah={setFilterHarian} />

        {memuatHarian ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Memuat grafik...
          </div>
        ) : (
          <GrafikHarianRentangKarhutla data={dataHarian} parameter={filterHarian.parameter} />
        )}
      </div>

      {/* ================= Perbandingan ISPA vs Hotspot + Analisis/Prediksi AI ================= */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Analisis Kasus ISPA vs Titik Panas</h2>

        <FilterRentangPeriodeKarhutla nilai={filterPeriode} onUbah={setFilterPeriode} />

        {memuatPerbandingan ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Memuat data perbandingan...
          </div>
        ) : (
          <KurvaPerbandinganIspaHotspot data={dataPerbandingan} />
        )}

        {/*
          TODO: pasang BoxAnalisisAI & BoxPrediksiAI di sini, sesuaikan nama prop
          dengan komponen existing Anda (biasanya konteks/periodeKey/wilayahKerja).
          konteks berbeda otomatis untuk mingguan vs bulanan:

          <BoxAnalisisAI
            konteks={kontekPerbandingan}
            periodeKey={periodeKey}
            wilayahKerja={filterPeriode.wilayahKey}
          />
          <BoxPrediksiAI
            konteks={kontekPerbandingan}
            periodeKey={periodeKey}
            wilayahKerja={filterPeriode.wilayahKey}
          />

          Jangan lupa daftarkan konteks 'karhutla-ispa-mingguan' dan
          'karhutla-ispa-bulanan' di lib/ai/data.ts, lib/ai/prompt.ts,
          dan route.ts (pola sync-3-tempat yang sudah baku di project ini).
        */}
      </div>

            <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setFormTerbuka('ispa')}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
        >
          [+] Input Kasus ISPA
        </button>
        <button
          onClick={() => setFormTerbuka('udara')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          [+] Input Kualitas Udara
        </button>
      </div>

      {formTerbuka === 'ispa' && (
        <ModalSederhana judul="Input Kasus ISPA" onTutup={() => setFormTerbuka(null)}>
          <FormInputIspaHarian
            daftarWilayah={daftarWilayahIspa}
            onBerhasilSimpan={() => {
              muatUlangTren(filterWilayah);
              setFormTerbuka(null);
            }}
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