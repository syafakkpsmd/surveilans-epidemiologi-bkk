'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { simpanPengawasanKlinik } from '@/app/(dashboard)/dashboard/pengawasan-klinik/actions';
import { daftarRekam, hapusRekam, EVENT_ANTRIAN, type RekamAntrian } from '@/lib/pengawasan-klinik/antrianOffline';
import { sinkronkanAntrian } from '@/lib/pengawasan-klinik/sinkronAntrian';

function formatTanggal(tgl?: string): string {
  if (!tgl) return '-';
  return new Date(`${tgl.slice(0, 10)}T00:00:00Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Menampilkan pengawasan yang tersimpan di perangkat dan belum terkirim, serta
 * mengirimnya otomatis saat halaman dibuka / sinyal kembali.
 */
export default function BannerAntrianOffline() {
  const router = useRouter();
  const [antrian, setAntrian] = useState<RekamAntrian[]>([]);
  const [mengirim, setMengirim] = useState(false);
  const [online, setOnline] = useState(true);
  const [pesan, setPesan] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try {
      setAntrian(await daftarRekam());
    } catch {
      /* IndexedDB tidak tersedia (mis. mode privat) */
    }
  }, []);

  const kirim = useCallback(
    async (termasukGagal: boolean) => {
      if (!navigator.onLine) return;
      setMengirim(true);
      try {
        const hasil = await sinkronkanAntrian(simpanPengawasanKlinik, { termasukGagal });
        const bagian: string[] = [];
        if (hasil.terkirim > 0) bagian.push(`${hasil.terkirim} pengawasan berhasil dikirim.`);
        if (hasil.gagal > 0) bagian.push(`${hasil.gagal} gagal (lihat keterangan di bawah).`);
        if (hasil.terputus) bagian.push('Sinyal terputus, akan dicoba lagi otomatis.');
        bagian.push(...hasil.peringatan);
        setPesan(bagian.length > 0 ? bagian.join(' ') : null);
        if (hasil.terkirim > 0) router.refresh();
      } catch (err) {
        setPesan(`Gagal mengirim: ${err instanceof Error ? err.message : 'kesalahan tidak diketahui'}`);
      } finally {
        setMengirim(false);
        await muat();
      }
    },
    [muat, router]
  );

  useEffect(() => {
    setOnline(navigator.onLine);

    (async () => {
      let data: RekamAntrian[] = [];
      try {
        data = await daftarRekam();
        setAntrian(data);
      } catch {
        return;
      }
      if (navigator.onLine && data.some((r) => r.status !== 'gagal')) kirim(false);
    })();

    const saatOnline = () => {
      setOnline(true);
      kirim(false);
    };
    const saatOffline = () => setOnline(false);
    const saatBerubah = () => {
      muat().then(() => {
        if (navigator.onLine) kirim(false);
      });
    };

    window.addEventListener('online', saatOnline);
    window.addEventListener('offline', saatOffline);
    window.addEventListener(EVENT_ANTRIAN, saatBerubah);
    return () => {
      window.removeEventListener('online', saatOnline);
      window.removeEventListener('offline', saatOffline);
      window.removeEventListener(EVENT_ANTRIAN, saatBerubah);
    };
  }, [kirim, muat]);

  async function hapus(id: string) {
    if (!confirm('Hapus data ini dari perangkat? Data yang belum terkirim akan hilang.')) return;
    await hapusRekam(id);
    await muat();
  }

  if (antrian.length === 0 && !pesan) return null;
  const adaGagal = antrian.some((r) => r.status === 'gagal');

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      {antrian.length > 0 && (
        <>
          <p className="font-semibold">
            {antrian.length} pengawasan tersimpan di perangkat dan belum terkirim
            {!online && ' — sedang offline, akan dikirim otomatis saat ada sinyal'}
            {mengirim && ' — mengirim…'}
          </p>
          <ul className="mt-2 space-y-2">
            {antrian.map((r) => (
              <li key={r.id} className="rounded border border-amber-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{r.namaKlinik === 'klinik' ? 'Klinik' : r.namaKlinik}</strong> ·{' '}
                    {formatTanggal(r.fields.tanggal_kegiatan)} · {r.media.length} foto/ttd menunggu unggah
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        r.status === 'gagal'
                          ? 'bg-red-100 text-red-700'
                          : r.status === 'mengirim'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status === 'gagal' ? 'Gagal' : r.status === 'mengirim' ? 'Mengirim' : 'Menunggu'}
                    </span>
                    <button type="button" onClick={() => hapus(r.id)} className="text-xs text-red-700 underline">
                      Hapus
                    </button>
                  </span>
                </div>
                {r.status === 'gagal' && r.pesan && <p className="mt-1 text-xs text-red-700">{r.pesan}</p>}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!online || mengirim}
              onClick={() => kirim(false)}
              className="rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Kirim sekarang
            </button>
            {adaGagal && (
              <button
                type="button"
                disabled={!online || mengirim}
                onClick={() => kirim(true)}
                className="rounded border border-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50"
              >
                Coba lagi yang gagal
              </button>
            )}
          </div>
        </>
      )}
      {pesan && <p className="mt-2 text-xs">{pesan}</p>}
    </div>
  );
}
