// components/klinik/DaftarKlinikSyncManual.tsx
'use client';

import { TombolSyncStok } from './TombolSyncStok';

type OpsiKlinik = { id: string; nama_klinik: string; spreadsheet_id: string | null };

export function DaftarKlinikSyncManual({ daftarKlinik }: { daftarKlinik: OpsiKlinik[] }) {
  const klinikDenganSheet = daftarKlinik.filter((k) => k.spreadsheet_id);

  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
      <p className="text-sm font-semibold text-[#0F2A38] mb-1">Sync Manual per Klinik</p>
      <p className="text-xs text-gray-500 mb-3">
        Pakai ini kalau ada koreksi data yang baru diperbaiki di Google Sheets dan ingin
        segera terlihat di dashboard, tanpa menunggu sinkronisasi otomatis jam 01:00 WITA.
      </p>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {klinikDenganSheet.map((klinik) => (
          <div key={klinik.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-sm text-gray-700">{klinik.nama_klinik}</span>
            <TombolSyncStok label="Sync" spreadsheetId={klinik.spreadsheet_id!} />
          </div>
        ))}
      </div>
    </div>
  );
}