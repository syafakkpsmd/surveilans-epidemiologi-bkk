'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LABEL_POSKO, type DataPosko } from '@/lib/posko/konstanta';
import { tambahHari, tanggalPanjang } from '@/lib/posko/hitung';
import InfografisPoskoPoster, { LEBAR_POSTER } from './InfografisPoskoPoster';

function geserTanggal(iso: string, hari: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

export default function PoskoInfografisClient({ slug, data }: { slug: string; data: DataPosko }) {
  const { periode, hariIni } = data;

  // Tanggal yang dipilih = TANGGAL LAPORAN; isi poster = data hari sebelumnya (H-1).
  // Rentang tanggal laporan: dari (mulai + 1 hari) sampai min(selesai + 1 hari, hari ini).
  const tanggalMin = periode ? tambahHari(periode.tanggalMulai, 1) : '';
  const tanggalMaksPeriode = periode ? tambahHari(periode.tanggalSelesai, 1) : '';
  const tanggalMaks = periode ? (hariIni < tanggalMaksPeriode ? hariIni : tanggalMaksPeriode) : '';
  const tersedia = !!periode && tanggalMaks >= tanggalMin;

  const [tanggal, setTanggal] = useState(tersedia ? tanggalMaks : '');
  const [sedangUnduh, setSedangUnduh] = useState<'jpeg' | 'png' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const posterRef = useRef<HTMLDivElement>(null);
  const wadahRef = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(1);
  const [tinggi, setTinggi] = useState(0);

  // pratinjau diperkecil mengikuti lebar layar; file unduhan tetap 1080px penuh
  useEffect(() => {
    const hitung = () => {
      if (wadahRef.current) setSkala(Math.min(1, wadahRef.current.clientWidth / LEBAR_POSTER));
      if (posterRef.current) setTinggi(posterRef.current.scrollHeight);
    };
    hitung();
    const ro = new ResizeObserver(hitung);
    if (wadahRef.current) ro.observe(wadahRef.current);
    if (posterRef.current) ro.observe(posterRef.current);
    return () => ro.disconnect();
  }, [tanggal, periode]);

  const adaPoster = useMemo(() => tersedia && !!tanggal, [tersedia, tanggal]);
  const tanggalData = tanggal ? tambahHari(tanggal, -1) : '';

  const bisaMundur = tersedia && tanggal > tanggalMin;
  const bisaMaju = tersedia && tanggal < tanggalMaks;

  async function unduh(format: 'jpeg' | 'png' | 'pdf') {
    if (!posterRef.current) return;
    setSedangUnduh(format);
    setError(null);
    try {
      const { toJpeg, toPng } = await import('html-to-image');
      const node = posterRef.current;
      const opsi = { pixelRatio: 3, backgroundColor: '#ffffff', width: LEBAR_POSTER, height: node.scrollHeight };
      const namaFile = `infografis-${slug}-laporan-${tanggal}`;

      if (format === 'jpeg') {
        const a = document.createElement('a');
        a.href = await toJpeg(node, { ...opsi, quality: 0.95 });
        a.download = `${namaFile}.jpg`;
        a.click();
      } else if (format === 'png') {
        const a = document.createElement('a');
        a.href = await toPng(node, opsi);
        a.download = `${namaFile}.png`;
        a.click();
      } else {
        const dataUrl = await toPng(node, opsi);
        const { jsPDF } = await import('jspdf');
        const lebarMm = 210;
        const tinggiMm = lebarMm * (node.offsetHeight / node.offsetWidth);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [lebarMm, tinggiMm] });
        pdf.addImage(dataUrl, 'PNG', 0, 0, lebarMm, tinggiMm);
        pdf.save(`${namaFile}.pdf`);
      }
    } catch (err) {
      setError(`Gagal membuat file: ${(err as Error).message}`);
    } finally {
      setSedangUnduh(null);
    }
  }

  const tombol = 'rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40';

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <div>
        <Link href={`/dashboard/posko/${slug}${periode ? `?tahun=${periode.tahun}` : ''}`} className="text-sm font-medium text-[#0F4C5C] hover:underline">
          ← Kembali ke Dashboard {LABEL_POSKO[data.posko]}
        </Link>
        <h1 className="mt-1 text-xl font-bold text-[#0F2A38]">Info Grafis Harian {LABEL_POSKO[data.posko]}</h1>
      </div>

      {data.catatan.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {data.catatan.map((c) => (
            <p key={c}>{c}</p>
          ))}
        </div>
      )}

      {!adaPoster || !periode ? (
        <p className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
          {periode
            ? `Info grafis belum bisa dibuat: data hari pertama posko (${tanggalPanjang(periode.tanggalMulai)}) baru tersedia untuk laporan tanggal ${tanggalPanjang(tanggalMin)}.`
            : 'Info grafis belum bisa dibuat: periode posko belum diatur.'}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white p-3">
            <button className={tombol} disabled={!bisaMundur} onClick={() => setTanggal(geserTanggal(tanggal, -1))}>
              ← Sebelumnya
            </button>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              Tanggal laporan
              <input
                type="date"
                value={tanggal}
                min={tanggalMin}
                max={tanggalMaks}
                onChange={(e) => e.target.value && setTanggal(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800"
                aria-label="Tanggal laporan info grafis"
              />
            </label>
            <button className={tombol} disabled={!bisaMaju} onClick={() => setTanggal(geserTanggal(tanggal, 1))}>
              Berikutnya →
            </button>
            <span className="text-xs text-gray-500">
              Data yang ditampilkan: <strong>{tanggalPanjang(tanggalData)}</strong> (H-1)
            </span>

            <div className="ml-auto flex gap-2">
              {(['jpeg', 'png', 'pdf'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => unduh(f)}
                  disabled={sedangUnduh !== null}
                  className="rounded-md bg-[#0F4C5C] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0c3e4b] disabled:opacity-50"
                >
                  {sedangUnduh === f ? 'Membuat…' : `Unduh ${f.toUpperCase()}`}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

          <div ref={wadahRef} className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div style={{ width: LEBAR_POSTER * skala, height: tinggi * skala }}>
              <div style={{ width: LEBAR_POSTER, transform: `scale(${skala})`, transformOrigin: 'top left' }}>
                <InfografisPoskoPoster ref={posterRef} data={data} tanggalLaporan={tanggal} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
