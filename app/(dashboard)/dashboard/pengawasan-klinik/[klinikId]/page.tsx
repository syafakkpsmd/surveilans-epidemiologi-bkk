// app/(dashboard)/dashboard/pengawasan-klinik/[klinikId]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ITEM_CHECKLIST, DAFTAR_KATEGORI } from '@/lib/pengawasan-klinik/itemChecklist';

export const dynamic = 'force-dynamic';

const LABEL_STATUS: Record<string, string> = {
  memenuhi_syarat: 'Memenuhi Syarat',
  perlu_perbaikan: 'Perlu Perbaikan',
  tidak_memenuhi_syarat: 'Tidak Memenuhi Syarat',
};
const WARNA_STATUS: Record<string, string> = {
  memenuhi_syarat: '#16a34a',
  perlu_perbaikan: '#d97706',
  tidak_memenuhi_syarat: '#dc2626',
};

type Foto = { jenis_dokumen: string; cloudinary_url: string };

function formatTanggal(tgl: string | null | undefined): string {
  if (!tgl) return '-';
  return new Date(`${tgl.slice(0, 10)}T00:00:00Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Sisipkan transformasi Cloudinary supaya thumbnail ringan (lebar maks 480px, kualitas otomatis). */
function urlThumbnail(url: string): string {
  return url.replace('/upload/', '/upload/w_480,c_limit,q_auto,f_auto/');
}

function GaleriFoto({ foto }: { foto: Foto[] }) {
  if (foto.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {foto.map((f) => (
        <a key={f.cloudinary_url} href={f.cloudinary_url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlThumbnail(f.cloudinary_url)}
            alt={`Foto ${f.jenis_dokumen}`}
            loading="lazy"
            className="h-28 w-28 rounded-md border border-gray-200 object-cover hover:opacity-90"
          />
        </a>
      ))}
    </div>
  );
}

export default async function DetailPengawasanKlinikPage({
  params,
  searchParams,
}: {
  params: Promise<{ klinikId: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { klinikId } = await params;
  const { p } = await searchParams;
  const supabase = await createClient();

  const [{ data: klinik }, { data: riwayatMentah }] = await Promise.all([
    supabase
      .from('klinik_binaan')
      .select('id, nama_klinik, jenis_fasilitas, alamat_klinik, kabupaten_kota, telepon')
      .eq('id', klinikId)
      .maybeSingle(),
    supabase
      .from('pengawasan_klinik')
      .select('*')
      .eq('klinik_id', klinikId)
      .order('tanggal_kegiatan', { ascending: false }),
  ]);

  if (!klinik) notFound();

  const riwayat = (riwayatMentah ?? []) as Record<string, any>[];
  const terpilih = riwayat.find((r) => r.id === p) ?? riwayat[0] ?? null;

  let semuaFoto: Foto[] = [];
  let pesanFoto: string | null = null;
  if (terpilih) {
    const { data: fotoRows, error: errFoto } = await supabase
      .from('pengawasan_klinik_dokumen')
      .select('jenis_dokumen, cloudinary_url')
      .eq('pengawasan_id', terpilih.id);
    if (errFoto) pesanFoto = `Foto tidak dapat dimuat: ${errFoto.message}`;
    semuaFoto = (fotoRows ?? []) as Foto[];
  }
  const fotoPerJenis = (jenis: string) => semuaFoto.filter((f) => f.jenis_dokumen === jenis);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <Link href="/dashboard/pengawasan-klinik" className="text-sm text-blue-700 hover:underline">
        ← Kembali ke daftar klinik
      </Link>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-[#0F2A38]">{klinik.nama_klinik}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {[klinik.jenis_fasilitas, klinik.alamat_klinik, klinik.kabupaten_kota, klinik.telepon]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {!terpilih ? (
        <p className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
          Klinik ini belum pernah diawasi.
        </p>
      ) : (
        <>
          {/* Pilih tanggal pengawasan */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-gray-500">Riwayat pengawasan ({riwayat.length})</p>
            <div className="flex flex-wrap gap-2">
              {riwayat.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/pengawasan-klinik/${klinikId}?p=${r.id}`}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    r.id === terpilih.id
                      ? 'border-[#0F4C5C] bg-[#0F4C5C] text-white'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {formatTanggal(r.tanggal_kegiatan)}
                </Link>
              ))}
            </div>
          </div>

          {/* Ringkasan */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-base font-semibold text-gray-800">
                Pengawasan {formatTanggal(terpilih.tanggal_kegiatan)}
              </h2>
              {terpilih.status_kepatuhan && (
                <span
                  className="rounded px-2 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: WARNA_STATUS[terpilih.status_kepatuhan] ?? '#6b7280' }}
                >
                  {LABEL_STATUS[terpilih.status_kepatuhan] ?? terpilih.status_kepatuhan}
                </span>
              )}
              {terpilih.persentase_kepatuhan != null && (
                <span className="text-sm text-gray-600">Kepatuhan {terpilih.persentase_kepatuhan}%</span>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-gray-700 sm:grid-cols-2">
              <div>
                <dt className="inline text-gray-500">Jam layanan: </dt>
                <dd className="inline">
                  {terpilih.waktu_mulai_layanan ?? '-'} – {terpilih.waktu_tutup_layanan ?? '-'}
                </dd>
              </div>
              <div>
                <dt className="inline text-gray-500">No. SIP dokter: </dt>
                <dd className="inline">{terpilih.nomor_sip_dokter ?? '-'}</dd>
              </div>
              <div>
                <dt className="inline text-gray-500">No. SIO: </dt>
                <dd className="inline">{terpilih.nomor_sio ?? '-'}</dd>
              </div>
              <div>
                <dt className="inline text-gray-500">SIO berlaku sampai: </dt>
                <dd className="inline">{formatTanggal(terpilih.sio_berlaku_sampai)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="inline text-gray-500">Petugas BKK: </dt>
                <dd className="inline">
                  {[terpilih.nama_petugas_1, terpilih.nama_petugas_2, terpilih.nama_petugas_3]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="inline text-gray-500">Petugas klinik yang diwawancarai: </dt>
                <dd className="inline">{terpilih.nama_petugas_klinik ?? '-'}</dd>
              </div>
              {terpilih.catatan && (
                <div className="sm:col-span-2">
                  <dt className="inline text-gray-500">Catatan: </dt>
                  <dd className="inline">{terpilih.catatan}</dd>
                </div>
              )}
            </dl>
          </div>

          {pesanFoto && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              {pesanFoto}
            </p>
          )}
          {!pesanFoto && semuaFoto.length === 0 && (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
              Belum ada foto yang tersimpan untuk pengawasan ini (foto hanya tersimpan untuk pengawasan yang diinput
              setelah fitur ini aktif).
            </p>
          )}

          {/* Seluruh pertanyaan checklist + foto */}
          {DAFTAR_KATEGORI.map((kategori) => (
            <div key={kategori} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">{kategori}</h3>
              <ul className="divide-y divide-gray-100">
                {ITEM_CHECKLIST.filter((i) => i.kategori === kategori).map((item) => {
                  const nilai = terpilih[item.key] === true;
                  const foto = fotoPerJenis(item.key);
                  return (
                    <li key={item.key} className="py-2">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-800">{item.label}</span>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                            nilai ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {nilai ? 'Ada / Memenuhi' : 'Tidak'}
                        </span>
                      </div>
                      <GaleriFoto foto={foto} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {(fotoPerJenis('ttd_petugas_bkk').length > 0 || fotoPerJenis('ttd_petugas_klinik').length > 0) && (
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Tanda Tangan</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {[
                  {
                    jenis: 'ttd_petugas_bkk',
                    judul: 'Petugas BKK',
                    nama:
                      [terpilih.nama_petugas_1, terpilih.nama_petugas_2, terpilih.nama_petugas_3]
                        .filter(Boolean)
                        .join(', ') || '-',
                  },
                  { jenis: 'ttd_petugas_klinik', judul: 'Petugas Klinik', nama: terpilih.nama_petugas_klinik ?? '-' },
                ].map((t) => (
                  <div key={t.jenis}>
                    <p className="text-xs font-semibold text-gray-500">{t.judul}</p>
                    {fotoPerJenis(t.jenis).length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlThumbnail(fotoPerJenis(t.jenis)[0].cloudinary_url)}
                        alt={`Tanda tangan ${t.judul}`}
                        loading="lazy"
                        className="mt-1 h-28 w-full rounded-md border border-gray-200 bg-white object-contain"
                      />
                    ) : (
                      <p className="mt-1 flex h-28 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
                        Tidak ada tanda tangan
                      </p>
                    )}
                    <p className="mt-1 text-sm text-gray-700">{t.nama}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fotoPerJenis('cold_chain').length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-500">Foto Cold Chain</h3>
              <GaleriFoto foto={fotoPerJenis('cold_chain')} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
