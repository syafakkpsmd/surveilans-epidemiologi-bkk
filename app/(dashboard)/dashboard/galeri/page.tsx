import { getGaleriFoto, getJenisKegiatanFoto } from '@/lib/supabase/queriesFoto';
import { getUserRole } from '@/lib/auth/get-user-role';
import GaleriFotoKegiatan from '@/components/GaleriFotoKegiatan';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function GaleriPage() {
  const [role, fotoAwal, daftarJenis] = await Promise.all([
    getUserRole(),
    getGaleriFoto(),
    getJenisKegiatanFoto(),
  ]);
  const bisaKelola = role === 'admin' || role === 'petugas';

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#0F2A38]">Galeri Kegiatan</h1>
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-[#0F4C5C] hover:underline font-medium">
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>
      </div>

      <GaleriFotoKegiatan
        fotoAwal={fotoAwal}
        daftarJenis={daftarJenis}
        bisaKelola={bisaKelola}
        tampilan="lengkap"
      />
    </main>
  );
}