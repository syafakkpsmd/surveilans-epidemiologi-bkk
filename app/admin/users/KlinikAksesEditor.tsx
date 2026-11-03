'use client';

import { useState, useTransition } from 'react';
import { setKlinikAkses } from '@/lib/auth/admin-actions';

interface Props {
  userId: string;
  klinikTersedia: { id: string; nama_klinik: string }[];
  klinikTerpilihAwal: string[];
}

/** Tautan akun Petugas Klinik ke klinik. Tanpa tautan, akun itu tidak melihat data klinik mana pun. */
export default function KlinikAksesEditor({ userId, klinikTersedia, klinikTerpilihAwal }: Props) {
  const [isPending, startTransition] = useTransition();
  const [buka, setBuka] = useState(false);
  const [dipilih, setDipilih] = useState<string[]>(klinikTerpilihAwal);
  const [tersimpan, setTersimpan] = useState<string[]>(klinikTerpilihAwal);
  const [galat, setGalat] = useState<string | null>(null);

  const nama = (id: string) => klinikTersedia.find((k) => k.id === id)?.nama_klinik ?? id;
  const simpan = () => {
    setGalat(null);
    startTransition(async () => {
      try {
        await setKlinikAkses(userId, dipilih);
        setTersimpan(dipilih);
        setBuka(false);
      } catch (e) {
        setGalat((e as Error).message || 'Gagal menyimpan.');
      }
    });
  };

  return (
    <div className="mt-1 text-xs normal-case">
      <div className="flex flex-wrap items-center gap-2">
        {tersimpan.length === 0
          ? <span className="font-medium text-[#D62839]">Belum ditautkan ke klinik (tidak melihat data apa pun)</span>
          : <span className="text-[#0F2A38]/70">Klinik: {tersimpan.map(nama).join(', ')}</span>}
        <button onClick={() => setBuka(!buka)} className="text-[#0F4C5C] underline">{buka ? 'Tutup' : 'Atur klinik'}</button>
      </div>
      {buka && (
        <div className="mt-2 rounded-md border border-black/10 bg-[#F5F7FA] p-2">
          <div className="grid max-h-48 gap-1 overflow-auto sm:grid-cols-2">
            {klinikTersedia.map((k) => (
              <label key={k.id} className="flex items-center gap-2">
                <input type="checkbox" checked={dipilih.includes(k.id)}
                  onChange={(e) => setDipilih(e.target.checked ? [...dipilih, k.id] : dipilih.filter((x) => x !== k.id))} />
                {k.nama_klinik}
              </label>
            ))}
          </div>
          {galat && <p className="mt-1 text-[#D62839]">{galat}</p>}
          <div className="mt-2 flex gap-2">
            <button onClick={simpan} disabled={isPending} className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50">Simpan</button>
            <button onClick={() => { setDipilih(tersimpan); setBuka(false); }} className="rounded-md bg-gray-200 px-3 py-1 hover:bg-gray-300">Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
