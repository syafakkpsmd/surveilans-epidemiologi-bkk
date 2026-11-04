'use client';

import { useRef, useState } from 'react';
import IcdSearch, { type IcdValue } from '@/components/IcdSearch';
import type { BarisKunjungan } from '@/lib/db/modul/poliklinikNonBkk';

export type HasilKunjungan = { sukses: true; pesan: string } | { sukses: false; error: string };

interface Props {
  poliklinikId: string | null; // null = layanan BKK
  wilkerOpsi?: string[]; // diisi untuk layanan BKK
  hariIni: string;
  baris: BarisKunjungan[];
  kategoriOpsi: string[];
  onSimpan: (formData: FormData) => Promise<HasilKunjungan>;
  onHapus: (id: string) => Promise<HasilKunjungan>;
  judulDaftar?: string;
}

const kotak = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

export default function KegiatanPoliklinik({
  poliklinikId, wilkerOpsi, hariIni, baris, kategoriOpsi, onSimpan, onHapus, judulDaftar = '50 Kunjungan Terakhir',
}: Props) {
  const [edit, setEdit] = useState<BarisKunjungan | null>(null);
  const [icd, setIcd] = useState<IcdValue | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasil, setHasil] = useState<HasilKunjungan | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function mulaiEdit(b: BarisKunjungan) {
    setEdit(b);
    setIcd(b.kode_diagnosa ? { kode: b.kode_diagnosa, nama: b.diagnosa ?? '' } : null);
    setHasil(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function batalEdit() {
    setEdit(null);
    setIcd(null);
  }

  async function kirim(formData: FormData) {
    setMenyimpan(true);
    setHasil(null);
    const res = await onSimpan(formData);
    setHasil(res);
    setMenyimpan(false);
    if (res.sukses) {
      const tgl = (formData.get('tanggal_pemeriksaan') as string) || hariIni;
      const kat = (formData.get('kategori_pasien') as string) || '';
      const wk = (formData.get('wilayah_kerja') as string) || '';
      setIcd(null);
      if (edit) {
        setEdit(null);
      } else {
        // input berurutan: pertahankan tanggal, kategori, dan wilayah kerja
        formRef.current?.reset();
        const set = (nama: string, nilai: string) => {
          const el = formRef.current?.elements.namedItem(nama) as HTMLInputElement | null;
          if (el) el.value = nilai;
        };
        set('tanggal_pemeriksaan', tgl);
        set('kategori_pasien', kat);
        if (wk) set('wilayah_kerja', wk);
      }
    }
  }

  async function hapus(b: BarisKunjungan) {
    if (!window.confirm(`Hapus kunjungan ${b.nama ?? ''} (${b.tanggal_pemeriksaan})?`)) return;
    const res = await onHapus(b.id);
    setHasil(res);
    if (edit?.id === b.id) batalEdit();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[10px] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-[#0F2A38]">{edit ? 'Edit Kunjungan' : 'Tambah Kunjungan'}</h2>

        <form key={edit?.id ?? 'baru'} ref={formRef} action={kirim} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {poliklinikId && <input type="hidden" name="poliklinik_id" value={poliklinikId} />}
          <input type="hidden" name="id" value={edit?.id ?? ''} />
          <input type="hidden" name="kode_diagnosa" value={icd?.kode ?? ''} />

          {wilkerOpsi && (
            <div className="sm:col-span-2">
              <label className={label} htmlFor="wilayah_kerja">Wilayah kerja *</label>
              <select id="wilayah_kerja" name="wilayah_kerja" required defaultValue={edit?.wilayah_kerja ?? ''} className={kotak}>
                <option value="" disabled>Pilih wilayah kerja</option>
                {wilkerOpsi.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={label} htmlFor="tanggal_pemeriksaan">Tanggal pemeriksaan *</label>
            <input id="tanggal_pemeriksaan" name="tanggal_pemeriksaan" type="date" required max={hariIni}
              defaultValue={edit?.tanggal_pemeriksaan ?? hariIni} className={kotak} />
          </div>

          <div>
            <label className={label} htmlFor="nama">Nama pasien *</label>
            <input id="nama" name="nama" required maxLength={150} defaultValue={edit?.nama ?? ''} className={kotak} />
          </div>

          <div>
            <label className={label} htmlFor="jenis_kelamin">Jenis kelamin *</label>
            <select id="jenis_kelamin" name="jenis_kelamin" required defaultValue={edit?.jenis_kelamin ?? ''} className={kotak}>
              <option value="" disabled>Pilih</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          <div>
            <label className={label} htmlFor="usia">Usia (tahun)</label>
            <input id="usia" name="usia" type="number" min={0} max={120} step={1} inputMode="numeric"
              defaultValue={edit?.usia ?? ''} className={kotak} />
          </div>

          <div className="sm:col-span-2">
            <label className={label} htmlFor="kategori_pasien">Kategori pasien</label>
            <input id="kategori_pasien" name="kategori_pasien" list="opsi-kategori" maxLength={100}
              defaultValue={edit?.kategori_pasien ?? ''} className={kotak} />
            <datalist id="opsi-kategori">
              {kategoriOpsi.map((k) => <option key={k} value={k} />)}
            </datalist>
          </div>

          <div className="sm:col-span-2">
            <IcdSearch label="Diagnosa (ICD-10)" value={icd} onChange={setIcd} required />
          </div>

          <div className="sm:col-span-2">
            <label className={label} htmlFor="keterangan">Keterangan</label>
            <textarea id="keterangan" name="keterangan" rows={2} maxLength={2000}
              defaultValue={edit?.keterangan ?? ''} className={kotak} />
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={menyimpan || !icd}
              className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {menyimpan ? 'Menyimpan...' : edit ? 'Simpan Perubahan' : 'Simpan Kunjungan'}
            </button>
            {edit && (
              <button type="button" onClick={batalEdit}
                className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                Batal
              </button>
            )}
          </div>
        </form>

        {hasil && (
          <div role="status"
            className={`mt-4 rounded-lg p-3 text-sm ${hasil.sukses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {hasil.sukses ? hasil.pesan : hasil.error}
          </div>
        )}
      </div>

      <div className="rounded-[10px] bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-[#0F2A38]">{judulDaftar}</h2>
        {baris.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Tanggal</th>
                  {wilkerOpsi && <th className="py-2 pr-3">Wilker</th>}
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">L/P</th>
                  <th className="py-2 pr-3">Usia</th>
                  <th className="py-2 pr-3">Diagnosa</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="whitespace-nowrap py-2 pr-3">{b.tanggal_pemeriksaan}</td>
                    {wilkerOpsi && <td className="py-2 pr-3">{b.wilayah_kerja}</td>}
                    <td className="py-2 pr-3">{b.nama}</td>
                    <td className="py-2 pr-3">{b.jenis_kelamin?.startsWith('L') ? 'L' : 'P'}</td>
                    <td className="py-2 pr-3">{b.usia ?? '-'}</td>
                    <td className="py-2 pr-3">
                      <span className="font-mono text-xs text-emerald-800">{b.kode_diagnosa}</span> {b.diagnosa}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right">
                      <button onClick={() => mulaiEdit(b)} className="mr-3 text-xs text-[#0F4C5C] underline">Edit</button>
                      <button onClick={() => void hapus(b)} className="text-xs text-red-600 underline">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}