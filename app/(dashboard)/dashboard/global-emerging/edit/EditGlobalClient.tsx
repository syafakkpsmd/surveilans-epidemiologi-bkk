'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { simpanEditGlobal, hapusDataGlobal, type HasilEdit } from './actions';
import type { BarisGlobal } from '@/lib/db/modul/globalEmergingEdit';

interface Props {
  baris: BarisGlobal[];
  daftarPenyakit: string[];
  daftarNegara: string[];
  idAwal?: string;
}

const kotak = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

export default function EditGlobalClient({ baris, daftarPenyakit, daftarNegara, idAwal }: Props) {
  const router = useRouter();
  const barisAwal = idAwal ? baris.find((b) => String(b.id) === idAwal) ?? null : null;
  const [edit, setEdit] = useState<BarisGlobal | null>(barisAwal);
  const [jenis, setJenis] = useState<'mingguan' | 'bulanan'>(barisAwal?.jenis_periode ?? 'mingguan');
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasil, setHasil] = useState<HasilEdit | null>(null);
  const [isPending, startTransition] = useTransition();

  function mulaiEdit(b: BarisGlobal) {
    setEdit(b);
    setJenis(b.jenis_periode);
    setHasil(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function kirim(formData: FormData) {
    setMenyimpan(true);
    setHasil(null);
    const res = await simpanEditGlobal(formData);
    setHasil(res);
    setMenyimpan(false);
    if (res.sukses) {
      setEdit(null);
      router.refresh();
    }
  }

  function hapus(b: BarisGlobal) {
    const periode = b.jenis_periode === 'mingguan' ? `minggu ${b.minggu_epid}` : `bulan ${b.bulan}`;
    if (!window.confirm(`Hapus ${b.penyakit} / ${b.negara} (${periode} ${b.tahun_epid})?`)) return;
    startTransition(async () => {
      const res = await hapusDataGlobal(String(b.id));
      setHasil(res);
      if (res.sukses) {
        if (edit?.id === b.id) setEdit(null);
        router.refresh();
      }
    });
  }

  // nilai lama yang tidak ada di daftar tetap ditampilkan agar tidak hilang saat edit
  const opsi = (daftar: string[], nilai?: string) => (nilai && !daftar.includes(nilai) ? [nilai, ...daftar] : daftar);

  return (
    <div className="space-y-6">
      {edit && (
        <form key={edit.id} action={kirim} className="grid grid-cols-1 gap-4 rounded-[10px] bg-white p-6 shadow-sm sm:grid-cols-2">
          <h2 className="text-base font-bold text-[#0F2A38] sm:col-span-2">Edit Data #{edit.id}</h2>
          <input type="hidden" name="id" value={edit.id} />

          <div>
            <label className={label} htmlFor="penyakit">Penyakit *</label>
            <select id="penyakit" name="penyakit" required defaultValue={edit.penyakit} className={kotak}>
              {opsi(daftarPenyakit, edit.penyakit).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="negara">Negara *</label>
            <select id="negara" name="negara" required defaultValue={edit.negara} className={kotak}>
              {opsi(daftarNegara, edit.negara).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="jenis_periode">Jenis periode *</label>
            <select id="jenis_periode" name="jenis_periode" required value={jenis}
              onChange={(e) => setJenis(e.target.value as 'mingguan' | 'bulanan')} className={kotak}>
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="tahun_epid">Tahun epidemiologi *</label>
            <input id="tahun_epid" name="tahun_epid" type="number" required min={2000} max={2100}
              defaultValue={edit.tahun_epid} className={kotak} />
          </div>
          {jenis === 'mingguan' ? (
            <div>
              <label className={label} htmlFor="minggu_epid">Minggu epidemiologi (1-53) *</label>
              <input id="minggu_epid" name="minggu_epid" type="number" required min={1} max={53}
                defaultValue={edit.minggu_epid || ''} className={kotak} />
            </div>
          ) : (
            <div>
              <label className={label} htmlFor="bulan">Bulan (1-12) *</label>
              <input id="bulan" name="bulan" type="number" required min={1} max={12}
                defaultValue={edit.bulan || ''} className={kotak} />
            </div>
          )}
          <div>
            <label className={label} htmlFor="jumlah_kasus">Jumlah kasus *</label>
            <input id="jumlah_kasus" name="jumlah_kasus" type="number" required min={0}
              defaultValue={edit.jumlah_kasus} className={kotak} />
          </div>
          <div>
            <label className={label} htmlFor="jumlah_kematian">Jumlah kematian</label>
            <input id="jumlah_kematian" name="jumlah_kematian" type="number" min={0}
              defaultValue={edit.jumlah_kematian} className={kotak} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="sumber">Sumber</label>
            <input id="sumber" name="sumber" maxLength={300} defaultValue={edit.sumber} className={kotak} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={menyimpan}
              className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {menyimpan ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button type="button" onClick={() => setEdit(null)}
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Batal
            </button>
          </div>
        </form>
      )}

      {hasil && (
        <div role="status"
          className={`rounded-lg p-3 text-sm ${hasil.sukses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {hasil.sukses ? hasil.pesan : hasil.error}
        </div>
      )}

      <div className="rounded-[10px] bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-[#0F2A38]">Data ({baris.length}{baris.length >= 100 ? '+' : ''})</h2>
        {baris.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada data untuk filter ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Penyakit</th>
                  <th className="py-2 pr-3">Negara</th>
                  <th className="py-2 pr-3">Periode</th>
                  <th className="py-2 pr-3 text-right">Kasus</th>
                  <th className="py-2 pr-3 text-right">Mati</th>
                  <th className="py-2 pr-3">Sumber</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.id} className={`border-t border-gray-100 ${edit?.id === b.id ? 'bg-amber-50' : ''}`}>
                    <td className="py-2 pr-3 font-medium">{b.penyakit}</td>
                    <td className="py-2 pr-3">{b.negara}</td>
                    <td className="whitespace-nowrap py-2 pr-3">
                      {b.jenis_periode === 'mingguan' ? `Mg ${b.minggu_epid}` : `Bln ${b.bulan}`} / {b.tahun_epid}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{b.jumlah_kasus}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{b.jumlah_kematian}</td>
                    <td className="max-w-48 truncate py-2 pr-3 text-xs text-gray-500" title={b.sumber}>{b.sumber}</td>
                    <td className="whitespace-nowrap py-2 text-right">
                      <button onClick={() => mulaiEdit(b)} className="mr-3 text-xs text-[#0F4C5C] underline">Edit</button>
                      <button onClick={() => hapus(b)} disabled={isPending}
                        className="text-xs text-red-600 underline disabled:opacity-50">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {baris.length >= 100 && (
          <p className="mt-2 text-xs text-gray-400">Menampilkan 100 data terbaru. Persempit dengan filter untuk melihat yang lain.</p>
        )}
      </div>
    </div>
  );
}