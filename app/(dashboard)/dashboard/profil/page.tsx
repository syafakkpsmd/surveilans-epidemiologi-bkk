import { getPengguna } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import ProfilForm from './ProfilForm';

export default async function ProfilPage() {
  const user = await getPengguna();

  if (!user) redirect('/login');

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-[#0F2A38] mb-4">Profil Saya</h1>

      <div className="bg-white rounded-[10px] border border-black/5 p-6 space-y-4">
        <div className="text-sm">
          <p className="text-[#0F2A38]/60">Email</p>
          <p className="font-medium text-[#0F2A38]">{user.email}</p>
        </div>
        <div className="text-sm">
          <p className="text-[#0F2A38]/60">Peran</p>
          <p className="font-medium text-[#0F2A38] capitalize">{user.role ?? '-'}</p>
        </div>

        <ProfilForm namaAwal={user.namaLengkap ?? ''} />
      </div>
    </main>
  );
}