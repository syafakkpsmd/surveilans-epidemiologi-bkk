// Input Data Pesawat: satu per satu atau unggah Excel. HANYA Petugas/Admin.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { WILKER_BANDARA, getPesawatTerbaru, naikkanRencanaKeFinal } from '@/lib/db/modul/inputPesawat';
import PanelInputPesawat from '@/components/input-data/PanelInputPesawat';

export const dynamic = 'force-dynamic';

export default async function InputPesawatPage() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard');

  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
  // Data rencana yang tanggalnya sudah tiba otomatis menjadi final saat halaman ini dibuka.
  await naikkanRencanaKeFinal(hariIni).catch((e) => console.error('[input-pesawat] gagal menaikkan rencana:', e));
  const terbaru = await getPesawatTerbaru(10);

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link href="/dashboard/input-data" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke Input Data</Link>
          <h1 className="mt-2 text-xl font-bold text-[#0F2A38]">Input Data Pesawat</h1>
          <p className="text-sm text-gray-500">Wilayah kerja: {WILKER_BANDARA[0].nama}</p>
        </div>

        <PanelInputPesawat hariIni={hariIni} />

        <div className="rounded-[10px] bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-[#0F2A38]">10 Data Terakhir Masuk</h2>
          {terbaru.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">Tanggal</th>
                    <th className="py-2 pr-3">Maskapai</th>
                    <th className="py-2 pr-3">Tujuan</th>
                    <th className="py-2 pr-3">Asal</th>
                    <th className="py-2 pr-3 text-right">Crew B/D</th>
                    <th className="py-2 pr-3 text-right">Penumpang B/D</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {terbaru.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100">
                      <td className="whitespace-nowrap py-2 pr-3">{b.tanggal}</td>
                      <td className="py-2 pr-3">{b.maskapai}</td>
                      <td className="py-2 pr-3">{b.keberangkatan ?? '-'}</td>
                      <td className="py-2 pr-3">{b.kedatangan ?? '-'}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">{b.crew_berangkat} / {b.crew_datang}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">{b.penumpang_berangkat} / {b.penumpang_datang}</td>
                      <td className="py-2">
                        {b.status_data === 'rencana' ? <span className="text-amber-700">Rencana</span> : 'Final'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">B = berangkat, D = datang. Belum ada fitur ubah/hapus; hubungi admin bila ada salah input.</p>
        </div>
      </div>
    </div>
  );
}
