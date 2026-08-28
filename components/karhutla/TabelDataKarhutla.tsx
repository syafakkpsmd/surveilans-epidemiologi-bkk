'use client';

import { unduhCsv } from '@/lib/karhutla/csv';
import { DAFTAR_WILAYAH_KARHUTLA } from '@/lib/karhutla/constants';
import type { BarisTabelIspa, BarisTabelKualitasUdara } from '@/lib/supabase/queries-karhutla-server';

function labelWilayah(kodeWilker: string, zona: string | null): string {
  const entri = DAFTAR_WILAYAH_KARHUTLA.find((w) =>
    zona ? w.kode_wilker === kodeWilker && w.zona === zona : w.kode_wilker === kodeWilker && !w.zona
  );
  return entri?.label ?? `${kodeWilker}${zona ? ` (${zona})` : ''}`;
}

function formatTanggal(tanggal: string): string {
  return new Date(tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TabelDataKarhutla({
  dataIspa,
  dataUdara,
}: {
  dataIspa: BarisTabelIspa[];
  dataUdara: BarisTabelKualitasUdara[];
}) {
  function unduhIspa() {
    unduhCsv(
      `ispa-harian-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'wilayah', label: 'Wilayah' },
        { key: 'kasus_ispa_anak', label: 'Kasus ISPA Anak' },
        { key: 'kasus_ispa_dewasa', label: 'Kasus ISPA Dewasa' },
        { key: 'keterangan', label: 'Keterangan' },
      ],
      dataIspa.map((d) => ({
        tanggal: d.tanggal,
        wilayah: labelWilayah(d.kode_wilker, d.zona),
        kasus_ispa_anak: d.kasus_ispa_anak,
        kasus_ispa_dewasa: d.kasus_ispa_dewasa,
        keterangan: d.keterangan ?? '',
      }))
    );
  }

  function unduhUdara() {
    unduhCsv(
      `kualitas-udara-harian-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'lokasi', label: 'Lokasi' },
        { key: 'pm25', label: 'PM2.5' },
        { key: 'pm10', label: 'PM10' },
        { key: 'suhu', label: 'Suhu' },
        { key: 'hcho', label: 'HCHO' },
        { key: 'tvoc', label: 'TVOC' },
        { key: 'kelembapan', label: 'Kelembapan' },
        { key: 'ispu_status', label: 'Status ISPU' },
        { key: 'status_evaluasi', label: 'Status Evaluasi' },
        { key: 'catatan_evaluasi', label: 'Catatan' },
      ],
      dataUdara.map((d) => ({
        tanggal: d.tanggal,
        lokasi: d.lokasi,
        pm25: d.pm25 ?? '',
        pm10: d.pm10 ?? '',
        suhu: d.suhu ?? '',
        hcho: d.hcho ?? '',
        tvoc: d.tvoc ?? '',
        kelembapan: d.kelembapan ?? '',
        ispu_status: d.ispu_status ?? '',
        status_evaluasi: d.status_evaluasi,
        catatan_evaluasi: d.catatan_evaluasi ?? '',
      }))
    );
  }

  return (
    <div className="space-y-8">
      {/* ================= Tabel ISPA ================= */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Data Kasus ISPA Harian</h2>
            <p className="text-xs text-gray-500">{dataIspa.length} baris</p>
          </div>
          <button
            onClick={unduhIspa}
            disabled={dataIspa.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⬇ Unduh CSV
          </button>
        </div>

        <div className="overflow-x-auto max-h-105">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Tanggal</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Wilayah</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Anak</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Dewasa</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dataIspa.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Belum ada data.</td></tr>
              ) : (
                dataIspa.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(d.tanggal)}</td>
                    <td className="px-3 py-2">{labelWilayah(d.kode_wilker, d.zona)}</td>
                    <td className="px-3 py-2 text-right">{d.kasus_ispa_anak}</td>
                    <td className="px-3 py-2 text-right">{d.kasus_ispa_dewasa}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{d.keterangan ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= Tabel Kualitas Udara ================= */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Data Kualitas Udara Harian</h2>
            <p className="text-xs text-gray-500">{dataUdara.length} baris</p>
          </div>
          <button
            onClick={unduhUdara}
            disabled={dataUdara.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⬇ Unduh CSV
          </button>
        </div>

        <div className="overflow-x-auto max-h-105">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Tanggal</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Lokasi</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">PM2.5</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">PM10</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Suhu</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">HCHO</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">TVOC</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Lembap</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dataUdara.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-400">Belum ada data.</td></tr>
              ) : (
                dataUdara.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(d.tanggal)}</td>
                    <td className="px-3 py-2">{d.lokasi}</td>
                    <td className="px-3 py-2 text-right">{d.pm25 ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.pm10 ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.suhu ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.hcho ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.tvoc ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.kelembapan ?? '-'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.status_evaluasi === 'TMS'
                            ? 'bg-red-100 text-red-700'
                            : d.status_evaluasi === 'MS'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {d.status_evaluasi}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}