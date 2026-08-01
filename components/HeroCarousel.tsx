"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

type SlideItem = {
  title: string;
  image: string;
  deskripsi?: string;
  href?: string;
};

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
        if (sudahDicobaFallback) return;
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

// Kelompokkan item jadi pasangan 2-2 untuk ditampilkan berdampingan per slide
function kelompokkanBerpasangan(items: SlideItem[]): SlideItem[][] {
  const hasil: SlideItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    hasil.push(items.slice(i, i + 2));
  }
  return hasil;
}

export function HeroCarousel({
  items,
  autoPlayMs = 5000,
}: {
  items: SlideItem[];
  autoPlayMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const kelompok = kelompokkanBerpasangan(items);

  const goTo = useCallback(
    (i: number) => setIndex((i + kelompok.length) % kelompok.length),
    [kelompok.length]
  );

  useEffect(() => {
    if (kelompok.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % kelompok.length), autoPlayMs);
    return () => clearInterval(timer);
  }, [kelompok.length, autoPlayMs]);

  if (kelompok.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-md">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {kelompok.map((pasangan, i) => (
          <div key={i} className="relative min-w-full aspect-21/7 flex gap-1">
            {pasangan.map((item, j) => (
              <div key={j} className="relative flex-1 overflow-hidden">
                <SlideImage src={item.image} alt={item.title} priority={i === 0} />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4 text-white">
                  <h2 className="text-base font-bold">{item.title}</h2>
                  {item.deskripsi && (
                    <p className="text-xs text-white/80 mt-1 max-w-xs">{item.deskripsi}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {kelompok.length > 1 && (
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

      {kelompok.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {kelompok.map((_, i) => (
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