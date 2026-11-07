// app/(dashboard)/dashboard/data/vektor/tikus/page.tsx
import { requireVektor } from '@/lib/vektor/auth';
import TikusClient from '@/components/vektor/tikus/TikusClient';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';

export default async function Page() {
  const user = await requireVektor();
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-slate-700">Halaman ini hanya untuk admin dan petugas. Silakan masuk terlebih dulu.</p>
      </main>
    );
  }
  return <TikusClient wilayah={await getDaftarWilker()} />;
}