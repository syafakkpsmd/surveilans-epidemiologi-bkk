import Link from 'next/link';
import TabelDataKarhutla from '@/components/karhutla/TabelDataKarhutla';
import TabelHotspotHarian from '@/components/karhutla/TabelHotspotHarian';
import { ambilTabelIspa, ambilTabelKualitasUdara, ambilTabelHotspot } from '@/lib/supabase/queries-karhutla-server';

export const dynamic = 'force-dynamic';

export default async function HalamanDataKarhutla() {
  const [dataIspa, dataUdara, dataHotspot] = await Promise.all([
    ambilTabelIspa(90),
    ambilTabelKualitasUdara(90),
    ambilTabelHotspot(90),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Karhutla &amp; ISPA</h1>
          <p className="text-sm text-gray-500">
            Tabel lengkap data kasus ISPA dan parameter kualitas udara (90 hari terakhir)
          </p>
        </div>

        <Link
          href="/dashboard/karhutla"
          className="text-sm font-medium text-teal hover:underline whitespace-nowrap"
        >
          ← Kembali ke Dashboard Karhutla
        </Link>
      </div>

      <TabelDataKarhutla dataIspa={dataIspa} dataUdara={dataUdara} />

      <TabelHotspotHarian data={dataHotspot} />
    </div>
  );
}