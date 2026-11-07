// app/(dashboard)/dashboard/data/vektor/anopheles/page.tsx
import { requireVektor } from '@/lib/vektor/auth';
import AnophelesClient from '@/components/vektor/anopheles/AnophelesClient';

export default async function Page() {
  const user = await requireVektor();
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-slate-700">Halaman ini hanya untuk admin dan petugas. Silakan masuk terlebih dulu.</p>
      </main>
    );
  }
  return <AnophelesClient />;
}