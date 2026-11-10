'use client';
// components/media-tanah/TanahClient.tsx
import { useMemo, useState } from 'react';
import { buatKamus, type Wilayah } from '@/lib/wilayah-kerja';
import { useRouter } from 'next/navigation';
import TanahDashboard from './TanahDashboard';
import TanahRiwayat from './TanahRiwayat';
import TanahForm from './TanahForm';
import TanahUpload from './TanahUpload';

const TAB = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'riwayat', label: 'Riwayat' },
  { id: 'input', label: 'Input pemeriksaan' },
  { id: 'unggah', label: 'Unggah Excel' },
] as const;

type TabId = (typeof TAB)[number]['id'];

export default function TanahClient({ 
  wilayah, 
  tahun, 
  isStaf 
}: { 
  wilayah: Wilayah[]; 
  tahun: number; 
  isStaf: boolean; 
}) {
  const wk = useMemo(() => buatKamus(wilayah), [wilayah]);
  const [tab, setTab] = useState<TabId>('dashboard');
  const router = useRouter();

  const handleTabClick = (id: TabId) => {
    // Jika mencoba membuka tab input/unggah tapi belum login sebagai staf/admin
    if ((id === 'input' || id === 'unggah') && !isStaf) {
      router.push('/login');
      return;
    }
    setTab(id);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold">Pemeriksaan Kesehatan Lingkungan Media Tanah</h1>
        <p className="text-sm text-slate-600">Balai Kekarantinaan Kesehatan Kelas I Samarinda</p>
      </div>

      {/* Tab navigasi + Filter Tahun di sebelah kanan */}
      <div className="border-b border-slate-200 pb-2">
        <div role="tablist" aria-label="Menu Media Tanah" className="-mb-2 flex flex-wrap gap-1">
          {TAB.map((t) => {
            const isRestricted = (t.id === 'input' || t.id === 'unggah') && !isStaf;
            return (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => handleTabClick(t.id)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  tab === t.id
                    ? 'border-teal-700 font-medium text-teal-800'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label} {isRestricted && <span className="text-xs ml-1">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'dashboard' && <TanahDashboard wk={wk} tahun={tahun} />}
        {tab === 'riwayat' && <TanahRiwayat wk={wk} />}
        {tab === 'input' && isStaf && <TanahForm wk={wk} />}
        {tab === 'unggah' && isStaf && <TanahUpload wk={wk} />}
      </div>
    </main>
  );
}