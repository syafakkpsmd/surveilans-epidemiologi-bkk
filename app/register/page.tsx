import FormDaftar from './FormDaftar';
import { getKlinikBinaan, getPilihanPoliklinik } from '@/lib/db/queries/queriesMaster';

export const dynamic = 'force-dynamic';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [daftarPoliklinik, daftarKlinikBinaan] = await Promise.all([
    getPilihanPoliklinik().catch((e) => { console.error('[register] poliklinik:', e.message); return []; }),
    getKlinikBinaan().catch((e) => { console.error('[register] klinik binaan:', e.message); return []; }),
  ]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EEF1F4] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-[#0F2A38] text-center mb-6">Daftar Akun</h1>
        <FormDaftar
          error={error}
          daftarPoliklinik={daftarPoliklinik}
          daftarKlinikBinaan={daftarKlinikBinaan}
        />
      </div>
    </main>
  );
}