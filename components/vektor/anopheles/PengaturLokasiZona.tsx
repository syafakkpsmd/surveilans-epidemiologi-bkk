'use client';
// components/vektor/anopheles/PengaturLokasiZona.tsx
import { useState } from 'react';
import type { Zona } from '@/lib/vektor/anopheles/config';
import { gayaInput, gayaTombol } from '@/components/vektor/diare/umum';

export type LokasiItem = { id: number; nama: string; dipakai: number };
export type AksiLokasi = { tipe: 'tambah' | 'ubah' | 'hapus'; lama?: string; baru?: string };

const API = '/api/vektor/anopheles/lokasi';
const aksiKecil =
  'rounded px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

export default function PengaturLokasiZona({
  wilayah, wilayahNama, zona, daftar, onBerubah,
}: {
  wilayah: string;
  wilayahNama: string;
  zona: Zona;
  daftar: LokasiItem[];
  onBerubah: (a: AksiLokasi) => void;
}) {
  const [baru, setBaru] = useState('');
  const [edit, setEdit] = useState<{ id: number; nama: string } | null>(null);
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function panggil(url: string, metode: string, body?: unknown) {
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch(url, {
        method: metode,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGalat(j.error ?? 'Gagal menyimpan');
        return null;
      }
      return j;
    } catch {
      setGalat('Tidak bisa terhubung ke server');
      return null;
    } finally {
      setKirim(false);
    }
  }

  async function tambah() {
    const nama = baru.trim();
    if (!nama) return;
    const j = await panggil(API, 'POST', { wilayah, zona, nama });
    if (j) {
      setBaru('');
      onBerubah({ tipe: 'tambah', baru: j.nama ?? nama });
    }
  }

  async function simpanUbah(item: LokasiItem) {
    const nama = (edit?.nama ?? '').trim();
    if (!nama || nama === item.nama) return setEdit(null);
    if (
      item.dipakai > 0 &&
      !window.confirm(`"${item.nama}" dipakai di ${item.dipakai} survei. Semua survei itu ikut diganti menjadi "${nama}". Lanjutkan?`)
    ) return;
    const j = await panggil(API, 'PATCH', { id: item.id, nama });
    if (j) {
      setEdit(null);
      onBerubah({ tipe: 'ubah', lama: item.nama, baru: j.nama ?? nama });
    }
  }

  async function hapus(item: LokasiItem) {
    if (!window.confirm(`Hapus "${item.nama}" dari daftar? Survei yang sudah memakai nama ini tidak berubah.`)) return;
    const j = await panggil(`${API}?id=${item.id}`, 'DELETE');
    if (j) onBerubah({ tipe: 'hapus', lama: item.nama });
  }

  // Enter di dalam panel tidak boleh mengirim form di sekitarnya
  const enter = (aksi: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      aksi();
    }
  };

  return (
    <div role="region" aria-label="Pengaturan lokasi" className="mt-2 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-600">
        Lokasi zona <strong>{zona}</strong> di <strong>{wilayahNama}</strong>.
      </p>

      <div className="flex gap-2">
        <input value={baru} maxLength={120} placeholder="Nama lokasi baru" aria-label="Nama lokasi baru"
          className={gayaInput} onChange={(e) => setBaru(e.target.value)} onKeyDown={enter(tambah)} />
        <button type="button" disabled={kirim || !baru.trim()} onClick={tambah} className={`${gayaTombol} whitespace-nowrap`}>
          Tambah
        </button>
      </div>

      {daftar.length === 0 ? (
        <p className="text-xs text-slate-600">Belum ada lokasi di zona ini.</p>
      ) : (
        <ul className="max-h-56 divide-y divide-slate-200 overflow-y-auto rounded-md border border-slate-200 bg-white">
          {daftar.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              {edit?.id === item.id ? (
                <>
                  <input autoFocus value={edit.nama} maxLength={120} aria-label={`Nama baru untuk ${item.nama}`}
                    className={`${gayaInput} sm:max-w-xs`} onChange={(e) => setEdit({ id: item.id, nama: e.target.value })}
                    onKeyDown={enter(() => simpanUbah(item))} />
                  <span className="flex gap-1">
                    <button type="button" disabled={kirim} onClick={() => simpanUbah(item)}
                      className={`${aksiKecil} bg-teal-700 text-white hover:bg-teal-800`}>Simpan</button>
                    <button type="button" onClick={() => setEdit(null)} className={`${aksiKecil} text-slate-700 hover:bg-slate-100`}>Batal</button>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm">
                    {item.nama}
                    {item.dipakai > 0 && <span className="ml-2 text-xs text-slate-500">dipakai {item.dipakai} survei</span>}
                  </span>
                  <span className="flex gap-1">
                    <button type="button" aria-label={`Edit lokasi ${item.nama}`} onClick={() => setEdit({ id: item.id, nama: item.nama })}
                      className={`${aksiKecil} text-slate-700 hover:bg-slate-100`}>Edit</button>
                    <button type="button" aria-label={`Hapus lokasi ${item.nama}`} onClick={() => hapus(item)}
                      className={`${aksiKecil} text-rose-700 hover:bg-rose-50`}>Hapus</button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {galat && <p role="alert" className="text-xs text-rose-700">{galat}</p>}
    </div>
  );
}