import { getStatistikKunjungan } from '@/lib/analytics/get-stats';
import { getUserRole } from '@/lib/auth/get-user-role';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, UserCheck, Crown, LogIn, Users } from 'lucide-react';
import TopDaerahChart from './TopDaerahChart';
import AktivitasTrendChart from './AktivitasTrendChart';
import AktivitasTerakhirList from './AktivitasTerakhirList';

export const dynamic = 'force-dynamic';   // <-- tambahkan baris ini

export default async function StatistikPage() {
  const role = await getUserRole();
  if (role !== 'admin') redirect('/dashboard');

  const stats = await getStatistikKunjungan();
  if (!stats.ok) {
    return (
      <div className="p-6 text-center text-red-500">
        Gagal memuat statistik: {stats.error}
      </div>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#0F2A38]">Statistik Kunjungan</h1>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-[#0F4C5C] hover:underline font-medium"
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>
      </div>


      {/* 4 Cards Ringkasan Stat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">   {/* ganti lg:grid-cols-4 -> 5 */}
        {/* Card 1: Total Page Load — tetap */}
        <div className="bg-white rounded-[10px] border border-black/5 p-4 text-center shadow-xs">
          <p className="text-3xl font-bold text-[#1E2B58] mb-1">{stats.totalPageload}</p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#0F2A38]/60">
            <Eye size={14} className="text-[#1E2B58]" />
            <span>Total Page Load</span>
          </div>
        </div>

        {/* Card BARU: Tamu */}
        <div className="bg-white rounded-[10px] border border-black/5 p-4 text-center shadow-xs">
          <p className="text-3xl font-bold text-slate-500 mb-1">{stats.pageloadTamu}</p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#0F2A38]/60">
            <Users size={14} className="text-slate-500" />
            <span>Kunjungan Tamu</span>
          </div>
        </div>

        {/* Card 2: Login Petugas */}
        <div className="bg-white rounded-[10px] border border-black/5 p-4 text-center shadow-xs">
          <p className="text-3xl font-bold text-emerald-600 mb-1">{stats.loginPetugas}</p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#0F2A38]/60">
            <UserCheck size={14} className="text-emerald-600" />
            <span>Login Petugas</span>
          </div>
        </div>

        {/* Card 3: Login Admin */}
        <div className="bg-white rounded-[10px] border border-black/5 p-4 text-center shadow-xs">
          <p className="text-3xl font-bold text-amber-500 mb-1">{stats.loginAdmin}</p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#0F2A38]/60">
            <Crown size={14} className="text-amber-500" />
            <span>Login Admin</span>
          </div>
        </div>

        {/* Card 4: Total Login */}
        <div className="bg-white rounded-[10px] border border-black/5 p-4 text-center shadow-xs">
          <p className="text-3xl font-bold text-blue-600 mb-1">{stats.totalLogin}</p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#0F2A38]/60">
            <LogIn size={14} className="text-blue-600" />
            <span>Total Login</span>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom: Grafik Trend (Harian/Mingguan/Bulanan/Tahunan) & 10 Aktivitas Terakhir */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AktivitasTrendChart data={stats.tren} />
        <AktivitasTerakhirList logs={stats.recent} />
      </div>

      {/* Grafik Top Daerah Asal Login */}
      <TopDaerahChart data={stats.daerahAsal} />
    </main>
  );
}