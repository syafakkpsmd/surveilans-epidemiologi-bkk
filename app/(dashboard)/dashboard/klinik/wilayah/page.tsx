// app/(dashboard)/dashboard/klinik/wilayah/page.tsx
// Rekap klinik binaan per wilayah kerja BKK: jumlah klinik, layanan ICV, dan status pengawasan terbaru.
import Link from 'next/link';
import { getDbClient } from '@/lib/db/client';
import { getDatasetKlinik } from '@/lib/klinik/dataset';
import { getAksesKlinik, opsiDariAkses } from '@/lib/klinik/akses';
import { rekapKlinikPerWilayah, type BarisRekapWilayah } from '@/lib/klinik/rekapWilayah';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';

export const dynamic = 'force-dynamic';

type BarisKlinik = { id: string; nama_klinik: string; kode_wilker: string | null };

async function ambilKlinik(): Promise<{ klinik: BarisKlinik[]; kolomAda: boolean }> {
  const db = getDbClient();
  try {
    const { rows } = await db.execute(
      `SELECT id::text AS id, nama_klinik, kode_wilker FROM klinik_binaan WHERE COALESCE(kategori, 'klinik') = 'klinik' ORDER BY nama_klinik`
    );
    return { klinik: rows as unknown as BarisKlinik[], kolomAda: true };
  } catch (e: unknown) {
    // 42703 = kolom kode_wilker belum ada (migrasi 24 belum dijalankan): semua klinik dianggap belum dikaitkan.
    if ((e as { code?: string })?.code !== '42703') throw e;
    const { rows } = await db.execute(
      `SELECT id::text AS id, nama_klinik FROM klinik_binaan WHERE COALESCE(kategori, 'klinik') = 'klinik' ORDER BY nama_klinik`
    );
    return { klinik: (rows as unknown as { id: string; nama_klinik: string }[]).map((r) => ({ ...r, kode_wilker: null })), kolomAda: false };
  }
}

const angka = (n: number) => n.toLocaleString('id-ID');

function Baris({ b, tebal }: { b: BarisRekapWilayah; tebal?: boolean }) {
  const sel = 'px-3 py-2 text-right tabular-nums';
  return (
    <tr className={tebal ? 'bg-black/5 font-semibold' : 'border-t border-border'}>
      <td className="px-3 py-2 text-left">
        {b.nama}
        {!tebal && b.namaKlinik.length > 0 && (
          <details className="mt-1 text-xs font-normal text-muted">
            <summary className="cursor-pointer">Lihat klinik</summary>
            <ul className="ml-4 list-disc">
              {b.namaKlinik.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
        )}
      </td>
      <td className={sel}>{angka(b.jumlahKlinik)}</td>
      <td className={sel}>{angka(b.totalLayananIcv)}</td>
      <td className={sel}>{angka(b.sudahDiawasi)}</td>
      <td className={sel}>{angka(b.belumDiawasi)}</td>
      <td className={sel}>{angka(b.memenuhi)}</td>
      <td className={sel}>{angka(b.perluPerbaikan)}</td>
      <td className={sel}>{angka(b.tidakMemenuhi)}</td>
      <td className={sel}>{b.persenMemenuhi === null ? '—' : `${b.persenMemenuhi}%`}</td>
    </tr>
  );
}

export default async function RekapKlinikPerWilayahPage() {
  const akses = await getAksesKlinik();
  const [{ klinik: semuaKlinik, kolomAda }, kamus, dataset, statusRows] = await Promise.all([
    ambilKlinik(),
    getKamusWilker(),
    getDatasetKlinik(opsiDariAkses(akses)),
    getDbClient().execute(
      `SELECT DISTINCT ON (klinik_id) klinik_id::text AS klinik_id, status_kepatuhan
         FROM pengawasan_klinik ORDER BY klinik_id, tanggal_kegiatan DESC`
    ),
  ]);

  // Peran terbatas (petugas klinik) hanya melihat klinik yang ditautkan ke akunnya.
  const klinik = semuaKlinik.filter((k) => akses.semua || akses.klinikIds.includes(k.id));
  const layananPerKlinik = new Map<string, number>(dataset.map((d) => [String(d.klinik.id), d.icv.length]));
  const statusTerbaru = new Map<string, string | null>(
    (statusRows.rows as unknown as { klinik_id: string; status_kepatuhan: string | null }[]).map((r) => [r.klinik_id, r.status_kepatuhan])
  );

  // Wilayah yang tampil: aktif (bukan kantor induk) + wilayah nonaktif yang masih dipakai klinik.
  const dipakai = new Set(klinik.map((k) => k.kode_wilker).filter(Boolean));
  const wilayah = kamus.semua
    .filter((w) => w.jenis !== 'Kantor' && (w.aktif || dipakai.has(w.kode)))
    .map((w) => ({ kode: w.kode, nama: w.nama }));

  const { baris, total } = rekapKlinikPerWilayah({ klinik, wilayah, layananPerKlinik, statusTerbaru });
  const belumDikaitkan = baris.find((b) => b.kode === null)?.jumlahKlinik ?? 0;
  const th = 'px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted';

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <div>
        <Link href="/dashboard/klinik" className="mb-2 inline-block text-sm font-medium text-teal hover:underline">
          ← Klinik Binaan
        </Link>
        <h1 className="text-2xl font-bold text-ink">Klinik Binaan per Wilayah Kerja</h1>
        <p className="mt-1 text-sm text-muted">
          Jumlah klinik, layanan ICV, dan status pengawasan terbaru, dikelompokkan menurut wilayah kerja BKK.
          Klinik dikaitkan ke wilayah di halaman{' '}
          <Link href="/dashboard/pengawasan-klinik/klinik" className="text-teal underline">Kelola Klinik</Link>.
        </p>
      </div>

      {!kolomAda && (
        <div className="rounded-card bg-amber-50 p-3 text-sm text-amber-800">
          Kolom wilayah kerja untuk klinik belum ada di database. Jalankan migrasi <code>24_vektor_sub_lokasi_dan_klinik_wilker.sql</code>.
        </div>
      )}
      {kolomAda && belumDikaitkan > 0 && (
        <div className="rounded-card bg-amber-50 p-3 text-sm text-amber-800">
          {belumDikaitkan} klinik belum dikaitkan ke wilayah kerja. Pilih wilayah kerja pada form klinik di Kelola Klinik agar tercatat di sini.
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">Wilayah kerja</th>
              <th className={th}>Klinik</th>
              <th className={th}>Layanan ICV</th>
              <th className={th}>Sudah diawasi</th>
              <th className={th}>Belum diawasi</th>
              <th className={th}>Memenuhi</th>
              <th className={th}>Perlu perbaikan</th>
              <th className={th}>Tidak memenuhi</th>
              <th className={th}>% memenuhi</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <Baris key={b.kode ?? 'tanpa'} b={b} />
            ))}
            <Baris b={total} tebal />
          </tbody>
        </table>
      </div>
    </div>
  );
}
