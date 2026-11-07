'use client';

// components/input-data/PanelInputPesawat.tsx
// Dua pilihan: input satu per satu atau unggah Excel.

import { useState } from 'react';
import FormPesawat from './FormPesawat';
import UnggahPesawat from './UnggahPesawat';
import type { WilkerBandara } from '@/lib/db/modul/inputPesawat';

type Tab = 'satuan' | 'excel';

export default function PanelInputPesawat({ hariIni, bandara }: { hariIni: string; bandara: WilkerBandara[] }) {
  const [tab, setTab] = useState<Tab>('satuan');
  const [kodeBandara, setKodeBandara] = useState<string>(bandara[0]?.kode ?? '');
  const kelasTab = (aktif: boolean) =>
    `flex-1 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
      aktif ? 'border-[#0F4C5C] text-[#0F4C5C]' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="rounded-[10px] bg-white shadow-sm">
      <div role="tablist" className="flex border-b border-gray-200">
        <button type="button" role="tab" id="tab-satuan" aria-selected={tab === 'satuan'} aria-controls="panel-satuan" onClick={() => setTab('satuan')} className={kelasTab(tab === 'satuan')}>
          Input Satu per Satu
        </button>
        <button type="button" role="tab" id="tab-excel" aria-selected={tab === 'excel'} aria-controls="panel-excel" onClick={() => setTab('excel')} className={kelasTab(tab === 'excel')}>
          Unggah Excel
        </button>
      </div>
      {bandara.length > 1 && (
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-3 text-sm">
          <label htmlFor="pilih-bandara" className="font-semibold text-[#0F2A38]">Bandara</label>
          <select id="pilih-bandara" value={kodeBandara} onChange={(e) => setKodeBandara(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5">
            {bandara.map((b) => (
              <option key={b.kode} value={b.kode}>{b.nama}</option>
            ))}
          </select>
        </div>
      )}
      <div className="p-6">
        <div role="tabpanel" id="panel-satuan" aria-labelledby="tab-satuan" hidden={tab !== 'satuan'}>
          <FormPesawat hariIni={hariIni} kodeBandara={kodeBandara} />
        </div>
        <div role="tabpanel" id="panel-excel" aria-labelledby="tab-excel" hidden={tab !== 'excel'}>
          <UnggahPesawat kodeBandara={kodeBandara} />
        </div>
      </div>
    </div>
  );
}
