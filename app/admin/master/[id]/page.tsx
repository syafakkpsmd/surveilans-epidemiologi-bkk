import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getPoliklinikNonBkkById } from '@/lib/db/queries/queriesMaster';
import { aksiUbahPoliklinikNonBkk } from '@/app/actions/master';
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';

export const dynamic = 'force-dynamic';

const kotak = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

export default async function EditPoliklinikPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  if ((await getUserRole()) !== 'admin') redirect('/dashboard');
  const { id } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await getPoliklinikNonBkkById(id);
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/admin/master" className="text-sm text-[#0F4C5C] underline">&larr; Kembali</Link>
        <h1 className="mt-2 text-xl font-bold text-[#0F2A38]">Edit Poliklinik</h1>
      </div>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form action={aksiUbahPoliklinikNonBkk} className="grid grid-cols-1 gap-4 rounded-[10px] bg-white p-6 shadow-sm sm:grid-cols-2">
        <input type="hidden" name="id" value={p.id} />
        <div>
          <label className={label} htmlFor="nama">Nama poliklinik *</label>
          <input id="nama" name="nama" required maxLength={150} defaultValue={p.nama} className={kotak} />
        </div>
        <div>
          <label className={label} htmlFor="kode_wilker">Wilayah kerja BKK *</label>
          <select id="kode_wilker" name="kode_wilker" required defaultValue={p.kode_wilker ?? ''} className={kotak}>
            <option value="" disabled>Pilih wilayah kerja</option>
            {WILAYAH_KERJA.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="kabupaten_kota">Kabupaten/Kota</label>
          <input id="kabupaten_kota" name="kabupaten_kota" maxLength={100} defaultValue={p.kabupaten_kota ?? ''} className={kotak} />
        </div>
        <div>
          <label className={label} htmlFor="telepon">Telepon</label>
          <input id="telepon" name="telepon" maxLength={30} defaultValue={p.telepon ?? ''} className={kotak} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="alamat">Alamat</label>
          <input id="alamat" name="alamat" maxLength={300} defaultValue={p.alamat ?? ''} className={kotak} />
        </div>
        <div className="sm:col-span-2">
          <button className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90">
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}