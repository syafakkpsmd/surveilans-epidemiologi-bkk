// components/klinik/PencarianIcv.tsx
'use client';
import { useState, type ChangeEvent } from 'react';

export function PencarianIcv() {
  const [q, setQ] = useState('');
  const [hasil, setHasil] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function cari(query: string) {
    if (query.trim().length < 3) { setHasil([]); return; }
    setLoading(true);
    const res = await fetch(`/api/klinik/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    setHasil(json.success ? json.hasil : []);
    setLoading(false);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
    cari(e.target.value);
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 space-y-3">
      <h3 className="text-sm font-bold text-gray-800">Pencarian Data ICV / e-ICV</h3>
      <input
        placeholder="Cari nama, NIK, atau nomor paspor (min. 3 karakter)..."
        value={q}
        onChange={handleChange}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden"
      />
      {loading && <p className="text-xs text-gray-500">Mencari...</p>}
      {hasil.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-700 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2">Nama</th><th className="px-3 py-2">NIK</th><th className="px-3 py-2">Paspor</th>
                <th className="px-3 py-2">Klinik</th><th className="px-3 py-2">Tgl Berangkat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hasil.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2 font-medium text-gray-800">{r['Nama']}</td>
                  <td className="px-3 py-2">{r['NIK']}</td>
                  <td className="px-3 py-2">{r['No Paspor']}</td>
                  <td className="px-3 py-2">{r.nama_klinik}</td>
                  <td className="px-3 py-2">{r['Tanggal Berangkat']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}