// app/(dashboard)/dashboard/data/vektor/[jenis]/page.tsx
import { notFound } from 'next/navigation';
import { requireVektor } from '@/lib/vektor/auth';
import { JENIS, type Jenis } from '@/lib/vektor/diare/config';
import DiareClient from '@/components/vektor/diare/DiareClient';

export default async function Page({ params }: { params: Promise<{ jenis: string }> }) {
  const { jenis } = await params;
  if (!JENIS.includes(jenis as Jenis)) notFound();

  const user = await requireVektor();
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-slate-700">Halaman ini hanya untuk admin dan petugas. Silakan masuk terlebih dulu.</p>
      </main>
    );
  }
  return <DiareClient jenis={jenis as Jenis} />;
}