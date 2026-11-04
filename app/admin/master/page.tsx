import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getPoliklinikNonBkk } from '@/lib/db/queries/queriesMaster';
import { aksiTambahPoliklinikNonBkk, aksiSetAktif } from '@/app/actions/master';
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';

export const dynamic = 'force-dynamic';

const kotak = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

export default async function MasterPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  if ((await getUserRole()) !== 'admin') redirect('/dashboard');
  const { error, ok } = await searchParams;
  const daftar = await getPoliklinikNonBkk(false);
  const namaWilker = (kode: string | null) => WILAYAH_KERJA.find((w) => w.kode === kode)?.nama ?? '-';

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0F2A38]">Data Master: Poliklinik Non-BKK</h1>
        <Link href="/admin/users" className="text-sm text-[#0F4C5C] underline">Kelola pengguna</Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">Poliklinik ditambahkan.</div>}

      <form action={aksiTambahPoliklinikNonBkk} className="grid grid-cols-1 gap-4 rounded-[10px] bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="nama">Nama poliklinik *</label>
          <input id="nama" name="nama" required maxLength={150} className={kotak} />
        </div>
        <div>
          <label className={label} htmlFor="kode_wilker">Wilayah kerja BKK *</label>
          <select id="kode_wilker" name="kode_wilker" required defaultValue="" className={kotak}>
            <option value="" disabled>Pilih wilayah kerja</option>
            {WILAYAH_KERJA.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="kabupaten_kota">Kabupaten/Kota</label>
          <input id="kabupaten_kota" name="kabupaten_kota" maxLength={100} className={kotak} />
        </div>
        <div>
          <label className={label} htmlFor="telepon">Telepon</label>
          <input id="telepon" name="telepon" maxLength={30} className={kotak} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="alamat">Alamat</label>
          <input id="alamat" name="alamat" maxLength={300} className={kotak} />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90">
            Tambah Poliklinik
          </button>
        </div>
      </form>

      <div className="rounded-[10px] bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-[#0F2A38]">Terdaftar ({daftar.length})</h2>
        {daftar.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada poliklinik.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr><th className="py-2">Nama</th><th className="py-2">Wilker</th><th className="py-2">Kab/Kota</th><th className="py-2">Status</th><th /></tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="py-2 pr-3 font-medium">{p.nama}</td>
                  <td className="py-2 pr-3">{namaWilker(p.kode_wilker)}</td>
                  <td className="py-2 pr-3">{p.kabupaten_kota ?? '-'}</td>
                  <td className="py-2 pr-3">{p.aktif ? 'Aktif' : 'Nonaktif'}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <Link href={`/admin/master/${p.id}`} className="mr-3 text-xs text-[#0F4C5C] underline">Edit</Link>
                    <form action={aksiSetAktif.bind(null, 'poliklinik_non_bkk', p.id, !p.aktif)} className="inline">
                      <button className="text-xs text-[#0F4C5C] underline">{p.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}