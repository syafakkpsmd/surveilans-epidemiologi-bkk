'use client';
import { NAMA_RESMI_BKK } from '@/lib/konfigurasi/instansi';
// components/media-tanah/TanahInputClient.tsx  (FILE BARU)
// Tab input pemeriksaan, unggah Excel, dan riwayat. Hanya dipakai halaman /dashboard/media-tanah/input (sudah dijaga di server).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { buatKamus, type Wilayah } from '@/lib/wilayah-kerja';
import TanahRiwayat from './TanahRiwayat';
import TanahForm from './TanahForm';
import TanahUpload from './TanahUpload';

const TAB = [
  { id: 'input', label: 'Input pemeriksaan' },
  { id: 'unggah', label: 'Unggah Excel' },
  { id: 'riwayat', label: 'Riwayat' },
] as const;
type TabId = (typeof TAB)[number]['id'];

export default function TanahInputClient({ wilayah }: { wilayah: Wilayah[] }) {
  const wk = useMemo(() => buatKamus(wilayah), [wilayah]);
  const [tab, setTab] = useState<TabId>('input');

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <Link href="/dashboard/media-tanah" className="text-sm text-teal-800 underline">&larr; Kembali ke dashboard Media Tanah</Link>
        <h1 className="mt-2 text-xl font-semibold">Input Data Media Tanah</h1>
        <p className="text-sm text-slate-600">{NAMA_RESMI_BKK}</p>
      </div>

      <div className="border-b border-slate-200 pb-2">
        <div role="tablist" aria-label="Menu input Media Tanah" className="-mb-2 flex flex-wrap gap-1">
          {TAB.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                tab === t.id ? 'border-teal-700 font-medium text-teal-800' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'input' && <TanahForm wk={wk} />}
        {tab === 'unggah' && <TanahUpload wk={wk} />}
        {tab === 'riwayat' && <TanahRiwayat wk={wk} />}
      </div>
    </main>
  );
}

