// app/(dashboard)/dashboard/pengaturan-pemantauan-laporan/page.tsx
// KHUSUS ADMIN: menentukan modul mana yang masuk laporan mingguan, bulanan, atau siklus (target per tahun).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/get-user-role';
import { KATALOG, LABEL_PERIODE, periodeBoleh } from '@/lib/pemantauan-laporan/katalog';
import { bacaKonfigurasi } from '@/lib/pemantauan-laporan/server';
import { simpanPengaturanPemantauan } from './actions';

export const dynamic = 'force-dynamic';

const kotak = 'w-full rounded-control border border-border px-2 py-1.5 text-sm';
const tombol = 'rounded-control bg-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90';

export default async function PengaturanPemantauanLaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  if ((await getUserRole()) !== 'admin') redirect('/dashboard');
  const { error, ok } = await searchParams;
  const { konfig, tabelAda } = await bacaKonfigurasi();
  const perKunci = new Map(konfig.map((c) => [c.kunci, c]));
  const kelompok = [...new Set(KATALOG.map((k) => k.kelompok))];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-ink">Pengaturan Pemantauan Laporan</h1>
        <p className="text-sm text-muted">
          Tentukan modul mana yang dipantau sebagai laporan <strong>mingguan</strong>, <strong>bulanan</strong>, atau{' '}
          <strong>siklus</strong> (kegiatan bertarget per tahun), lalu isi target kegiatannya. Hasilnya dipakai di{' '}
          <Link href="/dashboard/ketepatan-laporan" className="font-semibold text-teal hover:underline">
            Ketepatan &amp; Kelengkapan Laporan
          </Link>
          . Wilayah yang wajib melapor per modul diatur di Pengaturan Wilker.
        </p>
      </header>

      {error && <div className="rounded-card bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-card bg-green-50 p-3 text-sm text-green-700">Pengaturan disimpan.</div>}
      {!tabelAda && (
        <div className="rounded-card bg-amber-50 p-3 text-sm text-amber-800">
          Tabel kegiatan_laporan belum ada. Jalankan scripts/migrate/26_kegiatan_laporan.sql dulu, baru simpan pengaturan.
        </div>
      )}

      <div className="rounded-card border border-border bg-white p-4 text-sm text-ink">
        <p className="font-semibold">Cara mengisi target siklus</p>
        <p className="mt-1 text-muted">
          Pilih &quot;Siklus&quot;, lalu isi <em>Target per tahun</em> dan <em>Interval</em>. Contoh kegiatan 6 kali setahun dengan jarak 40 hari
          kerja: target 6, interval 40, hari kerja. Tahun dibagi menjadi 6 siklus berurutan mulai dari <em>Awal siklus</em> (BB-HH); siklus
          terpenuhi bila ada kegiatan di dalamnya, dan batas input = akhir siklus + <em>Tenggang input</em>. Kolom target hanya dipakai bila
          periode = Siklus.
        </p>
      </div>

      <form action={simpanPengaturanPemantauan} className="space-y-6">
        {kelompok.map((nama) => (
          <section key={nama} className="overflow-x-auto rounded-card border border-border bg-white">
            <h2 className="border-b border-border px-4 py-2 text-sm font-semibold text-ink">{nama}</h2>
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted">
                  <th className="px-4 py-2">Kegiatan</th>
                  <th className="px-2 py-2">Dipantau sebagai</th>
                  <th className="px-2 py-2">Target per tahun</th>
                  <th className="px-2 py-2">Interval</th>
                  <th className="px-2 py-2">Satuan interval</th>
                  <th className="px-2 py-2">Awal siklus (BB-HH)</th>
                  <th className="px-2 py-2">Tenggang input (hari)</th>
                </tr>
              </thead>
              <tbody>
                {KATALOG.filter((k) => k.kelompok === nama).map((k) => {
                  const c = perKunci.get(k.kunci)!;
                  const bisaSiklus = periodeBoleh(k).includes('SIKLUS');
                  return (
                    <tr key={k.kunci} className="border-t border-border">
                      <td className="px-4 py-2 font-medium text-ink">
                        {k.label}
                        {k.sumber.epid && <div className="text-[11px] font-normal text-muted">Berbasis minggu epidemiologi: hanya mingguan</div>}
                      </td>
                      <td className="px-2 py-2">
                        <select name={`periode__${k.kunci}`} defaultValue={c.periode} className={kotak}>
                          {periodeBoleh(k).map((p) => (
                            <option key={p} value={p}>
                              {LABEL_PERIODE[p]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input name={`target__${k.kunci}`} type="number" min={1} max={60} defaultValue={c.targetPerTahun ?? ''} disabled={!bisaSiklus} className={kotak} />
                      </td>
                      <td className="px-2 py-2">
                        <input name={`interval__${k.kunci}`} type="number" min={1} max={366} defaultValue={c.intervalHari ?? ''} disabled={!bisaSiklus} className={kotak} />
                      </td>
                      <td className="px-2 py-2">
                        <select name={`hk__${k.kunci}`} defaultValue={c.hariKerja ? 'kerja' : 'kalender'} disabled={!bisaSiklus} className={kotak}>
                          <option value="kerja">Hari kerja (Sen-Jum)</option>
                          <option value="kalender">Hari kalender</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input name={`mulai__${k.kunci}`} defaultValue={c.mulaiSiklus} maxLength={5} pattern="\d{2}-\d{2}" disabled={!bisaSiklus} className={kotak} />
                      </td>
                      <td className="px-2 py-2">
                        <input name={`tenggang__${k.kunci}`} type="number" min={0} max={60} defaultValue={c.tenggangHari} disabled={!bisaSiklus} className={kotak} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
        <button type="submit" className={tombol}>
          Simpan pengaturan
        </button>
      </form>
    </div>
  );
}
