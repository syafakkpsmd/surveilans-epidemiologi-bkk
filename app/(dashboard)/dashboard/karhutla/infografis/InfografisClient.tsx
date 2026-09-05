'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import InfografisPoster, { LEBAR_POSTER } from '@/components/karhutla/infografis/InfografisPoster';
import type { RingkasanInfografisHarian } from '@/lib/supabase/queries-karhutla-server';

export default function InfografisClient({
  tanggalAwal,
  dataAwal,
}: {
  tanggalAwal: string;
  dataAwal: RingkasanInfografisHarian | null;
}) {
  const [tanggal, setTanggal] = useState(tanggalAwal);
  const [data, setData] = useState<RingkasanInfografisHarian | null>(dataAwal);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sedangUnduh, setSedangUnduh] = useState<'jpeg' | 'png' | 'pdf' | 'ig' | null>(null);
  const posterRef = useRef<HTMLDivElement | null>(null);

  const sudahMountPertama = useRef(false);

  useEffect(() => {
    if (!sudahMountPertama.current) {
      sudahMountPertama.current = true;
      if (tanggal === tanggalAwal && dataAwal) return; // data awal sudah dikirim server, tidak perlu fetch ulang
    }
    const controller = new AbortController();
    setMemuat(true);
    setError(null);
    fetch(`/api/karhutla-infografis?tanggal=${tanggal}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Gagal memuat data.');
        setData(json);
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setError((err as Error).message);
      })
      .finally(() => setMemuat(false));
    return () => controller.abort();
    // tanggalAwal & dataAwal cuma dipakai sekali di pengecekan mount pertama (baris 25-28), bukan dependency yang berubah-ubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggal]);

  function geserHari(delta: number) {
    const [tahun, bulan, hari] = tanggal.split('-').map(Number);
    const d = new Date(Date.UTC(tahun, bulan - 1, hari)); // langsung dalam UTC
    d.setUTCDate(d.getUTCDate() + delta);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    setTanggal(`${y}-${m}-${dd}`);
  }

/** Potong 1 gambar tinggi jadi beberapa slide IG pada titik potong manual
 *  (dalam satuan pixel standar poster, lebar 1080) -- bukan interval tetap,
 *  supaya potongan jatuh di celah kosong (mis. di bawah peta), dan slide
 *  terakhir tingginya pas mengikuti sisa konten (tidak ada halaman putih). */
async function unduhCarouselManual(dataUrlPosterPenuh: string, namaFileDasar: string, titikPotong: number[]) {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrlPosterPenuh;
  });

  const LEBAR_SLIDE = 1080;
  const skala = LEBAR_SLIDE / img.width;
  const tinggiTotalStandar = img.height * skala;

  const batas = [0, ...titikPotong, tinggiTotalStandar];
  const jumlahSlide = batas.length - 1;

  for (let i = 0; i < jumlahSlide; i++) {
    const yAwalStandar = batas[i];
    const tinggiSlideStandar = batas[i + 1] - yAwalStandar;

    const ySumberAwal = yAwalStandar / skala;
    const tinggiSumberDiambil = tinggiSlideStandar / skala;

    const canvas = document.createElement('canvas');
    canvas.width = LEBAR_SLIDE;
    canvas.height = Math.round(tinggiSlideStandar);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, ySumberAwal, img.width, tinggiSumberDiambil, 0, 0, LEBAR_SLIDE, tinggiSlideStandar);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) continue;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${namaFileDasar}-slide-${i + 1}-dari-${jumlahSlide}.png`;
    a.click();
    URL.revokeObjectURL(url);

    await new Promise((r) => setTimeout(r, 400));
  }
}

  async function unduh(format: 'jpeg' | 'png' | 'pdf' | 'ig') {
    if (!posterRef.current || !data) return;
    setSedangUnduh(format);
    try {
      const { toJpeg, toPng } = await import('html-to-image');
      const node = posterRef.current;
      const opsiRender = {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        width: LEBAR_POSTER,
        height: node.scrollHeight,
      };

      const namaFile = `infografis-karhutla-${data.tanggalDitampilkan}`;

      if (format === 'jpeg') {
        const dataUrl = await toJpeg(node, { ...opsiRender, quality: 0.95 });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${namaFile}.jpg`;
        a.click();
      } else if (format === 'png') {
        const dataUrl = await toPng(node, opsiRender);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${namaFile}.png`;
        a.click();
      } else if (format === 'ig') {
        await unduhCarouselManual(await toPng(node, opsiRender), namaFile, [1219]);
      } else {
        // PDF selalu pakai sumber PNG (lossless) supaya kualitas embed di PDF maksimal
        const dataUrl = await toPng(node, opsiRender);
        const { jsPDF } = await import('jspdf');
        // Ukuran PDF mengikuti rasio poster asli (bukan dipaksa ke A4) supaya
        // tidak ada margin kosong aneh -- 1 halaman = 1 poster penuh.
        const rasio = posterRef.current.offsetHeight / posterRef.current.offsetWidth;
        const lebarMm = 210; // setara lebar A4 portrait
        const tinggiMm = lebarMm * rasio;
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/dashboard/karhutla" className="text-sm font-medium text-teal hover:underline">
            ← Kembali ke Dashboard Karhutla
          </Link>
          <h1 className="text-xl font-bold text-ink mt-1">Info Grafis Harian Karhutla &amp; ISPA</h1>
        </div>
      </div>

      {/* ---------- KONTROL TANGGAL & UNDUH ---------- */}
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3">
        <button
          onClick={() => geserHari(-1)}
          className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-bg"
          aria-label="Hari sebelumnya"
        >
          ← Sebelumnya
        </button>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="rounded-control border border-border px-3 py-2 text-sm"
        />
        <button
          onClick={() => geserHari(1)}
          className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-bg"
          aria-label="Hari berikutnya"
        >
          Berikutnya →
        </button>
        <button
          onClick={() => setTanggal(new Date().toISOString().slice(0, 10))}
          className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-bg"
        >
          Hari Ini
        </button>

        <div className="flex-1" />

        <button
          onClick={() => unduh('jpeg')}
          disabled={!data || sedangUnduh !== null}
          className="rounded-control border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-bg disabled:opacity-50"
        >
          {sedangUnduh === 'jpeg' ? 'Menyiapkan…' : '⬇ Unduh JPEG'}
        </button>
        <button
          onClick={() => unduh('png')}
          disabled={!data || sedangUnduh !== null}
          className="rounded-control bg-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {sedangUnduh === 'png' ? 'Menyiapkan…' : '⬇ Unduh PNG'}
        </button>
        <button
          onClick={() => unduh('pdf')}
          disabled={!data || sedangUnduh !== null}
          className="rounded-control bg-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {sedangUnduh === 'pdf' ? 'Menyiapkan…' : '⬇ Unduh PDF'}
        </button>
        <button
          onClick={() => unduh('ig')}
          disabled={!data || sedangUnduh !== null}
          className="rounded-control bg-linear-to-r from-pink-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {sedangUnduh === 'ig' ? 'Menyiapkan…' : '📸 Unduh untuk IG (Carousel)'}
        </button>
      </div>

      {error && (
        <div className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ---------- PREVIEW POSTER ---------- */}
      <p className="text-center text-xs text-muted">
        Pratinjau bisa digeser ke samping — poster didesain lebar {LEBAR_POSTER}px, ukuran unduhan tetap penuh (tidak terpotong).
      </p>
      <div className="flex justify-center">
        <div
          style={{
            maxWidth: '100%',
            overflowX: 'auto',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(15,42,56,0.15)',
          }}
        >
          {memuat && !data && (
            <div className="flex h-100 w-120 items-center justify-center text-sm text-muted">Memuat info grafis…</div>
          )}
          {data && (
            <div ref={posterRef} style={{ width: LEBAR_POSTER }}>
              <InfografisPoster data={data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}