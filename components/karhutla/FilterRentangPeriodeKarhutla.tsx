'use client';

import PilihWilayahMultiSelect from './PilihWilayahMultiSelect';
import { buatOpsiWilayahIspa } from '@/lib/karhutla/constants';
import type { WilayahIspaRow } from '@/lib/supabase/queries-karhutla-server';

export interface StateFilterPeriode {
  granularitas: 'mingguan' | 'bulanan' | 'skdr';
  tahun: number;
  periodeAwal: number;
  periodeAkhir: number;
  wilayahKeys: string[]; // dipakai granularitas 'mingguan'/'bulanan' (sumber: modul karhutla)
  wilayahSkdr?: string; // dipakai granularitas 'skdr' (sumber: modul SKDR, taksonomi wilayah beda)
}

const NAMA_BULAN_LENGKAP = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function FilterRentangPeriodeKarhutla({
  nilai,
  onUbah,
  daftarWilayahIspa,
  daftarWilayahSkdr = [],
}: {
  nilai: StateFilterPeriode;
  onUbah: (nilaiBaru: StateFilterPeriode) => void;
  daftarWilayahIspa: WilayahIspaRow[];
  daftarWilayahSkdr?: string[];
}) {
  // 'skdr' pakai rentang minggu juga (skdr_mingguan memang per-minggu), sama seperti 'mingguan'
  const batasMaks = nilai.granularitas === 'bulanan' ? 12 : 53;
  const tahunSekarang = new Date().getFullYear();
  const opsiWilayah = buatOpsiWilayahIspa(daftarWilayahIspa);

  function ubahGranularitas(g: StateFilterPeriode['granularitas']) {
    const maks = g === 'bulanan' ? 12 : 53;
    onUbah({
      ...nilai,
      granularitas: g,
      periodeAwal: 1,
      periodeAkhir: maks,
    });
  }

  const opsiPeriode = Array.from({ length: batasMaks }, (_, i) => i + 1);
  const labelPeriode = nilai.granularitas === 'bulanan' ? 'Bulan' : 'Minggu';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => ubahGranularitas('mingguan')}
            className={`px-3 py-1.5 ${nilai.granularitas === 'mingguan' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Mingguan
          </button>
          <button
            type="button"
            onClick={() => ubahGranularitas('bulanan')}
            className={`px-3 py-1.5 border-l border-gray-300 ${nilai.granularitas === 'bulanan' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Bulanan
          </button>
          <button
            type="button"
            onClick={() => ubahGranularitas('skdr')}
            className={`px-3 py-1.5 border-l border-gray-300 ${nilai.granularitas === 'skdr' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
            title="Kasus ISPA-AA dari modul SKDR (data laporan mingguan puskesmas/wilker)"
          >
            SKDR
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Tahun</label>
          <input
            type="number"
            value={nilai.tahun}
            onChange={(e) => onUbah({ ...nilai, tahun: Number(e.target.value) || tahunSekarang })}
            className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Dari {labelPeriode}</label>
          <select
            value={nilai.periodeAwal}
            onChange={(e) => onUbah({ ...nilai, periodeAwal: Number(e.target.value) })}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {opsiPeriode.map((p) => (
              <option key={p} value={p}>
                {nilai.granularitas === 'bulanan' ? NAMA_BULAN_LENGKAP[p - 1] : `Mg ${p}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sampai</label>
          <select
            value={nilai.periodeAkhir}
            onChange={(e) => onUbah({ ...nilai, periodeAkhir: Number(e.target.value) })}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {opsiPeriode.map((p) => (
              <option key={p} value={p}>
                {nilai.granularitas === 'bulanan' ? NAMA_BULAN_LENGKAP[p - 1] : `Mg ${p}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Wilayah</label>
          {nilai.granularitas === 'skdr' ? (
            <select
              value={nilai.wilayahSkdr ?? ''}
              onChange={(e) => onUbah({ ...nilai, wilayahSkdr: e.target.value || undefined })}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm min-w-40"
            >
              <option value="">Semua Wilayah</option>
              {daftarWilayahSkdr.map((w) => (
                <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>
              ))}
            </select>
          ) : (
            <PilihWilayahMultiSelect
              opsi={opsiWilayah}
              nilai={nilai.wilayahKeys}
              onUbah={(wilayahKeys) => onUbah({ ...nilai, wilayahKeys })}
            />
          )}
        </div>
      </div>

      {nilai.granularitas === 'skdr' && (
        <p className="text-xs text-gray-400">
          Sumber kasus ISPA: laporan mingguan SKDR (ISPA-AA) -- beda taksonomi wilayah dari modul karhutla.
        </p>
      )}

      {nilai.periodeAwal > nilai.periodeAkhir && (
        <p className="text-xs text-red-600">
          Periode awal tidak boleh lebih besar dari periode akhir.
        </p>
      )}
    </div>
  );
}