"use client";

import { useMemo } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import KomorbidChart from "@/components/klinik/KomorbidChart";
import { DAFTAR_KOMORBID } from "@/lib/klinik/komorbid";

const NAMA_BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

type Props = {
  granularitas: "mingguan" | "bulanan";
  dataMingguanKlinik: any[];
  dataMingguanBkk: any[];
  dataBulananKlinik: any[];
  dataBulananBkk: any[];
  standarHariVaksin: number;
};

function labelUrutan(granularitas: "mingguan" | "bulanan", urutan: number) {
  return granularitas === "bulanan" ? (NAMA_BULAN[urutan - 1] || `Bln-${urutan}`) : `Mg-${urutan}`;
}

function objekAwal(label: string, urutan: number) {
  return {
    name: label, label, urutan,
    total_layanan: 0, laki_laki: 0, perempuan: 0,
    total_layanan_klinik: 0, total_layanan_bkk: 0,
    meningitis: 0, flu: 0, polio: 0, yellow_fever: 0,
    patuh: 0, tidak_patuh: 0,
    wus_ya: 0, hasil_wus_positif: 0, hasil_wus_negatif: 0,
    ...Object.fromEntries(DAFTAR_KOMORBID.map((k) => [k.key, 0])),
  };
}

export default function GrafikTotalGabungan({
  granularitas, dataMingguanKlinik, dataMingguanBkk, dataBulananKlinik, dataBulananBkk, standarHariVaksin,
}: Props) {
  const sumberKlinik = granularitas === "bulanan" ? dataBulananKlinik : dataMingguanKlinik;
  const sumberBkk = granularitas === "bulanan" ? dataBulananBkk : dataMingguanBkk;
  const fieldUrutan = granularitas === "bulanan" ? "bulan" : "minggu";
  const tipeChart = granularitas === "mingguan" ? "line" : "bar";

  // Data gabungan TOTAL (klinik + bkk dijumlahkan per periode)
  const dataGabungan = useMemo(() => {
    const peta = new Map<number, any>();

    for (const item of sumberKlinik) {
      const urutan = Number(item[fieldUrutan]);
      if (isNaN(urutan) || urutan <= 0) continue;
      const existing = peta.get(urutan) ?? objekAwal(labelUrutan(granularitas, urutan), urutan);
      existing.total_layanan += Number(item.total_layanan || 0);
      existing.total_layanan_klinik += Number(item.total_layanan || 0);
      existing.laki_laki += Number(item.laki_laki || 0);
      existing.perempuan += Number(item.perempuan || 0);
      existing.meningitis += Number(item.meningitis || 0);
      existing.flu += Number(item.flu || 0);
      existing.polio += Number(item.polio || 0);
      existing.yellow_fever += Number(item.yellow_fever || 0);
      existing.patuh += Number(item.patuh || 0);
      existing.tidak_patuh += Number(item.tidak_patuh || 0);
      existing.wus_ya += Number(item.wus_ya || 0);
      existing.hasil_wus_positif += Number(item.hasil_wus_positif || 0);
      existing.hasil_wus_negatif += Number(item.hasil_wus_negatif || 0);
      for (const k of DAFTAR_KOMORBID) existing[k.key] += Number(item[k.key] || 0);
      peta.set(urutan, existing);
    }

    for (const item of sumberBkk) {
      const urutan = Number(item[fieldUrutan]);
      if (isNaN(urutan) || urutan <= 0) continue;
      const existing = peta.get(urutan) ?? objekAwal(labelUrutan(granularitas, urutan), urutan);
      existing.total_layanan += Number(item.total_layanan || 0);
      existing.total_layanan_bkk += Number(item.total_layanan || 0);
      existing.laki_laki += Number(item.laki_laki || 0);
      existing.perempuan += Number(item.perempuan || 0);
      existing.meningitis += Number(item.meningitis || 0);
      existing.flu += Number(item.flu || 0);
      existing.polio += Number(item.polio || 0);
      existing.yellow_fever += Number(item.yellow_fever || 0);
      existing.patuh += Number(item.patuh || 0);
      existing.tidak_patuh += Number(item.tidak_patuh || 0);
      existing.wus_ya += Number(item.wus_ya || 0);
      existing.hasil_wus_positif += Number(item.hasil_wus_positif || 0);
      existing.hasil_wus_negatif += Number(item.hasil_wus_negatif || 0);
      for (const k of DAFTAR_KOMORBID) existing[k.key] += Number(item[k.key] || 0);
      peta.set(urutan, existing);
    }

    return Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
  }, [sumberKlinik, sumberBkk, granularitas, fieldUrutan]);

  if (dataGabungan.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
        Data total gabungan ({granularitas}) belum tersedia.
      </div>
    );
  }

  return (
   <div className="space-y-6 px-1">
    <h2 className="text-lg font-bold text-[#0F2A38] px-2">Grafik Total Layanan di BKK Kelas I Samarinda</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Total seluruh vaksinasi */}
        <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
          <h3 className="mb-4 text-center text-sm font-bold text-gray-800">
            Distribusi Seluruh Vaksinasi di BKK Kelas I Samarinda
            <br /><span className="font-normal text-gray-500">(dalam {granularitas})</span>
          </h3>
          <TrenChartLine data={dataGabungan} tipeChart={tipeChart} seriesList={[
            { key: "total_layanan", label: "Total Layanan", warna: "#0F4C5C" },
          ]} />
        </div>

        {/* 2. Total layanan + jenis kelamin */}
        <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
          <h3 className="mb-4 text-center text-sm font-bold text-gray-800">Distribusi Layanan Vaksinasi menurut Jenis Kelamin di BKK Kelas I Samarinda
            <br /><span className="font-normal text-gray-500">(dalam {granularitas})</span>
          </h3>
          <TrenChartLine data={dataGabungan} tipeChart={tipeChart} seriesList={[
            { key: "total_layanan", label: "Total Layanan", warna: "#0F4C5C" },
            { key: "laki_laki", label: "Laki-laki", warna: "#2563eb" },
            { key: "perempuan", label: "Perempuan", warna: "#f97316" },
          ]} />
        </div>

        {/* 3. BKK vs Klinik */}
        <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
          <h3 className="mb-4 text-center text-sm font-bold text-gray-800">Distribusi Layanan berdasarkan Klinik BKK dan Klinik Binaan di BKK Kelas I Samarinda 
            <br /><span className="font-normal text-gray-500">(dalam {granularitas})</span>
          </h3>
          <TrenChartLine data={dataGabungan} tipeChart={tipeChart} seriesList={[
            { key: "total_layanan_klinik", label: "Klinik", warna: "#0F4C5C" },
            { key: "total_layanan_bkk", label: "BKK", warna: "#DC2626" },
          ]} />
        </div>

        {/* 4. Jenis vaksinasi */}
        <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
          <h3 className="mb-4 text-center text-sm font-bold text-gray-800">Distribusi Layanan berdasarkan Jenis Vaksinasi di BKK Kelas I Samarinda
            <br /><span className="font-normal text-gray-500">(dalam {granularitas})</span>
          </h3>
          <TrenChartLine data={dataGabungan} tipeChart={tipeChart} seriesList={[
            { key: "meningitis", label: "Meningitis", warna: "#7C3AED" },
            { key: "flu", label: "Flu", warna: "#00838F" },
            { key: "polio", label: "Polio", warna: "#2E7D32" },
            { key: "yellow_fever", label: "Yellow Fever", warna: "#E65100" },
          ]} />
        </div>

        {/* 5. WUS Total */}
        <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
          <h3 className="mb-4 text-center text-sm font-bold text-gray-800">Distribusi Hasil Pemeriksaan Wanita Usia Subur (WUS) di BKK Kelas I Samarinda
            <br /><span className="font-normal text-gray-500">(dalam {granularitas})</span>
          </h3>
          <TrenChartLine data={dataGabungan} tipeChart={tipeChart} seriesList={[
            { key: "wus_ya", label: "WUS (Ya)", warna: "#CA8A04" },
            { key: "hasil_wus_positif", label: "Hasil Positif", warna: "#DC2626" },
            { key: "hasil_wus_negatif", label: "Hasil Negatif", warna: "#2E7D32" },
          ]} />
        </div>

        {/* 6. Komorbid — dengan checkbox */}
        <KomorbidChart judul={`Distribusi Penerima Layanan dengan Komorbid dalam ${granularitas}`} data={dataGabungan} tipeChart={tipeChart} />

        {/* 7. Kepatuhan */}
        <div className="rounded-xl bg-white p-5 shadow-xs border border-red-100 lg:col-span-2">
          <h3 className="mb-4 text-center text-sm font-bold text-red-900">
            Distribusi Kepatuhan Masa Aktif Vaksin (standar {standarHariVaksin} hari) di BKK Kelas I Samarinda
            <br /><span className="font-normal text-gray-500">(dalam {granularitas})</span>
          </h3>
          <TrenChartLine data={dataGabungan} tipeChart={tipeChart} seriesList={[
            { key: "patuh", label: `Patuh (≥${standarHariVaksin} hari)`, warna: "#2E7D32" },
            { key: "tidak_patuh", label: `Tidak Patuh (<${standarHariVaksin} hari)`, warna: "#B71C1C" },
          ]} />
        </div>
      </div>
    </div>
  );
}