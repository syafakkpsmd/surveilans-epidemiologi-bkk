'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';

export type PadTandaTanganHandle = {
  /** PNG tanda tangan (latar putih) atau null kalau pad masih kosong. */
  ambilBerkas: (namaFile: string) => Promise<File | null>;
};

type Props = {
  label: string;
  ref?: Ref<PadTandaTanganHandle>;
};

/**
 * Kotak tanda tangan (jari/stylus/mouse) tanpa library. Resolusi internal
 * mengikuti devicePixelRatio supaya garis tidak pecah di layar HP.
 */
export default function PadTandaTangan({ label, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sedangMenggambar = useRef(false);
  const [adaGoresan, setAdaGoresan] = useState(false);

  const siapkanCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rasio = Math.max(window.devicePixelRatio || 1, 1);
    const lebar = canvas.clientWidth;
    const tinggi = canvas.clientHeight;
    canvas.width = Math.round(lebar * rasio);
    canvas.height = Math.round(tinggi * rasio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(rasio, rasio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
  }, []);

  useEffect(() => {
    siapkanCanvas();
  }, [siapkanCanvas]);

  const titik = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const mulai = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    sedangMenggambar.current = true;
    const { x, y } = titik(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // titik tunggal (ketukan) tetap meninggalkan jejak
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setAdaGoresan(true);
  };

  const gerak = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sedangMenggambar.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = titik(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const selesai = () => {
    sedangMenggambar.current = false;
  };

  const hapus = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setAdaGoresan(false);
  };

  useImperativeHandle(
    ref,
    () => ({
      ambilBerkas: (namaFile: string) =>
        new Promise<File | null>((resolve) => {
          const canvas = canvasRef.current;
          if (!canvas || !adaGoresan) return resolve(null);

          // salin ke canvas lain dengan latar putih (PNG transparan tampak hitam di beberapa viewer)
          const salinan = document.createElement('canvas');
          salinan.width = canvas.width;
          salinan.height = canvas.height;
          const ctx = salinan.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, salinan.width, salinan.height);
          ctx.drawImage(canvas, 0, 0);
          salinan.toBlob((blob) => {
            resolve(blob ? new File([blob], `${namaFile}.png`, { type: 'image/png' }) : null);
          }, 'image/png');
        }),
    }),
    [adaGoresan]
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block font-medium">{label}</label>
        <button
          type="button"
          onClick={hapus}
          disabled={!adaGoresan}
          className="text-xs text-blue-700 underline disabled:text-gray-400 disabled:no-underline"
        >
          Hapus &amp; ulangi
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={mulai}
        onPointerMove={gerak}
        onPointerUp={selesai}
        onPointerCancel={selesai}
        onPointerLeave={selesai}
        className="mt-1 h-40 w-full touch-none rounded border border-gray-300 bg-white"
        aria-label={label}
      />
      <p className="mt-1 text-xs text-gray-500">
        {adaGoresan ? 'Tanda tangan akan diunggah saat Simpan Pengawasan ditekan.' : 'Tanda tangan di dalam kotak.'}
      </p>
    </div>
  );
}
