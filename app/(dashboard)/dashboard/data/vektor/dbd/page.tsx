// app/(dashboard)/dashboard/data/vektor/dbd/page.tsx
import { requireVektor } from '@/lib/vektor/auth';
import DbdClient from '@/components/vektor/dbd/DbdClient';

export default async function Page() {
  const user = await requireVektor();
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-slate-700">Halaman ini hanya untuk admin dan petugas. Silakan masuk terlebih dulu.</p>
      </main>
    );
  }
  return <DbdClient />;
}