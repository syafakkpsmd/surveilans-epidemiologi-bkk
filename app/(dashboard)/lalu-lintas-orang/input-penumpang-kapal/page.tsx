// Halaman input data penumpang kapal -- HANYA untuk Petugas/Admin.
// Tamu atau peran lain yang membuka URL ini diarahkan kembali ke halaman Lalu Lintas Orang
// (bukan error 500), sama seperti halaman input lain di proyek ini.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getPenumpangKapalTerbaru, WILKER_PELABUHAN } from '@/lib/db/modul/inputPenumpangKapal';
import FormInputPenumpangKapal from '@/components/lalu-lintas/FormInputPenumpangKapal';

export const dynamic = 'force-dynamic';

export default async function InputPenumpangKapalPage() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) {
    redirect('/lalu-lintas-orang');
  }

  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
  const terbaru = await getPenumpangKapalTerbaru(10);

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/lalu-lintas-orang" className="text-sm text-[#0F4C5C] underline">
            &larr; Kembali ke Lalu Lintas Orang
          </Link>
          <h1 className="mt-2 text-xl font-bold text-[#0F2A38]">Input Data Penumpang Kapal</h1>
          <p className="text-sm text-gray-500">Kedatangan dan keberangkatan kapal di pelabuhan wilayah kerja.</p>
        </div>

        <FormInputPenumpangKapal
          wilker={WILKER_PELABUHAN.map((w) => ({ kode: w.kode, nama: w.nama }))}
          hariIni={hariIni}
        />

        <div className="rounded-[10px] bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-[#0F2A38]">10 Data Terakhir</h2>
          {terbaru.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">Tiba</th>
                    <th className="py-2 pr-3">Wilker</th>
                    <th className="py-2 pr-3">Kapal</th>
                    <th className="py-2 pr-3 text-right">ABK D/B</th>
                    <th className="py-2 text-right">Penumpang D/B</th>
                  </tr>
                </thead>
                <tbody>
                  {terbaru.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100">
                      <td className="py-2 pr-3 whitespace-nowrap">{b.tanggal_tiba}</td>
                      <td className="py-2 pr-3">{b.wilker}</td>
                      <td className="py-2 pr-3">{b.nama_kapal ?? '-'}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">{b.abk_datang} / {b.abk_berangkat}</td>
                      <td className="py-2 text-right whitespace-nowrap">{b.penumpang_datang} / {b.penumpang_berangkat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">D = datang, B = berangkat.</p>
        </div>
      </div>
    </div>
  );
}
