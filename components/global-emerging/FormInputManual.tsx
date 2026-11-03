'use client';

// components/global-emerging/FormInputManual.tsx
// Form input manual SATU baris data penyakit -- untuk 10 penyakit yang
// belum ada sumber otomatis (atau koreksi data Covid-19/Mpox).

import { useState, useRef } from 'react';
import { simpanInputManual, type HasilSimpan } from '@/app/(dashboard)/dashboard/global-emerging/actions';
import { DAFTAR_PENYAKIT, DAFTAR_NEGARA, type JenisPeriode } from '@/types/global-emerging.types';

export default function FormInputManual() {
  const [jenisPeriode, setJenisPeriode] = useState<JenisPeriode>('mingguan');
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpan | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function tanganiSubmit(formData: FormData) {
    setMenyimpan(true);
    setHasil(null);
    const res = await simpanInputManual(formData);
    setHasil(res);
    setMenyimpan(false);
    if (res.sukses) {
      formRef.current?.reset();
      setJenisPeriode('mingguan');
    }
  }

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold text-[#0F2A38]">Input Data Manual</h2>
      <p className="mb-4 text-sm text-gray-500">
        Untuk penyakit yang belum ada sumber otomatis (Hantavirus, Legionellosis, Infeksi Virus B,
        MERS-CoV, H5N1, Demam Lassa, CCHF, Meningitis, Oropouche, Listeriosis), atau koreksi data.
      </p>

      <form ref={formRef} action={tanganiSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Penyakit *</label>
          <select name="penyakit" required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Pilih penyakit</option>
            {DAFTAR_PENYAKIT.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Negara *</label>
          <select name="negara" required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Pilih negara</option>
            {DAFTAR_NEGARA.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Jenis Periode *</label>
          <select
            name="jenis_periode"
            required
            value={jenisPeriode}
            onChange={(e) => setJenisPeriode(e.target.value as JenisPeriode)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="mingguan">Mingguan</option>
            <option value="bulanan">Bulanan</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Tahun Epidemiologi *</label>
          <input
            type="number"
            name="tahun_epid"
            required
            defaultValue={new Date().getFullYear()}
            min={2000}
            max={2100}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        {jenisPeriode === 'mingguan' ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Minggu Epidemiologi (1-53) *</label>
            <input
              type="number"
              name="minggu_epid"
              required
              min={1}
              max={53}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Bulan (1-12) *</label>
            <input
              type="number"
              name="bulan"
              required
              min={1}
              max={12}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Jumlah Kasus *</label>
          <input
            type="number"
            name="jumlah_kasus"
            required
            min={0}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Jumlah Kematian</label>
          <input
            type="number"
            name="jumlah_kematian"
            min={0}
            defaultValue={0}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-600">Sumber</label>
          <input
            type="text"
            name="sumber"
            placeholder="mis. WHO DON 15 Juli 2026, atau nama Anda"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={menyimpan}
            className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {menyimpan ? 'Menyimpan...' : 'Simpan Data'}
          </button>
        </div>
      </form>

      {hasil && (
        <div
          className={`mt-4 rounded-lg p-3 text-sm ${
            hasil.sukses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {hasil.sukses ? 'Data berhasil disimpan.' : hasil.error}
        </div>
      )}
    </div>
  );
}
