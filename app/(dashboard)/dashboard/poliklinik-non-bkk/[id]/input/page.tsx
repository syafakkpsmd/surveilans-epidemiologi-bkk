import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cekAkses, getPoliklinikById, getKunjunganTerbaru, getKategoriPasienOpsi } from '@/lib/db/modul/poliklinikNonBkk';
import KegiatanPoliklinik from '@/components/poliklinik/KegiatanPoliklinik';
import { simpanKunjungan, hapusKunjungan } from './actions';

export const dynamic = 'force-dynamic';

export default async function InputKunjunganPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const akses = await cekAkses(id);
  if (!akses.user) redirect('/login');
  if (!akses.kelola) redirect(akses.lihat ? `/dashboard/poliklinik-non-bkk/${id}` : '/dashboard');

  const p = await getPoliklinikById(id);
  if (!p) notFound();

  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
  const [baris, kategoriOpsi] = await Promise.all([getKunjunganTerbaru(id, 50), getKategoriPasienOpsi()]);

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link href={`/dashboard/poliklinik-non-bkk/${id}`} className="text-sm text-[#0F4C5C] underline">
            &larr; Kembali ke dashboard {p.nama}
          </Link>
          <h1 className="mt-2 text-xl font-bold text-[#0F2A38]">Input Kunjungan: {p.nama}</h1>
          <p className="text-sm text-gray-500">Satu isian untuk satu kunjungan pasien.</p>
        </div>
        <KegiatanPoliklinik
          poliklinikId={id}
          hariIni={hariIni}
          baris={baris}
          kategoriOpsi={kategoriOpsi}
          onSimpan={simpanKunjungan}
          onHapus={hapusKunjungan.bind(null, id)}
        />
      </div>
    </div>
  );
}