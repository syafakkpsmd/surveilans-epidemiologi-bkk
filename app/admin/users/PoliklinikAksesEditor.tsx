'use client';

import { useState, useTransition } from 'react';
import { setPoliklinikAkses } from '@/lib/auth/admin-actions';

interface Props {
  userId: string;
  poliklinikTersedia: { id: string; nama: string }[];
  poliklinikTerpilihAwal: string[];
}

export default function PoliklinikAksesEditor({ userId, poliklinikTersedia, poliklinikTerpilihAwal }: Props) {
  const [tersimpan, setTersimpan] = useState<string[]>(poliklinikTerpilihAwal);
  const [pilihan, setPilihan] = useState<string[]>(poliklinikTerpilihAwal);
  const [editing, setEditing] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const namaTersimpan = poliklinikTersedia.filter((p) => tersimpan.includes(p.id)).map((p) => p.nama);

  const simpan = () => {
    setPesan(null);
    startTransition(async () => {
      try {
        await setPoliklinikAkses(userId, pilihan);
        setTersimpan(pilihan);
        setEditing(false);
      } catch (e: any) {
        setPesan(e?.message ?? 'Gagal menyimpan.');
      }
    });
  };

  if (!editing) {
    return (
      <div className="mt-1 space-y-0.5 normal-case">
        {namaTersimpan.length > 0 ? (
          <p className="text-xs font-medium text-[#0F2A38]/70">{namaTersimpan.join(', ')}</p>
        ) : (
          <p className="text-xs font-semibold text-[#D62839]">
            Belum ditautkan ke poliklinik (tidak melihat data apa pun)
          </p>
        )}
        <button
          onClick={() => { setPilihan(tersimpan); setEditing(true); }}
          className="text-xs text-[#0F4C5C] underline"
        >
          Atur poliklinik
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-black/10 bg-white p-3 normal-case">
      {poliklinikTersedia.length === 0 && (
        <p className="text-xs text-gray-500">Belum ada poliklinik non-BKK. Tambahkan di Pengaturan Poliklinik.</p>
      )}
      {poliklinikTersedia.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pilihan.includes(p.id)}
            onChange={(e) =>
              setPilihan((prev) => (e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)))
            }
          />
          {p.nama}
        </label>
      ))}
      {pesan && <p className="text-xs text-red-600">{pesan}</p>}
      <div className="flex gap-2">
        <button onClick={simpan} disabled={isPending}
          className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50">
          Simpan
        </button>
        <button onClick={() => setEditing(false)}
          className="rounded-md bg-gray-200 px-3 py-1 text-xs hover:bg-gray-300">
          Batal
        </button>
      </div>
    </div>
  );
}