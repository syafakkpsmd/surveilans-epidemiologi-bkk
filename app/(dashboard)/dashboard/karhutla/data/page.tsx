import TabelDataKarhutla from '@/components/karhutla/TabelDataKarhutla';
import { ambilTabelIspa, ambilTabelKualitasUdara } from '@/lib/supabase/queries-karhutla-server';

export const dynamic = 'force-dynamic'; // data harian, jangan di-cache statis

export default async function HalamanDataKarhutla() {
  const [dataIspa, dataUdara] = await Promise.all([
    ambilTabelIspa(90),
    ambilTabelKualitasUdara(90),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Data Karhutla &amp; ISPA</h1>
        <p className="text-sm text-gray-500">
          Tabel lengkap data kasus ISPA dan parameter kualitas udara (90 hari terakhir)
        </p>
      </div>

      <TabelDataKarhutla dataIspa={dataIspa} dataUdara={dataUdara} />
    </div>
  );
}