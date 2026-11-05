import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getPenumpangKapalTerbaru, getWilkerPelabuhan } from '@/lib/db/modul/inputPenumpangKapal';
import { getDaftarKapal } from '@/lib/db/modul/kapal';
import FormInputPenumpangKapal from '@/components/lalu-lintas/FormInputPenumpangKapal';

export const dynamic = 'force-dynamic';

export default async function InputPenumpangKapalPage({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string }>;
}) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) {
    redirect('/lalu-lintas-orang');
  }

  const { jenis: jenisParam } = await searchParams;
  const jenis: 'datang' | 'berangkat' = jenisParam === 'berangkat' ? 'berangkat' : 'datang';

  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
  const [terbaru, daftarKapal, wilkerPelabuhan] = await Promise.all([getPenumpangKapalTerbaru(10), getDaftarKapal(), getWilkerPelabuhan()]);

  const tab = (j: 'datang' | 'berangkat', label: string) => (
    <Link
      href={`?jenis=${j}`}
      replace
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        jenis === j ? 'bg-[#0F2A38] text-white' : 'bg-white text-[#0F2A38] hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  );

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

        <div className="flex gap-2">
          {tab('datang', 'Kedatangan')}
          {tab('berangkat', 'Keberangkatan')}
        </div>

        <FormInputPenumpangKapal
          key={jenis}
          jenis={jenis}
          wilker={wilkerPelabuhan.map((w) => ({ kode: w.kode, nama: w.nama }))}
          daftarKapal={daftarKapal}
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
                    <th className="py-2 pr-3">Tanggal</th>
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