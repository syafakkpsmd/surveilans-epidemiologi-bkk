'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function FilterRentangMinggu() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [mgDari, setMgDari] = useState(searchParams.get('mgDari') ?? '1');
  const [mgSampai, setMgSampai] = useState(searchParams.get('mgSampai') ?? '53');

  function terapkan() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mgDari', mgDari);
    params.set('mgSampai', mgSampai);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-500">Rentang Minggu</span>
      <select
        value={mgDari}
        onChange={(e) => setMgDari(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1"
      >
        {Array.from({ length: 53 }, (_, i) => i + 1).map((mg) => (
          <option key={mg} value={mg}>Mg-{mg}</option>
        ))}
      </select>
      <span>s.d.</span>
      <select
        value={mgSampai}
        onChange={(e) => setMgSampai(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1"
      >
        {Array.from({ length: 53 }, (_, i) => i + 1).map((mg) => (
          <option key={mg} value={mg}>Mg-{mg}</option>
        ))}
      </select>
      <button
        onClick={terapkan}
        disabled={isPending}
        className="rounded-lg bg-[#0F4C5C] px-3 py-1 text-white hover:bg-[#0d3f4c] disabled:opacity-50"
      >
        {isPending ? 'Memuat...' : 'Terapkan'}
      </button>
    </div>
  );
}