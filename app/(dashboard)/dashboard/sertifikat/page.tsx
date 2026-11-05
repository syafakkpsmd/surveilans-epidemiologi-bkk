import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getRingkasanSertifikat, type JenisSertifikat } from '@/lib/db/modul/sertifikatRingkasan';
import { PITA_GT, KODE_TANPA_GT, hitungPerPita } from '@/lib/sertifikat/gt';

export const dynamic = 'force-dynamic';

const PERAN_BOLEH = ['admin', 'petugas', 'petugas_klinik'];

// SESUAIKAN dengan alamat halaman yang ada di menu Data
const TAUTAN: Record<JenisSertifikat | 'input', string> = {
  sscec: '/dashboard/sertifikat/sscec',
  p3k: '/dashboard/sertifikat/p3k',
  air: '/dashboard/sertifikat/air',
  buku: '/dashboard/sertifikat/buku',
  input: '/dashboard/input-data', // sesuaikan dengan alamat halaman Input Data Anda
};
const JENIS: { kode: JenisSertifikat; nama: string; ikon: string; deskripsi: string }[] = [
  { kode: 'sscec', nama: 'SSCEC', ikon: '📄', deskripsi: 'Ship Sanitation Control Exemption Certificate' },
  { kode: 'p3k', nama: 'P3K Kapal', ikon: '🩹', deskripsi: 'Sertifikat obat dan P3K kapal' },
  { kode: 'buku', nama: 'Buku Kesehatan', ikon: '📘', deskripsi: 'Buku Kesehatan Kapal (Health Book)' },
  { kode: 'air', nama: 'Sertifikat Air', ikon: '💧', deskripsi: 'Pemeriksaan sampel air' },
];

const rupiah = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

export default async function DashboardSertifikat({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const role = await getUserRole();
  if (role === 'tamu') redirect('/login');
  if (!PERAN_BOLEH.includes(role)) redirect('/dashboard');

  const { tahun: t } = await searchParams;
  const tahunIni = new Date().getFullYear();
  const parsed = t ? parseInt(t, 10) : tahunIni;
  const tahun = Number.isInteger(parsed) && parsed >= 2020 && parsed <= tahunIni + 1 ? parsed : tahunIni;

  const hasil = await Promise.all(JENIS.map((j) => getRingkasanSertifikat(j.kode, tahun)));
  const ringkas = Object.fromEntries(JENIS.map((j, i) => [j.kode, hasil[i]])) as Record<
    JenisSertifikat,
    (typeof hasil)[number]
  >;
  const perPita = {
    sscec: hitungPerPita(ringkas.sscec.perGt),
    p3k: hitungPerPita(ringkas.p3k.perGt),
    buku: hitungPerPita(ringkas.buku.perGt),
  };
  const kolomGt: { kode: 'sscec' | 'p3k' | 'buku'; nama: string }[] = [
    { kode: 'sscec', nama: 'SSCEC' },
    { kode: 'p3k', nama: 'P3K Kapal' },
    { kode: 'buku', nama: 'Buku Kesehatan' },
  ];
  const baris = [
    ...PITA_GT.map((p) => ({ kode: p.kode, label: p.label })),
    { kode: KODE_TANPA_GT, label: 'GT belum diisi' },
  ].filter((b) => kolomGt.some((k) => perPita[k.kode][b.kode] > 0) || b.kode !== KODE_TANPA_GT);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-teal-900">Sertifikat dan Dokumen Kapal</h1>
          <p className="text-sm text-gray-500">
            Dokumen terbit tahun {tahun}, dikelompokkan menurut Gross Tonnage (GT) sesuai PP No. 64 Tahun 2019.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={TAUTAN.input} className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            + Input Data
          </Link>
          {[tahunIni, tahunIni - 1, tahunIni - 2].map((th) => (
            <Link
              key={th}
              href={`/dashboard/sertifikat?tahun=${th}`}
              className={`rounded border px-3 py-1.5 text-sm ${th === tahun ? 'bg-teal-700 text-white' : 'hover:bg-gray-50'}`}
            >
              {th}
            </Link>
          ))}
        </div>
      </div>

      {/* Tombol ke tiap halaman sertifikat */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {JENIS.map((j) => {
          const r = ringkas[j.kode];
          return (
            <Link
              key={j.kode}
              href={TAUTAN[j.kode]}
              className="rounded-xl border-t-4 border-teal-700 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-2 text-2xl">{j.ikon}</div>
              <h2 className="font-semibold text-[#0F2A38]">{j.nama}</h2>
              <p className="mt-1 text-xs text-gray-500">{j.deskripsi}</p>
              <p className="mt-3 text-2xl font-semibold text-teal-800">{r.total.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-500">dokumen terbit {tahun}</p>
              {r.jumlahBayar > 0 && (
                <p className="mt-1 text-xs text-gray-500">Tercatat dibayar: {rupiah(r.jumlahBayar)}</p>
              )}
            </Link>
          );
        })}
      </div>

      {/* Matriks GT */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-1 font-medium text-teal-900">Jumlah Dokumen per Kelompok GT</h2>
        <p className="mb-3 text-xs text-gray-500">
          Sertifikat Air tidak dikelompokkan menurut GT karena bukan dokumen kapal.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 pr-4">Kelompok GT</th>
                {kolomGt.map((k) => (
                  <th key={k.kode} className="py-2 pr-4 text-right">{k.nama}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.kode} className="border-t border-gray-100">
                  <td className="py-2 pr-4">{b.label}</td>
                  {kolomGt.map((k) => (
                    <td key={k.kode} className="py-2 pr-4 text-right tabular-nums">
                      {perPita[k.kode][b.kode] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 font-semibold">
                <td className="py-2 pr-4">Total</td>
                {kolomGt.map((k) => (
                  <td key={k.kode} className="py-2 pr-4 text-right tabular-nums">
                    {ringkas[k.kode].total.toLocaleString('id-ID')}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Per wilayah kerja */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-medium text-teal-900">Dokumen per Wilayah Kerja</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {JENIS.map((j) => (
            <div key={j.kode}>
              <h3 className="mb-1 text-sm font-semibold text-[#0F2A38]">{j.nama}</h3>
              {ringkas[j.kode].perWilker.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data.</p>
              ) : (
                <ul className="space-y-0.5 text-sm">
                  {ringkas[j.kode].perWilker.map((w) => (
                    <li key={w.wilayah} className="flex justify-between">
                      <span>{w.wilayah}</span>
                      <span className="tabular-nums">{w.n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}