import { createDbClient } from '@/lib/db/server';
import { sql } from '@/lib/auth/db';
import { getUserRole } from '@/lib/auth/get-user-role';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import UserRow from './UserRow';

export default async function AdminUsersPage() {
  const role = await getUserRole();
  if (role !== 'admin') redirect('/dashboard');

  const supabase = await createDbClient();
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, role, status')
    .order('status', { ascending: true });

  const klinikTersedia = await sql<{ id: string; nama_klinik: string }>('SELECT id, nama_klinik FROM klinik_binaan ORDER BY nama_klinik');
  const tautan = await sql<{ user_id: string; klinik_id: string }>('SELECT user_id, klinik_id FROM klinik_akses');
  const klinikPerUser = new Map<string, string[]>();
  for (const t of tautan) klinikPerUser.set(t.user_id, [...(klinikPerUser.get(t.user_id) ?? []), t.klinik_id]);

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#0F2A38]">Verifikasi Akun Pengguna</h1>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-[#0F4C5C] hover:underline"
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>
      </div>

      {error ? (
        <div className="bg-white rounded-[10px] border border-black/5 p-6 text-sm text-[#D62839]">
          Gagal memuat daftar user: {error.message}
        </div>
      ) : !users || users.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-black/5 p-6 text-sm text-[#0F2A38]/60">
          Belum ada data user.
        </div>
      ) : (
        <div className="bg-white rounded-[10px] shadow-sm border border-black/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-[#F5F7FA] text-left text-xs uppercase tracking-wide text-[#0F2A38]/60">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Peran</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  id={u.id}
                  namaAwal={u.nama_lengkap ?? ''}
                  role={u.role}
                  status={u.status}
                  klinikTersedia={klinikTersedia}
                  klinikTerpilih={klinikPerUser.get(u.id) ?? []}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}