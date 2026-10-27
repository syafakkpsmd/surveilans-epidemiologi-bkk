import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { DAFTAR_MODUL } from '@/lib/input-data/modul';
import InputDataClient from './InputDataClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Input Data' };

export default async function InputDataPage() {
  const { sudahLogin, role } = await getStatusAkses();
  const modul = DAFTAR_MODUL.filter((m) => role === 'admin' || (role && (m.peranBoleh as string[]).includes(role)));

  if (!sudahLogin || !role || modul.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Input Data</h1>
        <p className="text-sm text-gray-600">Halaman ini hanya untuk petugas yang sudah login. Silakan login dengan akun petugas atau admin.</p>
      </div>
    );
  }
  return <InputDataClient modul={modul} role={role} />;
}
