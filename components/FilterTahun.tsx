'use client';
// components/FilterTahun.tsx
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { bacaTahun, daftarTahun } from '@/lib/tahun';

const PARAM_RENTANG = ['mgDari', 'mgSampai', 'bulanDari', 'bulanSampai'];

export default function FilterTahun() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const tahun = bacaTahun(sp.get('tahun'));

  function ganti(nilai: string) {
    const params = new URLSearchParams(sp.toString());
    params.set('tahun', nilai);
    for (const k of PARAM_RENTANG) params.delete(k);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <label className="flex items-center gap-1 text-xs text-gray-600">
      <span>Tahun</span>
      <select
        aria-label="Pilih tahun"
        value={tahun}
        onChange={(e) => ganti(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-hidden"
      >
        {daftarTahun().map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </label>
  );
}