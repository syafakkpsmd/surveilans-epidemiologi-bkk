import { getStatistikKunjungan } from '@/lib/analytics/get-stats';
import { getUserRole } from '@/lib/auth/get-user-role';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TopDaerahChart from './TopDaerahChart';

export default async function StatistikPage() {
  const role = await getUserRole();
  if (role !== 'admin') redirect('/dashboard');

  const stats = await getStatistikKunjungan();
  if (!stats.ok) return <div className="p-6">Gagal memuat statistik: {stats.error}</div>;

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#0F2A38]">Statistik Kunjungan</h1>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-[#0F4C5C] hover:underline"
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-[10px] border border-black/5 p-4">
          <p className="text-xs text-[#0F2A38]/60">Total Pageload (7 hari)</p>
          <p className="text-2xl font-semibold text-[#0F2A38]">{stats.totalPageload}</p>
        </div>
        <div className="bg-white rounded-[10px] border border-black/5 p-4">
          <p className="text-xs text-[#0F2A38]/60">Login Admin</p>
          <p className="text-2xl font-semibold text-[#0F2A38]">{stats.loginAdmin}</p>
        </div>
        <div className="bg-white rounded-[10px] border border-black/5 p-4">
          <p className="text-xs text-[#0F2A38]/60">Login Petugas</p>
          <p className="text-2xl font-semibold text-[#0F2A38]">{stats.loginPetugas}</p>
        </div>
      </div>

      <TopDaerahChart data={stats.daerahAsal} />
    </main>
  );
}