// app/(dashboard)/dashboard/pengawasan-klinik/PengawasanKlinikClient.tsx
'use client';

import dynamic from 'next/dynamic';
const PetaKlinik = dynamic(() => import('@/components/pengawasan-klinik/PetaKlinik'), { ssr: false });
import { Fragment, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { bangunBarisExcel } from '@/lib/pengawasan-klinik/labelKolomExport';

type RingkasanStatus = {
  memenuhi_syarat: number;
  perlu_perbaikan: number;
  tidak_memenuhi_syarat: number;
};

type BreakdownKategori = { kategori: string; persentase: number };

type BarisKlinik = {
  id: string;
  klinikId: string;
  namaKlinik: string;
  jenisFasilitas: string;
  tanggalTerakhir: string;
  status: string;
  persentase: number;
  itemBermasalah: string[];
};

const WARNA_STATUS: Record<string, string> = {
  memenuhi_syarat: '#16a34a',
  perlu_perbaikan: '#ca8a04',
  tidak_memenuhi_syarat: '#dc2626',
};

const LABEL_STATUS: Record<string, string> = {
  memenuhi_syarat: 'Memenuhi Syarat',
  perlu_perbaikan: 'Perlu Perbaikan',
  tidak_memenuhi_syarat: 'Tidak Memenuhi Syarat',
};

type TitikKlinik = {
  id: string;
  nama_klinik: string;
  alamat_klinik: string | null;
  kabupaten_kota: string | null;
  telepon: string | null;
  latitude: number | null;
  longitude: number | null;
  statusTerbaru: string | null;
};

type Props = {
  ringkasanStatus: RingkasanStatus;
  rataRataKategori: BreakdownKategori[];
  tabelKlinik: BarisKlinik[];
  totalKlinikDiawasi: number;
  titikPeta: TitikKlinik[];
  dataLengkapUntukExport: Record<string, any>[]; // tambahan
};

export default function PengawasanKlinikClient({
  ringkasanStatus,
  rataRataKategori,
  tabelKlinik,
  totalKlinikDiawasi,
  titikPeta,
  dataLengkapUntukExport, // tambahan
}: Props) {
  const [klinikDibuka, setKlinikDibuka] = useState<string | null>(null);

  const dataPie = Object.entries(ringkasanStatus).map(([key, value]) => ({
    name: LABEL_STATUS[key],
    value,
    warna: WARNA_STATUS[key],
  }));

  function unduhExcel(rows: Record<string, any>[], namaFile: string) {
    if (rows.length === 0) {
      alert('Tidak ada data untuk diunduh.');
      return;
    }
    const dataSiapExport = rows.map(bangunBarisExcel);
    const worksheet = XLSX.utils.json_to_sheet(dataSiapExport);

    const lebarKolom = Object.keys(dataSiapExport[0] ?? {}).map((key) => ({
      wch: Math.min(Math.max(key.length, 12), 40),
    }));
    worksheet['!cols'] = lebarKolom;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pengawasan');
    XLSX.writeFile(workbook, namaFile);
  }

  function handleDownloadSemua() {
    const tanggalFile = new Date().toISOString().split('T')[0];
    unduhExcel(dataLengkapUntukExport, `pengawasan-klinik-semua-${tanggalFile}.xlsx`);
  }

  function handleDownloadPerKlinik(klinikId: string, namaKlinik: string) {
    const rowsKlinikIni = dataLengkapUntukExport.filter((r) => r.klinik_id === klinikId);
    const namaFileAman = namaKlinik.replace(/[^a-zA-Z0-9]/g, '-');
    unduhExcel(rowsKlinikIni, `pengawasan-${namaFileAman}.xlsx`);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pengawasan Klinik Binaan</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadSemua}
            className="flex items-center gap-1.5 border px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            <Download size={14} />
            Download Semua (Excel)
          </button>
          <Link
            href="/dashboard/pengawasan-klinik/klinik"
            className="border px-4 py-2 rounded text-sm"
          >
            Daftar Klinik
          </Link>
          <Link
            href="/dashboard/pengawasan-klinik/tambah"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            + Tambah Pengawasan
          </Link>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Klinik Diawasi</p>
          <p className="text-2xl font-bold">{totalKlinikDiawasi}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Memenuhi Syarat</p>
          <p className="text-2xl font-bold text-green-600">{ringkasanStatus.memenuhi_syarat}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Perlu Perbaikan</p>
          <p className="text-2xl font-bold text-yellow-600">{ringkasanStatus.perlu_perbaikan}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Tidak Memenuhi Syarat</p>
          <p className="text-2xl font-bold text-red-600">{ringkasanStatus.tidak_memenuhi_syarat}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie chart status */}
        <div className="border rounded-lg p-4">
          <h2 className="font-medium mb-2">Distribusi Status Kepatuhan</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={dataPie} dataKey="value" nameKey="name" outerRadius={90} label>
                {dataPie.map((entry) => (
                  <Cell key={entry.name} fill={entry.warna} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart rata-rata kategori */}
        <div className="border rounded-lg p-4">
          <h2 className="font-medium mb-2">Rata-rata Kepatuhan per Kategori</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rataRataKategori}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="kategori" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="persentase" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Peta Lokasi Klinik</h2>
        <PetaKlinik daftarKlinik={titikPeta} />
      </div>

      {/* Tabel klinik */}
      <div>
        <h2 className="font-medium mb-2">Daftar Klinik</h2>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Nama Klinik</th>
                <th className="text-left px-4 py-2">Jenis</th>
                <th className="text-left px-4 py-2">Tanggal Terakhir</th>
                <th className="text-left px-4 py-2">Kepatuhan</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2"></th>
                <th className="text-left px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tabelKlinik.map((k) => (
                <Fragment key={k.id}>
                  <tr className="border-t">
                    <td className="px-4 py-2">{k.namaKlinik}</td>
                    <td className="px-4 py-2">{k.jenisFasilitas}</td>
                    <td className="px-4 py-2">{new Date(k.tanggalTerakhir).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-2">{k.persentase}%</td>
                    <td className="px-4 py-2">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: WARNA_STATUS[k.status] }}
                      >
                        {LABEL_STATUS[k.status] ?? k.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {k.itemBermasalah.length > 0 && (
                        <button
                          onClick={() => setKlinikDibuka(klinikDibuka === k.id ? null : k.id)}
                          className="text-blue-600 text-xs underline"
                        >
                          {klinikDibuka === k.id ? 'Tutup' : `${k.itemBermasalah.length} item bermasalah`}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDownloadPerKlinik(k.klinikId, k.namaKlinik)}
                        className="flex items-center gap-1 text-blue-600 text-xs underline"
                        title="Download data lengkap klinik ini"
                      >
                        <Download size={12} />
                        Excel
                      </button>
                    </td>
                  </tr>
                  {klinikDibuka === k.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-2">
                        <ul className="list-disc list-inside text-xs text-gray-700">
                          {k.itemBermasalah.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}