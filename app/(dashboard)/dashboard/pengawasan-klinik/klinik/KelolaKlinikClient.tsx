/// app/(dashboard)/dashboard/pengawasan-klinik/klinik/KelolaKlinikClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { tambahKlinikBaru, updateKlinik, hapusKlinik } from './actions';


type Klinik = {
  id: string;
  nama_klinik: string;
  alamat_klinik: string | null;
  jenis_fasilitas: string | null;
  kabupaten_kota: string | null;
  telepon: string | null;
  pemilik_pimpinan: string | null;
  penanggung_jawab: string | null;
  latitude: number | null;
  longitude: number | null;
  spreadsheet_id: string | null;
};

export default function KelolaKlinikClient({ daftarKlinik }: { daftarKlinik: Klinik[] }) {
  const [formTerbuka, setFormTerbuka] = useState<'tambah' | string | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const klinikSedangDiedit = daftarKlinik.find((k) => k.id === formTerbuka) ?? null;

  const perKabupaten = daftarKlinik.reduce<Record<string, Klinik[]>>((acc, k) => {
    const key = k.kabupaten_kota ?? 'Belum Dikategorikan';
    (acc[key] ??= []).push(k);
    return acc;
  }, {});

  function bukaFormTambah() {
    setFormTerbuka('tambah');
    setLat('');
    setLng('');
  }

  function bukaFormEdit(k: Klinik) {
    setFormTerbuka(k.id);
    setLat(k.latitude != null ? String(k.latitude) : '');
    setLng(k.longitude != null ? String(k.longitude) : '');
  }

  function handleGpsSekarang() {
    if (!navigator.geolocation) {
      alert('Perangkat tidak mendukung GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => alert('Gagal mengambil lokasi. Pastikan izin GPS diizinkan.')
    );
  }

  async function handleSimpan(formData: FormData) {
    const hasil =
      formTerbuka === 'tambah'
        ? await tambahKlinikBaru(formData)
        : await updateKlinik(formTerbuka as string, formData);

    if (hasil.error) alert(hasil.error);
    else setFormTerbuka(null);
  }

  async function handleHapus(id: string, nama: string) {
    if (!confirm(`Hapus "${nama}" dari daftar klinik binaan?`)) return;
    const hasil = await hapusKlinik(id);
    if (hasil.error) alert(hasil.error);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Link href="/dashboard/pengawasan-klinik" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={16} />
        Kembali ke Dashboard Pengawasan Klinik
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Master Klinik Binaan</h1>
        <button onClick={bukaFormTambah} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
          + Tambah Klinik
        </button>
      </div>

      {formTerbuka && (
        <form action={handleSimpan} className="border rounded-lg p-4 space-y-3 max-w-lg">
          <p className="font-medium text-sm">
            {formTerbuka === 'tambah' ? 'Tambah Klinik Baru' : `Edit: ${klinikSedangDiedit?.nama_klinik}`}
          </p>

          <input
            name="nama_klinik"
            placeholder="Nama Klinik"
            required
            defaultValue={klinikSedangDiedit?.nama_klinik ?? ''}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            name="alamat_klinik"
            placeholder="Alamat"
            defaultValue={klinikSedangDiedit?.alamat_klinik ?? ''}
            className="border rounded px-3 py-2 w-full"
          />
          <select
            name="jenis_fasilitas"
            defaultValue={klinikSedangDiedit?.jenis_fasilitas ?? 'Klinik'}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="Klinik">Klinik</option>
            <option value="Rumah Sakit">Rumah Sakit</option>
          </select>
          <select
            name="kabupaten_kota"
            defaultValue={klinikSedangDiedit?.kabupaten_kota ?? 'Samarinda'}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="Samarinda">Samarinda</option>
            <option value="Bontang">Bontang</option>
            <option value="Kutai Timur">Kutai Timur</option>
            <option value="Kutai Barat">Kutai Barat</option>
            <option value="Kutai Kartanegara">Kutai Kartanegara</option>
          </select>
          <input
            name="telepon"
            placeholder="No. Telepon"
            defaultValue={klinikSedangDiedit?.telepon ?? ''}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            name="pemilik_pimpinan"
            placeholder="Pemilik/Pimpinan"
            defaultValue={klinikSedangDiedit?.pemilik_pimpinan ?? ''}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            name="penanggung_jawab"
            placeholder="Penanggung Jawab"
            defaultValue={klinikSedangDiedit?.penanggung_jawab ?? ''}
            className="border rounded px-3 py-2 w-full"
          />

                    <input
            name="penanggung_jawab"
            placeholder="Penanggung Jawab"
            defaultValue={klinikSedangDiedit?.penanggung_jawab ?? ''}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            name="spreadsheet_id"
            placeholder="ID Google Spreadsheet (dari URL sheet)"
            defaultValue={klinikSedangDiedit?.spreadsheet_id ?? ''}
            className="border rounded px-3 py-2 w-full font-mono text-xs"
          />

          <div className="flex gap-2">
            <input
              name="latitude"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
            <input
              name="longitude"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
          <button type="button" onClick={handleGpsSekarang} className="border px-3 py-2 rounded text-sm">
            📍 Gunakan Lokasi Saat Ini
          </button>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm">
              Simpan
            </button>
            <button type="button" onClick={() => setFormTerbuka(null)} className="border px-4 py-2 rounded text-sm">
              Batal
            </button>
          </div>
        </form>
      )}

      {Object.entries(perKabupaten).map(([kabupaten, klinikList]) => (
        <div key={kabupaten}>
          <h2 className="font-medium text-gray-600 mb-2">{kabupaten} ({klinikList.length})</h2>
          <div className="border rounded-lg divide-y">
            {klinikList.map((k) => {
              const dataBelumLengkap = !k.pemilik_pimpinan || !k.penanggung_jawab || !k.latitude;
              const belumAdaSheet = !k.spreadsheet_id;
              return (
                <div key={k.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                                        <p className="font-medium">
                      {k.nama_klinik}
                      {dataBelumLengkap && (
                        <span className="ml-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                          Data belum lengkap
                        </span>
                      )}
                      {belumAdaSheet && (
                        <span className="ml-2 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          Belum ada Sheet
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{k.alamat_klinik} · {k.telepon}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => bukaFormEdit(k)} className="text-blue-600 text-xs underline">Edit</button>
                    <button onClick={() => handleHapus(k.id, k.nama_klinik)} className="text-red-600 text-xs underline">Hapus</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}