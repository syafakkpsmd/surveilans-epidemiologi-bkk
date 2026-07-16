"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

type SlideItem = {
  title: string;
  image: string;
  deskripsi?: string;
  href?: string;
};

/**
 * Gambar slide dengan fallback otomatis antara ekstensi .jpg <-> .jpeg.
 * Kalau file asli disimpan dengan ekstensi berbeda dari yang tertulis
 * di data slide, gambar tetap tampil tanpa perlu rename file manual.
 */
function SlideImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority: boolean;
}) {
  const [sumberGambar, setSumberGambar] = useState(src);
  const [sudahDicobaFallback, setSudahDicobaFallback] = useState(false);

  return (
    <Image
      src={sumberGambar}
      alt={alt}
      fill
      className="object-cover"
      priority={priority}
      onError={() => {
        if (sudahDicobaFallback) return; // hindari retry berulang kalau kedua ekstensi tidak ada
        setSudahDicobaFallback(true);

        if (sumberGambar.endsWith(".jpg")) {
          setSumberGambar(sumberGambar.replace(/\.jpg$/, ".jpeg"));
        } else if (sumberGambar.endsWith(".jpeg")) {
          setSumberGambar(sumberGambar.replace(/\.jpeg$/, ".jpg"));
        }
      }}
    />
  );
}

export function HeroCarousel({
  items,
  autoPlayMs = 5000,
}: {
  items: SlideItem[];
  autoPlayMs?: number;
}) {
  const [index, setIndex] = useState(0);

  const goTo = useCallback(
    (i: number) => setIndex((i + items.length) % items.length),
    [items.length]
  );

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), autoPlayMs);
    return () => clearInterval(timer);
  }, [items.length, autoPlayMs]);

  if (items.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-md">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((item, i) => (
          <div key={i} className="relative min-w-full aspect-[21/7]">
            <SlideImage src={item.image} alt={item.title} priority={i === 0} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 text-white">
              <h2 className="text-lg font-bold">{item.title}</h2>
              {item.deskripsi && (
                <p className="text-sm text-white/80 mt-1 max-w-lg">{item.deskripsi}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tombol panah */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => goTo(index - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white p-2"
            aria-label="Sebelumnya"
          >
            ‹
          </button>
          <button
            onClick={() => goTo(index + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white p-2"
            aria-label="Berikutnya"
          >
            ›
          </button>
        </>
      )}

      {/* Dot indikator */}
      {items.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-2 bg-white/50"
              }`}
              aria-label={`Slide ke-${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}