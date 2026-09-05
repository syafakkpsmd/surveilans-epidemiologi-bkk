"use client";

import { useMemo, useState } from "react";
import KlinikClient from "./KlinikClient";
import GrafikTotalGabungan from "./GrafikTotalGabungan";
import MultiSeriesKlinikChart from "@/components/klinik/MultiSeriesKlinikChart";
import { KartuRekap } from "@/components/klinik/KartuRekap";
import { DonutChart } from "@/components/klinik/DonutChart";
import { PencarianIcv } from "@/components/klinik/PencarianIcv";
import { PengaturanStandarVaksin } from "@/components/klinik/PengaturanStandarVaksin";

const kategoriEfektif = (k: any) => k.kategori ?? 'klinik';

type Props = {
  dataMingguanAll: any[];
  dataBulananAll: any[];
  daftarKlinikNama: string[];
  daftarBkkNama: string[];
  rekapGabungan: any;
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  tahunEpidBerjalan: number;
  mingguEpidBerjalan: number;
  standarHariVaksin: number;
};

export default function KlinikDashboardClient({
  dataMingguanAll, dataBulananAll, daftarKlinikNama, daftarBkkNama, rekapGabungan,
  role, tahunBerjalan, bulanBerjalan, tahunEpidBerjalan, mingguEpidBerjalan, standarHariVaksin,
}: Props) {
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("mingguan");

  const dataMingguanKlinik = useMemo(() => dataMingguanAll.filter((r) => kategoriEfektif(r) === 'klinik'), [dataMingguanAll]);
  const dataMingguanBkk = useMemo(() => dataMingguanAll.filter((r) => kategoriEfektif(r) === 'bkk'), [dataMingguanAll]);
  const dataBulananKlinik = useMemo(() => dataBulananAll.filter((r) => kategoriEfektif(r) === 'klinik'), [dataBulananAll]);
  const dataBulananBkk = useMemo(() => dataBulananAll.filter((r) => kategoriEfektif(r) === 'bkk'), [dataBulananAll]);

  const propsBersama = {
    role, tahunBerjalan, bulanBerjalan, tahunEpidBerjalan, mingguEpidBerjalan, standarHariVaksin, granularitas,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <div>
        <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans Layanan Vaksinasi Internasional BKK Kelas I Samarinda</h1>
        <p className="text-xs text-gray-500 mt-1">Layanan Vaksinasi Internasional Tahun {tahunBerjalan} — Wilayah Kerja BKK & Klinik Binaan</p>
        </div>

        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium">
          <button type="button" onClick={() => setGranularitas("mingguan")}
            className={`rounded-md px-3 py-1.5 transition-all ${granularitas === "mingguan" ? "bg-[#0F4C5C] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"}`}>
            Mingguan
          </button>
          <button type="button" onClick={() => setGranularitas("bulanan")}
            className={`rounded-md px-3 py-1.5 transition-all ${granularitas === "bulanan" ? "bg-[#0F4C5C] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"}`}>
            Bulanan
          </button>
        </div>
      </div>

      <KartuRekap data={rekapGabungan.kartu} />

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DonutChart judul="Proporsi Menurut Jenis Kelamin" data={rekapGabungan.donutJenisKelamin} />
        <DonutChart judul="Proporsi Menurut Kategori Umur" data={rekapGabungan.donutUmur} />
        <DonutChart judul="Proporsi Menurut Jenis Vaksinasi" data={rekapGabungan.donutJenisDokumenIcv} />
        <DonutChart judul="Proporsi Menurut Hasil WUS (Perempuan)" data={rekapGabungan.donutWus} />
      </div>

      <PencarianIcv />

      {/* 1. TOTAL GABUNGAN */}
      <GrafikTotalGabungan
        granularitas={granularitas}
        dataMingguanKlinik={dataMingguanKlinik}
        dataMingguanBkk={dataMingguanBkk}
        dataBulananKlinik={dataBulananKlinik}
        dataBulananBkk={dataBulananBkk}
        standarHariVaksin={standarHariVaksin}
      />

      {role === 'admin' && <PengaturanStandarVaksin nilaiAwal={standarHariVaksin} />}

      {/* 2. LAYANAN DI WILAYAH KERJA BKK */}
        <div className="space-y-6">
            <KlinikClient {...propsBersama}
            judul="Surveilans Layanan Vaksinasi per Wilayah Kerja BKK"
            kategoriLabel="Wilayah Kerja BKK"
            daftarKlinik={daftarBkkNama}
            dataMingguan={dataMingguanBkk}
            dataBulanan={dataBulananBkk}
            />
        </div>

        {/* 3. LAYANAN DI KLINIK BINAAN */}
        <div className="space-y-6">
            <KlinikClient {...propsBersama}
            judul="Surveilans Layanan Vaksinasi di Klinik Binaan"
            kategoriLabel="Klinik Binaan"
            daftarKlinik={daftarKlinikNama}
            dataMingguan={dataMingguanKlinik}
            dataBulanan={dataBulananKlinik}
            />
        </div>
      </div>
  );
}