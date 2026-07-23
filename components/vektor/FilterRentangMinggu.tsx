'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function FilterRentangMinggu() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mgDari, setMgDari] = useState(searchParams.get('mgDari') || '1');
  const [mgSampai, setMgSampai] = useState(searchParams.get('mgSampai') || '9');

  // Generate 52 minggu epidemiologi
  const daftarMinggu = Array.from({ length: 52 }, (_, i) => i + 1);

  const handleTerapkan = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mgDari', mgDari);
    params.set('mgSampai', mgSampai);

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-600">Rentang Minggu</span>
      
      <select
        value={mgDari}
        onChange={(e) => setMgDari(e.target.value)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none"
      >
        {daftarMinggu.map((m) => (
          <option key={`awal-${m}`} value={m}>
            Mg-{m}
          </option>
        ))}
      </select>

      <span className="text-gray-500">s.d.</span>

      <select
        value={mgSampai}
        onChange={(e) => setMgSampai(e.target.value)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none"
      >
        {daftarMinggu.map((m) => (
          <option key={`akhir-${m}`} value={m}>
            Mg-{m}
          </option>
        ))}
      </select>

      <button
        onClick={handleTerapkan}
        className="rounded bg-[#063940] px-3 py-1 font-medium text-white hover:bg-[#04282d] transition-colors"
      >
        Terapkan
      </button>
    </div>
  );
}