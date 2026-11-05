'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { simpanInputEmerging, type HasilSimpanEmerging } from '../input/actions';
import { hapusDataEmerging } from './actions';

interface Props {
  penyakit: string;
  tahun: number;
  minggu: number;
  daftarPropinsi: string[];
  tersimpan: Record<string, { kasus: number; kematian: number }>;
}

const kotak = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';

export default function FormEditEmerging({ penyakit, tahun, minggu, daftarPropinsi, tersimpan }: Props) {
  const router = useRouter();
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpanEmerging | null>(null);
  const [galatHapus, setGalatHapus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const jumlahTersimpan = Object.keys(tersimpan).length;

  async function kirim(formData: FormData) {
    setMenyimpan(true);
    setHasil(null);
    const res = await simpanInputEmerging(formData);
    setHasil(res);
    setMenyimpan(false);
    if (res.sukses) router.refresh();
  }

  function hapus(propinsi: string) {
    if (!window.confirm(`Hapus data ${propinsi} (${penyakit}, minggu ${minggu} tahun ${tahun})?`)) return;
    setGalatHapus(null);
    startTransition(async () => {
      const res = await hapusDataEmerging(penyakit, propinsi, tahun, minggu);
      if (!res.ok) setGalatHapus(res.error);
      else router.refresh();
    });
  }

  return (
    <form action={kirim} className="space-y-4 rounded-[10px] bg-white p-6 shadow-sm">
      <input type="hidden" name="penyakit" value={penyakit} />
      <input type="hidden" name="tahun" value={tahun} />
      <input type="hidden" name="minggu" value={minggu} />

      <div>
        <h2 className="text-base font-bold text-[#0F2A38]">
          {penyakit}, minggu {minggu} tahun {tahun}
        </h2>
        <p className="text-xs text-gray-500">
          {jumlahTersimpan > 0
            ? `${jumlahTersimpan} provinsi sudah punya data. Ubah angkanya lalu simpan, atau hapus per provinsi.`
            : 'Belum ada data untuk pilihan ini. Mengisi angka di bawah akan membuat data baru.'}
        </p>
      </div>

      <div className="max-h-112 overflow-y-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Provinsi</th>
              <th className="w-28 px-3 py-2">Kasus</th>
              <th className="w-28 px-3 py-2">Kematian</th>
              <th className="w-16 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {daftarPropinsi.map((p) => {
              const ada = tersimpan[p];
              return (
                <tr key={p} className={`border-t border-gray-100 ${ada ? 'bg-teal-50/40' : ''}`}>
                  <td className="px-3 py-1.5">{p}</td>
                  <td className="px-3 py-1.5">
                    <input type="number" name={`kasus__${p}`} min={0} step={1} inputMode="numeric"
                      defaultValue={ada?.kasus ?? ''} className={kotak} />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" name={`mati__${p}`} min={0} step={1} inputMode="numeric"
                      defaultValue={ada?.kematian ?? ''} className={kotak} />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {ada && (
                      <button type="button" onClick={() => hapus(p)} disabled={isPending}
                        className="text-xs text-red-600 underline disabled:opacity-50">
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="submit" disabled={menyimpan}
        className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
        {menyimpan ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>

      {galatHapus && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{galatHapus}</div>}
      {hasil && (
        <div role="status"
          className={`rounded-lg p-3 text-sm ${hasil.sukses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {hasil.sukses ? hasil.pesan : hasil.error}
        </div>
      )}
    </form>
  );
}