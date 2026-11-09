'use client';
// components/klinik/ckg/CkgClient.tsx
import { useState } from 'react';
import CkgDashboard from './CkgDashboard';
import CkgForm from './CkgForm';
import CkgUpload from './CkgUpload';
import type { OpsiWilayahCkg } from '@/lib/klinik/ckg/config';

const TAB = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'input', label: 'Input data' },
  { id: 'unggah', label: 'Unggah Excel' },
] as const;

type TabId = (typeof TAB)[number]['id'];

export default function CkgClient({ opsiWilayah, tahun }: { opsiWilayah: OpsiWilayahCkg[]; tahun: number }) {
  const [tab, setTab] = useState<TabId>('dashboard');

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <h1 className="text-xl font-semibold">Cek Kesehatan Gratis</h1>

      <div role="tablist" aria-label="Menu CKG" className="flex gap-1 border-b border-slate-200">
        {TAB.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              tab === t.id
                ? 'border-teal-700 font-medium text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'dashboard' && <CkgDashboard opsiWilayah={opsiWilayah} tahun={tahun} />}
        {tab === 'input' && <CkgForm opsiWilayah={opsiWilayah} />}
        {tab === 'unggah' && <CkgUpload opsiWilayah={opsiWilayah} />}
      </div>
    </main>
  );
}