'use client';

// components/lalu-lintas/FormInputPenumpangKapal.tsx
// Form input SATU kedatangan kapal: wilayah kerja, tanggal, nama kapal, jumlah ABK dan penumpang.

import { useRef, useState } from 'react';
import {
  simpanInputPenumpangKapal,
  type HasilSimpanPenumpangKapal,
} from '@/app/(dashboard)/lalu-lintas-orang/input-penumpang-kapal/actions';

interface Props {
  wilker: { kode: string; nama: string }[];
  hariIni: string; // YYYY-MM-DD menurut zona waktu kantor (dihitung di server)
}

const kotak = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

export default function FormInputPenumpangKapal({ wilker, hariIni }: Props) {
  const [kodeWilker, setKodeWilker] = useState(wilker[0]?.kode ?? '');
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpanPenumpangKapal | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function tanganiSubmit(formData: FormData) {
    setMenyimpan(true);
    setHasil(null);
    const res = await simpanInputPenumpangKapal(formData);
    setHasil(res);
    setMenyimpan(false);
    if (res.sukses) {
      // Kosongkan isian kapal, tetapi pertahankan wilayah kerja dan tanggal: input berurutan biasanya
      // untuk pelabuhan dan hari yang sama.
      const tgl = (formData.get('tanggal_tiba') as string) || hariIni;
      formRef.current?.reset();
      const el = formRef.current?.elements.namedItem('tanggal_tiba') as HTMLInputElement | null;
      if (el) el.value = tgl;
    }
  }

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold text-[#0F2A38]">Input Data Kapal</h2>
      <p className="mb-4 text-sm text-gray-500">
        Satu isian untuk satu kapal. Jumlah yang dikosongkan dianggap 0.
      </p>

      <form ref={formRef} action={tanganiSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="kode_wilker">Wilayah Kerja *</label>
          <select
            id="kode_wilker"
            name="kode_wilker"
            required
            value={kodeWilker}
            onChange={(e) => setKodeWilker(e.target.value)}
            className={kotak}
          >
            {wilker.map((w) => (
              <option key={w.kode} value={w.kode}>{w.nama}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="nama_kapal">Nama Kapal *</label>
          <input id="nama_kapal" type="text" name="nama_kapal" required maxLength={255} className={kotak} />
        </div>

        <div>
          <label className={label} htmlFor="tanggal_tiba">Tanggal Tiba *</label>
          <input id="tanggal_tiba" type="date" name="tanggal_tiba" required defaultValue={hariIni} className={kotak} />
        </div>

        <div>
          <label className={label} htmlFor="tanggal_berangkat">Tanggal Berangkat</label>
          <input id="tanggal_berangkat" type="date" name="tanggal_berangkat" className={kotak} />
        </div>

        <fieldset className="grid grid-cols-2 gap-4 sm:col-span-2">
          <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Datang</legend>
          <div>
            <label className={label} htmlFor="abk_datang">ABK Datang</label>
            <input id="abk_datang" type="number" name="abk_datang" min={0} step={1} inputMode="numeric" placeholder="0" className={kotak} />
          </div>
          <div>
            <label className={label} htmlFor="penumpang_datang">Penumpang Datang</label>
            <input id="penumpang_datang" type="number" name="penumpang_datang" min={0} step={1} inputMode="numeric" placeholder="0" className={kotak} />
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-4 sm:col-span-2">
          <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Berangkat</legend>
          <div>
            <label className={label} htmlFor="abk_berangkat">ABK Berangkat</label>
            <input id="abk_berangkat" type="number" name="abk_berangkat" min={0} step={1} inputMode="numeric" placeholder="0" className={kotak} />
          </div>
          <div>
            <label className={label} htmlFor="penumpang_berangkat">Penumpang Berangkat</label>
            <input id="penumpang_berangkat" type="number" name="penumpang_berangkat" min={0} step={1} inputMode="numeric" placeholder="0" className={kotak} />
          </div>
        </fieldset>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="siaos">No. SIAOS</label>
          <input id="siaos" type="text" name="siaos" maxLength={500} className={kotak} />
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="keterangan">Keterangan</label>
          <textarea id="keterangan" name="keterangan" rows={2} maxLength={2000} className={kotak} />
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
          role="status"
          className={`mt-4 rounded-lg p-3 text-sm ${hasil.sukses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
        >
          {hasil.sukses ? hasil.pesan : hasil.error}
        </div>
      )}
    </div>
  );
}
