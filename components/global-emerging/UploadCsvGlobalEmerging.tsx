'use client';

// components/global-emerging/UploadCsvGlobalEmerging.tsx
// Upload CSV massal -- parsing di client (papaparse), validasi ULANG
// di server (jangan percaya hasil parsing client begitu saja).
//
// PERLU: npm install papaparse @types/papaparse

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { simpanUploadCsv, type HasilSimpan } from '@/app/(dashboard)/dashboard/global-emerging/actions';

const KOLOM_WAJIB = [
  'penyakit', 'negara', 'jenis_periode', 'tahun_epid',
  'minggu_epid', 'bulan', 'jumlah_kasus', 'jumlah_kematian', 'sumber',
];

const CONTOH_CSV = `penyakit,negara,jenis_periode,tahun_epid,minggu_epid,bulan,jumlah_kasus,jumlah_kematian,sumber
Meningitis,Arab Saudi,mingguan,2026,28,,3,0,WHO DON 10 Juli 2026
CCHF,India,bulanan,2026,,6,12,2,WHO DON Juni 2026`;

export default function UploadCsvGlobalEmerging() {
  const [mengunggah, setMengunggah] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpan | null>(null);
  const [namaFile, setNamaFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function unduhContoh() {
    const blob = new Blob([CONTOH_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contoh_template_global_emerging.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function tanganiFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNamaFile(file.name);
    setHasil(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (hasilParse) => {
        const kolomDitemukan = hasilParse.meta.fields ?? [];
        const kolomHilang = KOLOM_WAJIB.filter((k) => !kolomDitemukan.includes(k));
        if (kolomHilang.length > 0) {
          setHasil({
            sukses: false,
            error: `Kolom wajib tidak ditemukan di header CSV: ${kolomHilang.join(', ')}. Gunakan template yang disediakan.`,
          });
          return;
        }

        setMengunggah(true);
        const res = await simpanUploadCsv(hasilParse.data as any);
        setHasil(res);
        setMengunggah(false);
        if (inputRef.current) inputRef.current.value = '';
      },
      error: (err) => {
        setHasil({ sukses: false, error: `Gagal membaca file CSV: ${err.message}` });
      },
    });
  }

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold text-[#0F2A38]">Upload CSV (Massal)</h2>
      <p className="mb-4 text-sm text-gray-500">
        Untuk memasukkan banyak baris sekaligus. Kolom wajib: {KOLOM_WAJIB.join(', ')}. Kolom{' '}
        <code className="rounded bg-gray-100 px-1">minggu_epid</code> dikosongkan untuk baris bulanan,{' '}
        <code className="rounded bg-gray-100 px-1">bulan</code> dikosongkan untuk baris mingguan.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={unduhContoh}
          className="text-sm text-[#0F4C5C] underline"
        >
          Download template CSV contoh
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={tanganiFile}
          disabled={mengunggah}
          className="text-sm"
        />
        {mengunggah && <span className="text-sm text-gray-500">Mengunggah & memvalidasi...</span>}
      </div>

      {namaFile && !mengunggah && !hasil && (
        <p className="mt-2 text-xs text-gray-400">File terpilih: {namaFile}</p>
      )}

      {hasil && (
        <div
          className={`mt-4 rounded-lg p-3 text-sm ${
            hasil.sukses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {hasil.sukses ? (
            <p>{hasil.jumlahBarisTersimpan} baris berhasil disimpan.</p>
          ) : (
            <>
              <p className="font-medium">{hasil.error}</p>
              {hasil.detailBaris && hasil.detailBaris.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {hasil.detailBaris.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
