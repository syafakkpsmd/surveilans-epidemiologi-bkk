// app/(dashboard)/dashboard/pengaturan-wilayah-kerja/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getDaftarWilker, getPetaModulWilker } from '@/lib/wilayah-kerja/server';
import { MODUL_WILKER } from '@/lib/wilayah-kerja/modul';
import { DAFTAR_JENIS_WILKER, type Wilayah } from '@/lib/wilayah-kerja';
import {
  tambahWilayahKerja,
  perbaruiWilayahKerja,
  setAktifWilayahKerja,
  simpanModulWilayahKerja,
  tambahAliasWilayahKerja,
  hapusAliasWilayahKerja,
} from './actions';

export const dynamic = 'force-dynamic';

const kotak = 'w-full rounded-control border border-border px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-muted';
const tombol = 'rounded-control bg-teal px-3 py-2 text-sm font-semibold text-white hover:opacity-90';
const tombolSekunder = 'rounded-control border border-border px-3 py-2 text-sm font-semibold text-ink hover:bg-black/5';

function Isian({ w }: { w?: Wilayah }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={label}>Nama resmi *</label>
        <input name="nama" required minLength={3} maxLength={120} defaultValue={w?.nama} placeholder="mis. Pelabuhan Balikpapan" className={kotak} />
      </div>
      <div>
        <label className={label}>Nama pendek * <span className="font-normal">(dipakai di tabel/grafik)</span></label>
        <input name="nama_pendek" required minLength={2} maxLength={60} defaultValue={w?.namaPendek} placeholder="mis. Balikpapan" className={kotak} />
      </div>
      <div>
        <label className={label}>Label di peta <span className="font-normal">(kosong = nama pendek)</span></label>
        <input name="nama_peta" maxLength={60} defaultValue={w && w.namaPeta !== w.namaPendek ? w.namaPeta : ''} className={kotak} />
      </div>
      <div>
        <label className={label}>Jenis *</label>
        <select name="jenis" required defaultValue={w?.jenis ?? 'Pelabuhan'} className={kotak}>
          {DAFTAR_JENIS_WILKER.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>Warna (opsional)</label>
        <input name="warna" maxLength={7} defaultValue={w?.warna ?? ''} placeholder="#0F4C5C" className={kotak} />
      </div>
      <div>
        <label className={label}>Lintang (lat) *</label>
        <input name="lat" required inputMode="decimal" defaultValue={w?.lat ?? ''} placeholder="-0.5244" className={kotak} />
      </div>
      <div>
        <label className={label}>Bujur (lng) *</label>
        <input name="lng" required inputMode="decimal" defaultValue={w?.lng ?? ''} placeholder="117.1711" className={kotak} />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Sub-lokasi / pelabuhan di dalam wilayah <span className="font-normal">(satu per baris)</span></label>
        <textarea name="sub_lokasi" rows={3} defaultValue={w?.subLokasi.join('\n') ?? ''} className={kotak} />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Catatan</label>
        <input name="catatan" maxLength={300} defaultValue={w?.catatan ?? ''} className={kotak} />
      </div>
    </div>
  );
}

export default async function PengaturanWilayahKerjaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  if ((await getUserRole()) !== 'admin') redirect('/dashboard');
  const { error, ok } = await searchParams;
  const [daftar, petaModul] = await Promise.all([getDaftarWilker(), getPetaModulWilker()]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <Link href="/dashboard" className="mb-2 inline-block text-sm font-medium text-teal hover:underline">
          ← Kembali ke Dashboard
        </Link>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Khusus Admin</p>
        <h1 className="text-2xl font-bold text-ink">Kelola Wilayah Kerja</h1>
        <p className="mt-1 text-sm text-muted">
          Daftar ini dipakai seluruh aplikasi (input data, filter, peta, status laporan). Wilayah yang dinonaktifkan hilang
          dari pilihan input, tetapi data lamanya tetap tampil. Kode (WKxx) dibuat otomatis dan tidak bisa diubah.
        </p>
      </div>

      {error && <div className="rounded-card bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-card bg-green-50 p-3 text-sm text-green-700">Perubahan disimpan.</div>}

      <section className="space-y-4 rounded-card border border-border bg-surface p-5">
        <h2 className="text-base font-bold text-ink">Wilayah kerja saat ini ({daftar.length})</h2>
        {daftar.map((w) => (
          <details key={w.kode} className="rounded-control border border-border">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="mr-2 rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">{w.kode}</span>
                <span className="font-semibold text-ink">{w.nama}</span>
                <span className="ml-2 text-xs text-muted">{w.jenis}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${w.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                {w.aktif ? 'Aktif' : 'Nonaktif'}
              </span>
            </summary>

            <div className="space-y-4 border-t border-border p-3">
              <form action={perbaruiWilayahKerja} className="space-y-3">
                <input type="hidden" name="kode" value={w.kode} />
                <Isian w={w} />
                <div className="grid grid-cols-2 gap-3 sm:w-1/2">
                  <div>
                    <label className={label}>Urutan</label>
                    <input name="urutan" type="number" defaultValue={w.urutan} className={kotak} />
                  </div>
                </div>
                <button type="submit" className={tombol}>Simpan perubahan</button>
              </form>

              <form action={simpanModulWilayahKerja} className="space-y-2 border-t border-border pt-3">
                <input type="hidden" name="kode" value={w.kode} />
                <p className="text-xs font-semibold text-muted">
                  Modul yang berlaku di wilayah ini (menentukan kolom/baris di tabel modul dan kewajiban lapor di Status Laporan)
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                  {MODUL_WILKER.map((m) => (
                    <label key={m.kunci} className="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" name="modul" value={m.kunci} defaultChecked={petaModul[m.kunci].includes(w.kode)} />
                      {m.label}
                    </label>
                  ))}
                </div>
                <button type="submit" className={tombolSekunder}>Simpan modul</button>
              </form>

              <form action={setAktifWilayahKerja} className="border-t border-border pt-3">
                <input type="hidden" name="kode" value={w.kode} />
                <input type="hidden" name="aktif" value={String(!w.aktif)} />
                <button type="submit" className={tombolSekunder}>{w.aktif ? 'Nonaktifkan' : 'Aktifkan kembali'}</button>
              </form>

              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted">
                  Penulisan lain di data lama (alias) — dipakai saat mengimpor Excel atau membaca data lama
                </p>
                <div className="flex flex-wrap gap-2">
                  {w.alias.length === 0 && <span className="text-xs text-muted">Belum ada alias.</span>}
                  {w.alias.map((a) => (
                    <form key={a} action={hapusAliasWilayahKerja} className="flex items-center gap-1 rounded-full bg-black/5 py-0.5 pl-3 pr-1 text-xs">
                      <input type="hidden" name="alias" value={a} />
                      <span>{a}</span>
                      <button type="submit" aria-label={`Hapus alias ${a}`} className="rounded-full px-1.5 text-muted hover:text-red-600">×</button>
                    </form>
                  ))}
                </div>
                <form action={tambahAliasWilayahKerja} className="flex gap-2">
                  <input type="hidden" name="kode" value={w.kode} />
                  <input name="alias" required minLength={2} maxLength={120} placeholder="mis. Tg. Santan" className={kotak} />
                  <button type="submit" className={tombolSekunder}>Tambah</button>
                </form>
              </div>
            </div>
          </details>
        ))}
      </section>

      <section className="space-y-3 rounded-card border border-border bg-surface p-5">
        <h2 className="text-base font-bold text-ink">Tambah wilayah kerja baru</h2>
        <form action={tambahWilayahKerja} className="space-y-3">
          <Isian />
          <button type="submit" className={tombol}>Tambah wilayah kerja</button>
        </form>
      </section>
    </div>
  );
}
