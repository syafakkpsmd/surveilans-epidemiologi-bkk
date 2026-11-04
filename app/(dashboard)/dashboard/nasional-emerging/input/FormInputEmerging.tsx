'use client';

import { useState } from 'react';
import { simpanInputEmerging, aksiTambahPenyakit, type HasilSimpanEmerging } from './actions';

interface Props {
  daftarPenyakit: string[];
  daftarPropinsi: string[];
  tahunAwal: number;
  mingguAwal: number;
}

const kotak = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

export default function FormInputEmerging({ daftarPenyakit, daftarPropinsi, tahunAwal, mingguAwal }: Props) {
  const [penyakitList, setPenyakitList] = useState<string[]>(daftarPenyakit);
  const [penyakit, setPenyakit] = useState(daftarPenyakit[0] ?? '');
  const [formBaru, setFormBaru] = useState(false);
  const [namaBaru, setNamaBaru] = useState('');
  const [menambah, setMenambah] = useState(false);
  const [pesanTambah, setPesanTambah] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpanEmerging | null>(null);
  const [versi, setVersi] = useState(0);

  async function tambahPenyakitBaru() {
    setPesanTambah(null);
    setMenambah(true);
    const res = await aksiTambahPenyakit(namaBaru);
    setMenambah(false);
    if (!res.ok) {
      setPesanTambah(res.error);
      return;
    }
    setPenyakitList((prev) => (prev.includes(res.nama) ? prev : [...prev, res.nama]));
    setPenyakit(res.nama);
    setNamaBaru('');
    setFormBaru(false);
  }

  async function kirim(formData: FormData) {
    setMenyimpan(true);
    setHasil(null);
    const res = await simpanInputEmerging(formData);
    setHasil(res);
    setMenyimpan(false);
    if (res.sukses) setVersi((v) => v + 1);
  }

  return (
    <form action={kirim} className="space-y-4 rounded-[10px] bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="penyakit">Penyakit *</label>
          <select
            id="penyakit"
            name="penyakit"
            required
            value={penyakit}
            onChange={(e) => setPenyakit(e.target.value)}
            className={kotak}
          >
            {penyakitList.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button
            type="button"
            onClick={() => { setFormBaru((v) => !v); setPesanTambah(null); }}
            className="mt-1 text-xs font-medium text-[#0F4C5C] underline"
          >
            {formBaru ? 'Batal tambah penyakit' : '+ Penyakit baru'}
          </button>
        </div>
        <div>
          <label className={label} htmlFor="tahun">Tahun epidemiologi *</label>
          <input id="tahun" name="tahun" type="number" required min={2020} max={2100} defaultValue={tahunAwal} className={kotak} />
        </div>
        <div>
          <label className={label} htmlFor="minggu">Minggu epidemiologi (1-53) *</label>
          <input id="minggu" name="minggu" type="number" required min={1} max={53} defaultValue={mingguAwal} className={kotak} />
        </div>
      </div>

      {formBaru && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
          <label className={label} htmlFor="nama_penyakit_baru">Nama penyakit baru</label>
          <div className="flex gap-2">
            <input
              id="nama_penyakit_baru"
              type="text"
              value={namaBaru}
              maxLength={100}
              onChange={(e) => setNamaBaru(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (namaBaru.trim().length >= 3 && !menambah) void tambahPenyakitBaru();
                }
              }}
              className={kotak}
            />
            <button
              type="button"
              disabled={menambah || namaBaru.trim().length < 3}
              onClick={() => void tambahPenyakitBaru()}
              className="shrink-0 rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {menambah ? 'Menambah...' : 'Tambah'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Penyakit baru langsung muncul di dashboard dan peta setelah datanya diinput.
          </p>
          {pesanTambah && <p className="mt-1 text-xs text-red-600">{pesanTambah}</p>}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Isi hanya provinsi yang melapor. Baris yang dikosongkan tidak diubah. Menyimpan minggu yang sama lagi
        menimpa nilai lama.
      </p>

      <div key={versi} className="max-h-112 overflow-y-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Provinsi</th>
              <th className="w-32 px-3 py-2">Kasus</th>
              <th className="w-32 px-3 py-2">Kematian</th>
            </tr>
          </thead>
          <tbody>
            {daftarPropinsi.map((p) => (
              <tr key={p} className="border-t border-gray-100">
                <td className="px-3 py-1.5">{p}</td>
                <td className="px-3 py-1.5">
                  <input type="number" name={`kasus__${p}`} min={0} step={1} inputMode="numeric" className={kotak} />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" name={`mati__${p}`} min={0} step={1} inputMode="numeric" className={kotak} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="submit"
        disabled={menyimpan}
        className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {menyimpan ? 'Menyimpan...' : 'Simpan Data'}
      </button>

      {hasil && (
        <div
          role="status"
          className={`rounded-lg p-3 text-sm ${hasil.sukses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
        >
          {hasil.sukses ? hasil.pesan : hasil.error}
        </div>
      )}
    </form>
  );
}