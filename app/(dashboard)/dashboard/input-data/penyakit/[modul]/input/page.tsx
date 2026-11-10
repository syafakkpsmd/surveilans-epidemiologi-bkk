import { notFound, redirect } from 'next/navigation';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul, wilayahBolehModul } from '@/lib/input-data/modul';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';
import FormMigrasiMalaria from '@/components/input-data/FormMigrasiMalaria';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ modul: string }> }) {
  const { modul: kunci } = await params;
  if (kunci !== 'migrasi_malaria') notFound();
  const modul = dapatkanModul(kunci);
  if (!modul) notFound();

  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !role || (role !== 'admin' && !(modul.peranBoleh as string[]).includes(role))) redirect('/dashboard');

  const kamus = await getKamusWilker();
  const wilayah = wilayahBolehModul(modul, kamus).map((w) => ({ kode: w.kode, nama: w.namaPendek }));

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <FormMigrasiMalaria wilayah={wilayah} />
    </div>
  );
}