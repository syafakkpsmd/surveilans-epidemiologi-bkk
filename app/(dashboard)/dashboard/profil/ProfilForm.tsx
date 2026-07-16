'use client';

import { useState, useTransition } from 'react';
import { updateNamaLengkap } from '@/lib/auth/profile-actions';

export default function ProfilForm({ namaAwal }: { namaAwal: string }) {
  const [nama, setNama] = useState(namaAwal);
  const [pesan, setPesan] = useState<{ tipe: 'sukses' | 'error'; teks: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setPesan(null);
    startTransition(async () => {
      const hasil = await updateNamaLengkap(formData);
      if (hasil.ok) {
        setPesan({ tipe: 'sukses', teks: 'Nama berhasil disimpan.' });
      } else {
        setPesan({ tipe: 'error', teks: hasil.error ?? 'Gagal menyimpan.' });
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-3">
      {pesan && (
        <div
          className={`rounded-[8px] px-3 py-2 text-sm ${
            pesan.tipe === 'sukses'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-[#D62839]/10 border border-[#D62839]/30 text-[#D62839]'
          }`}
        >
          {pesan.teks}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="nama_lengkap" className="block text-sm font-medium text-[#0F2A38]">
          Nama Lengkap
        </label>
        <input
          id="nama_lengkap"
          name="nama_lengkap"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
          className="w-full rounded-[8px] border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
          placeholder="mis. Ahmad Musyafa', SKM, MPH"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-[8px] bg-[#0F2A38] px-3 py-2 text-sm font-medium text-white hover:bg-[#0F4C5C] disabled:opacity-50"
      >
        {isPending ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  );
}