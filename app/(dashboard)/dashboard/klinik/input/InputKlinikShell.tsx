'use client';

import { useState } from 'react';
import Link from 'next/link';
import InputIcvClient from './InputIcvClient';
import InputStokClient from './InputStokClient';

type Bagian = 'vaksinasi' | 'stok';

/** Satu halaman input untuk klinik: pilih klinik, lalu Vaksinasi (ICV/e-ICV) atau Stok (ICV/e-ICV dan vaksin). */
export default function InputKlinikShell({ klinik, awal }: { klinik: { id: string; nama: string }[]; awal: Bagian }) {
  const [klinikId, setKlinikId] = useState(klinik[0].id);
  const [bagian, setBagian] = useState<Bagian>(awal);
  const nama = klinik.find((k) => k.id === klinikId)?.nama ?? '';
  const tombol = (b: Bagian, label: string) => (
    <button key={b} onClick={() => setBagian(b)}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${bagian === b ? 'bg-[#0F4C5C] text-white' : 'border border-[#0F4C5C] text-[#0F4C5C] hover:bg-gray-50'}`}>{label}</button>
  );
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Input Data Klinik</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/klinik" className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Dashboard Klinik</Link>
          <Link href="/dashboard/stok-vaksin" className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Dashboard Stok</Link>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        {klinik.length > 1 ? (
          <label className="text-sm">Klinik<br />
            <select className="rounded border border-gray-300 px-2 py-1.5 text-sm" value={klinikId} onChange={(e) => setKlinikId(e.target.value)}>
              {klinik.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </label>
        ) : <p className="text-sm text-gray-600">Klinik: <b>{nama}</b></p>}
        <div className="flex gap-2">{tombol('vaksinasi', 'Vaksinasi ICV / e-ICV')}{tombol('stok', 'Stok ICV / e-ICV dan Vaksin')}</div>
      </div>
      {/* key = klinik: berpindah klinik mengosongkan isian dan memuat ulang data */}
      {bagian === 'vaksinasi'
        ? <InputIcvClient key={`v-${klinikId}`} klinikId={klinikId} namaKlinik={nama} />
        : <InputStokClient key={`s-${klinikId}`} klinikId={klinikId} namaKlinik={nama} />}
    </div>
  );
}
