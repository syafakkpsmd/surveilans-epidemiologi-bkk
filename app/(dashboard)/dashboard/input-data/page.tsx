// Hub Input Data: semua menu input dikumpulkan di sini, per kategori. HANYA Petugas/Admin.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { KATEGORI_INPUT, type CaraInput } from '@/lib/input-data/kategori';

export const dynamic = 'force-dynamic';

const LABEL_CARA: Record<CaraInput, string> = { form: 'Form', excel: 'Unggah Excel', csv: 'Unggah CSV' };

export default async function InputDataPage() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Input Data</h1>
          <p className="text-sm text-gray-500">Pilih kategori dan jenis data yang akan diinput.</p>
        </div>

        {KATEGORI_INPUT.map((k) => (
          <section key={k.id} aria-labelledby={`kat-${k.id}`}>
            <h2 id={`kat-${k.id}`} className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{k.judul}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {k.menu.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  prefetch={false}
                  className="block rounded-[10px] bg-white p-5 shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0F4C5C]"
                >
                  <h3 className="text-base font-bold text-[#0F2A38]">{m.judul}</h3>
                  <p className="mt-1 text-sm text-gray-500">{m.deskripsi}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.cara.map((c) => (
                      <span key={c} className="rounded-full bg-[#EEF1F4] px-2.5 py-0.5 text-xs font-semibold text-[#0F4C5C]">{LABEL_CARA[c]}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}