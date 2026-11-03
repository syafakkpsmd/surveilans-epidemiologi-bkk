'use client';

// components/input-data/FormPesawat.tsx
// Input satu penerbangan. Kolom diambil dari KOLOM_PESAWAT supaya sama persis dengan template Excel.

import { useRef, useState } from 'react';
import { simpanPesawatSatuan, type HasilSimpanPesawat } from '@/app/(dashboard)/dashboard/input-data/pesawat/actions';

interface Props {
  hariIni: string; // YYYY-MM-DD zona waktu kantor
}

const kotak = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

function Angka({ nama, judul }: { nama: string; judul: string }) {
  return (
    <div>
      <label className={label} htmlFor={nama}>{judul}</label>
      <input id={nama} name={nama} type="number" min={0} step={1} inputMode="numeric" placeholder="0" className={kotak} />
    </div>
  );
}

const SERTIFIKAT: { kode: string; nama: string }[] = [
  { kode: 'sklt', nama: 'SKLT' },
  { kode: 'td_laik', nama: 'TD Laik' },
  { kode: 'iaos', nama: 'IAOS' },
  { kode: 'jenazah', nama: 'Jenazah' },
  { kode: 'kier', nama: 'KIER' },
];

export default function FormPesawat({ hariIni }: Props) {
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpanPesawat | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function tanganiSubmit(formData: FormData) {
    setMenyimpan(true);
    setHasil(null);
    const res = await simpanPesawatSatuan(formData);
    setHasil(res);
    setMenyimpan(false);
    if (res.sukses) {
      // Kosongkan isian tetapi pertahankan tanggal: input berurutan biasanya untuk hari yang sama.
      const tgl = (formData.get('tanggal') as string) || hariIni;
      formRef.current?.reset();
      const el = formRef.current?.elements.namedItem('tanggal') as HTMLInputElement | null;
      if (el) el.value = tgl;
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Satu pengisian = satu baris data pesawat. Jumlah yang dikosongkan dianggap 0. Tanggal setelah hari ini
        tersimpan sebagai <b>Rencana</b> dan baru dihitung dalam statistik setelah tanggalnya tiba.
      </p>

      <form ref={formRef} action={tanganiSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="tanggal">Tanggal *</label>
            <input id="tanggal" name="tanggal" type="date" required defaultValue={hariIni} className={kotak} />
          </div>
          <div>
            <label className={label} htmlFor="maskapai">Maskapai *</label>
            <input id="maskapai" name="maskapai" type="text" required maxLength={255} className={kotak} />
          </div>
        </div>

        <fieldset className="rounded-lg border border-gray-100 p-4">
          <legend className="px-2 text-sm font-bold text-[#0F2A38]">Keberangkatan</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="keberangkatan">Kota Tujuan</label>
              <input id="keberangkatan" name="keberangkatan" type="text" maxLength={255} className={kotak} />
            </div>
            <Angka nama="crew_berangkat" judul="Crew Berangkat" />
            <Angka nama="penumpang_berangkat" judul="Penumpang Berangkat" />
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-gray-100 p-4">
          <legend className="px-2 text-sm font-bold text-[#0F2A38]">Kedatangan</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="kedatangan">Kota Asal</label>
              <input id="kedatangan" name="kedatangan" type="text" maxLength={255} className={kotak} />
            </div>
            <Angka nama="crew_datang" judul="Crew Datang" />
            <Angka nama="penumpang_datang" judul="Penumpang Datang" />
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-gray-100 p-4">
          <legend className="px-2 text-sm font-bold text-[#0F2A38]">Sertifikat (jumlah orang)</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {SERTIFIKAT.map((s) => (
              <div key={s.kode} className="space-y-2">
                <p className="text-xs font-bold text-gray-700">{s.nama}</p>
                <Angka nama={`${s.kode}_male`} judul="Laki-laki" />
                <Angka nama={`${s.kode}_female`} judul="Perempuan" />
              </div>
            ))}
          </div>
        </fieldset>

        {hasil && !hasil.sukses && hasil.perluKonfirmasi && (
          <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <input type="checkbox" name="izinkan_duplikat" value="1" className="mt-0.5" />
            <span>Simpan tetap (ini penerbangan terpisah dengan isian yang sama).</span>
          </label>
        )}

        <button
          type="submit"
          disabled={menyimpan}
          className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {menyimpan ? 'Menyimpan...' : 'Simpan Data Pesawat'}
        </button>
      </form>

      {hasil && (
        <div
          role="status"
          className={`mt-4 rounded-lg p-3 text-sm ${
            hasil.sukses ? 'bg-green-50 text-green-700' : hasil.perluKonfirmasi ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {hasil.sukses ? hasil.pesan : hasil.error}
        </div>
      )}
    </div>
  );
}
