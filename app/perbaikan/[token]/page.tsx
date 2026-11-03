import { notFound } from 'next/navigation';
import {
  pengawasanIdDariToken,
  itemTidakSesuai,
  ambilPerbaikan,
} from '@/lib/pengawasan-klinik/perbaikan';
import FormPerbaikan from './FormPerbaikan';
import { createDbClient } from '@/lib/db/server';

export const dynamic = 'force-dynamic';

export default async function HalamanPerbaikan({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pid = await pengawasanIdDariToken(token);
  if (!pid) notFound();

  const info = await itemTidakSesuai(pid);
  if (!info) notFound();

  const supabase = await createDbClient();
  const { data: klinik } = await supabase
    .from('klinik_binaan')
    .select('nama_klinik')
    .eq('id', info.pengawasan.klinik_id)
    .maybeSingle();

  const dataAwal = await ambilPerbaikan(pid);
  const tgl = String(info.pengawasan.tanggal_kegiatan ?? '').slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <p className="text-xs text-gray-500">Balai Kekarantinaan Kesehatan Kelas I Samarinda</p>
        <h1 className="mt-1 text-lg font-bold">Dokumentasi Perbaikan</h1>
        <p className="text-sm text-gray-700">{klinik?.nama_klinik}</p>
        <p className="text-xs text-gray-500">Pengawasan tanggal {tgl}</p>
        <p className="mt-3 text-sm text-gray-600">
          Berikut item yang belum memenuhi syarat. Silakan isi apa yang sudah disediakan dan unggah foto buktinya.
        </p>
      </div>

      {info.items.length === 0 ? (
        <p className="rounded-xl border bg-white p-5 text-sm text-gray-500">Tidak ada item yang perlu diperbaiki.</p>
      ) : (
        <FormPerbaikan
          token={token}
          items={info.items.map((i) => ({ key: i.key, label: i.label, kategori: i.kategori }))}
          dataAwal={dataAwal}
        />
      )}
    </div>
  );
}