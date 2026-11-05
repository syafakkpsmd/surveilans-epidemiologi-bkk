import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cekAksesBkk, getKunjunganBkkTerbaru } from '@/lib/db/modul/poliklinikBkk';
import { getKategoriPasienOpsi } from '@/lib/db/modul/poliklinikNonBkk';
import { getNamaWilkerModul } from '@/lib/wilayah-kerja/server';
import KegiatanPoliklinik from '@/components/poliklinik/KegiatanPoliklinik';
import { simpanKunjunganBkk, hapusKunjunganBkk } from './actions';

export const dynamic = 'force-dynamic';

export default async function InputKunjunganBkkPage() {
  const { user, boleh, admin } = await cekAksesBkk();
  if (!user) redirect('/login');
  if (!boleh) redirect('/dashboard/poliklinik');

  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
  const [baris, kategoriOpsi] = await Promise.all([
    getKunjunganBkkTerbaru(user.id, admin, 50),
    getKategoriPasienOpsi(),
  ]);

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link href="/dashboard/poliklinik" className="text-sm text-[#0F4C5C] underline">
            &larr; Kembali ke dashboard Kunjungan Poliklinik
          </Link>
          <h1 className="mt-2 text-xl font-bold text-[#0F2A38]">Input Kunjungan Poliklinik BKK</h1>
          <p className="text-sm text-gray-500">Satu isian untuk satu kunjungan pasien.</p>
        </div>
        <KegiatanPoliklinik
          poliklinikId={null}
          wilkerOpsi={await getNamaWilkerModul('poliklinik')}
          hariIni={hariIni}
          baris={baris}
          kategoriOpsi={kategoriOpsi}
          onSimpan={simpanKunjunganBkk}
          onHapus={hapusKunjunganBkk}
          judulDaftar={admin ? '50 Kunjungan BKK Terakhir' : '50 Kunjungan Terakhir yang Anda Input'}
        />
      </div>
    </div>
  );
}