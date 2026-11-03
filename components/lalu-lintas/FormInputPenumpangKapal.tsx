'use client';

// Form input SATU kedatangan ATAU SATU keberangkatan kapal (jenis ditentukan tab di halaman).
// Kapal dipilih dari daftar per pelabuhan; kapal baru bisa ditambah langsung dari form ini.

import { useMemo, useRef, useState } from 'react';
import {
  simpanInputPenumpangKapal,
  type HasilSimpanPenumpangKapal,
} from '@/app/(dashboard)/lalu-lintas-orang/input-penumpang-kapal/actions';
import { aksiTambahKapal } from '@/app/actions/kapal';
import type { Kapal } from '@/lib/db/modul/kapal';

interface Props {
  jenis: 'datang' | 'berangkat';
  wilker: { kode: string; nama: string }[];
  daftarKapal: Kapal[]; // satu kapal bisa muncul di beberapa pelabuhan
  hariIni: string; // YYYY-MM-DD menurut zona waktu kantor (dihitung di server)
}

const kotak = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

export default function FormInputPenumpangKapal({ jenis, wilker, daftarKapal, hariIni }: Props) {
  const [kodeWilker, setKodeWilker] = useState(wilker[0]?.kode ?? '');
  const [semuaKapal, setSemuaKapal] = useState<Kapal[]>(daftarKapal);
  const [kapalId, setKapalId] = useState('');
  const [formKapalBaru, setFormKapalBaru] = useState(false);
  const [namaBaru, setNamaBaru] = useState('');
  const [menambah, setMenambah] = useState(false);
  const [pesanKapal, setPesanKapal] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpanPenumpangKapal | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const kapalPelabuhan = useMemo(
    () => semuaKapal.filter((k) => k.wilker === kodeWilker).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [semuaKapal, kodeWilker],
  );
  const kapalTerpilih = kapalPelabuhan.find((k) => k.id === kapalId);

  const datang = jenis === 'datang';
  const namaKolom = datang ? 'tanggal_tiba' : 'tanggal_berangkat';

  async function tambahKapalBaru() {
    setPesanKapal(null);
    setMenambah(true);
    const res = await aksiTambahKapal(namaBaru, kodeWilker);
    setMenambah(false);
    if (!res.ok) {
      setPesanKapal(res.error);
      return;
    }
    setSemuaKapal((prev) =>
      prev.some((k) => k.id === res.kapal.id && k.wilker === res.kapal.wilker) ? prev : [...prev, res.kapal],
    );
    setKapalId(res.kapal.id);
    setNamaBaru('');
    setFormKapalBaru(false);
  }

  async function tanganiSubmit(formData: FormData) {
    setMenyimpan(true);
    setHasil(null);
    const res = await simpanInputPenumpangKapal(formData);
    setHasil(res);
    setMenyimpan(false);
    if (res.sukses) {
      // Kosongkan isian kapal & angka; pertahankan wilayah kerja dan tanggal (input berurutan biasanya sama).
      const tgl = (formData.get(namaKolom) as string) || hariIni;
      formRef.current?.reset();
      const el = formRef.current?.elements.namedItem(namaKolom) as HTMLInputElement | null;
      if (el) el.value = tgl;
      setKapalId('');
    }
  }

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold text-[#0F2A38]">
        {datang ? 'Input Kedatangan Kapal' : 'Input Keberangkatan Kapal'}
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Satu isian untuk satu kapal. Jumlah yang dikosongkan dianggap 0.
      </p>

      <form ref={formRef} action={tanganiSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input type="hidden" name="jenis" value={jenis} />
        <input type="hidden" name="kapal_id" value={kapalId} />
        <input type="hidden" name="nama_kapal" value={kapalTerpilih?.nama ?? ''} />

        <div>
          <label className={label} htmlFor="kode_wilker">Wilayah Kerja *</label>
          <select
            id="kode_wilker"
            name="kode_wilker"
            required
            value={kodeWilker}
            onChange={(e) => {
              setKodeWilker(e.target.value);
              setKapalId('');
              setFormKapalBaru(false);
              setPesanKapal(null);
            }}
            className={kotak}
          >
            {wilker.map((w) => (
              <option key={w.kode} value={w.kode}>{w.nama}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="pilih_kapal">Nama Kapal *</label>
          <select
            id="pilih_kapal"
            required
            value={kapalId}
            onChange={(e) => setKapalId(e.target.value)}
            className={kotak}
          >
            <option value="" disabled>
              {kapalPelabuhan.length ? '— Pilih kapal —' : 'Belum ada kapal di pelabuhan ini'}
            </option>
            {kapalPelabuhan.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { setFormKapalBaru((v) => !v); setPesanKapal(null); }}
            className="mt-1 text-xs font-medium text-[#0F4C5C] underline"
          >
            {formKapalBaru ? 'Batal tambah kapal' : '+ Kapal baru'}
          </button>
        </div>

        {formKapalBaru && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 sm:col-span-2">
            <label className={label} htmlFor="nama_kapal_baru">
              Nama kapal baru untuk {wilker.find((w) => w.kode === kodeWilker)?.nama}
            </label>
            <div className="flex gap-2">
              <input
                id="nama_kapal_baru"
                type="text"
                value={namaBaru}
                maxLength={100}
                onChange={(e) => setNamaBaru(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (namaBaru.trim() && !menambah) void tambahKapalBaru();
                  }
                }}
                className={kotak}
              />
              <button
                type="button"
                disabled={menambah || namaBaru.trim().length < 2}
                onClick={() => void tambahKapalBaru()}
                className="shrink-0 rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {menambah ? 'Menambah...' : 'Tambah'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Bila nama kapal sudah ada di pelabuhan lain, kapal yang sama dipakai dan ditautkan ke pelabuhan ini.
            </p>
            {pesanKapal && <p className="mt-1 text-xs text-red-600">{pesanKapal}</p>}
          </div>
        )}

        <div>
          <label className={label} htmlFor={namaKolom}>{datang ? 'Tanggal Tiba *' : 'Tanggal Berangkat *'}</label>
          <input id={namaKolom} type="date" name={namaKolom} required defaultValue={hariIni} className={kotak} />
        </div>

        <div className="hidden sm:block" aria-hidden="true" />

        <div>
          <label className={label} htmlFor="jml_abk">{datang ? 'ABK Datang' : 'ABK Berangkat'}</label>
          <input
            id="jml_abk"
            type="number"
            name={datang ? 'abk_datang' : 'abk_berangkat'}
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            className={kotak}
          />
        </div>

        <div>
          <label className={label} htmlFor="jml_penumpang">{datang ? 'Penumpang Datang' : 'Penumpang Berangkat'}</label>
          <input
            id="jml_penumpang"
            type="number"
            name={datang ? 'penumpang_datang' : 'penumpang_berangkat'}
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            className={kotak}
          />
        </div>

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
            disabled={menyimpan || !kapalId}
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