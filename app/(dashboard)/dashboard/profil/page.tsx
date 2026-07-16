import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfilForm from './ProfilForm';

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nama_lengkap, role, status')
    .eq('id', user.id)
    .single();

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
          <p className="font-medium text-[#0F2A38] capitalize">{profile?.role ?? '-'}</p>
        </div>

        <ProfilForm namaAwal={profile?.nama_lengkap ?? ''} />
      </div>
    </main>
  );
}