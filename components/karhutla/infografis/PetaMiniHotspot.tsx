'use client';

import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { WILKER_LOKASI } from '@/lib/data/wilker-lokasi';
import { NAMA_WILKER } from '@/lib/karhutla/constants';

/**
 * Peta mini titik panas.
 *
 * MODE UTAMA: peta sungguhan via MapLibre GL JS + tile gratis OpenFreeMap
 * (https://openfreemap.org) -- 100% gratis, TANPA API key, TANPA daftar
 * akun, TANPA kartu/rekening, TANPA batas kuota (bandwidth disponsori
 * Cloudflare). Ini pengganti Mapbox Static Images API yang sebelumnya
 * dipakai di sini (yang saat pendaftaran meminta info rekening).
 *
 * PENTING soal cara kerjanya -- ini beda dari sekadar "pasang <MapLibre/>
 * langsung": MapLibre render lewat WebGL canvas, dan canvas/WebGL sering
 * GAGAL di-capture oleh html-to-image (isu CORS/timing saat screenshot
 * poster) -- ini persis alasan kenapa versi Mapbox sebelumnya sengaja
 * dibuat pakai <img> statis, bukan peta interaktif langsung.
 *
 * Supaya tetap aman di-capture, alurnya:
 *   1. Render MapLibre di container TERSEMBUNYI (posisi di luar viewport).
 *   2. Tunggu event 'idle' (peta selesai dimuat & di-render sepenuhnya).
 *   3. Ambil posisi piksel marker via map.project() -- ini memakai kamera
 *      MapLibre yang SUNGGUHAN, jadi presisi, tidak menebak-nebak lewat
 *      rumus proyeksi manual.
 *   4. Snapshot canvas-nya jadi data URL PNG (canvas.toDataURL()).
 *   5. Lepas/hancurkan instance MapLibre (bebaskan konteks WebGL).
 *   6. Tampilkan hasil snapshot sebagai <img> biasa + overlay SVG marker
 *      di atasnya -- PERSIS pola aman yang sama dengan versi sebelumnya.
 *
 * Requirement: `npm install maplibre-gl` (tidak perlu env var apa pun --
 * tidak ada token untuk diisi).
 *
 * MODE FALLBACK: kalau MapLibre gagal dimuat (offline, tile server
 * bermasalah, timeout >8 detik), otomatis balik ke peta ilustrasi SVG
 * (siluet daratan dari convex hull + grid) supaya halaman tidak rusak.
 */

interface TitikHotspotMini {
  latitude: number;
  longitude: number;
}

const LEBAR = 480;
const TINGGI = 620;
const PADDING = 36;

// Style OpenFreeMap gratis -- pilihan lain: positron, bright, dark, fiord.
// 'liberty' dipilih krn menampilkan tutupan lahan/hutan/vegetasi dgn warna
// hijau, relevan utk konteks karhutla (kurang lebih pengganti visual dari
// style satelit Mapbox sebelumnya, meski ini vector map bukan citra satelit).
const OPENFREEMAP_STYLE_URL =
  process.env.NEXT_PUBLIC_PETA_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

const TIMEOUT_MS = 8000; // batas tunggu peta 'idle' sebelum jatuh ke fallback SVG

// ------------------------------------------------------------
// Helper bounds (dipakai baik oleh mode MapLibre maupun fallback SVG)
// ------------------------------------------------------------
function hitungBounds(titik: TitikHotspotMini[]) {
  const semuaLat = [...WILKER_LOKASI.map((w) => w.pusat.lat), ...titik.map((t) => t.latitude)];
  const semuaLng = [...WILKER_LOKASI.map((w) => w.pusat.lng), ...titik.map((t) => t.longitude)];
  return {
    latMin: Math.min(...semuaLat),
    latMax: Math.max(...semuaLat),
    lngMin: Math.min(...semuaLng),
    lngMax: Math.max(...semuaLng),
  };
}

type TitikOverlay = { x: number; y: number; jenis: 'hotspot' | 'wilker'; label?: string; dekatTepiKanan?: boolean };

// ============================================================
// MODE UTAMA: peta sungguhan (MapLibre GL JS + OpenFreeMap)
// ============================================================
function PetaSungguhan({ hotspots, onGagal }: { hotspots: TitikHotspotMini[]; onGagal: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [titikOverlay, setTitikOverlay] = useState<TitikOverlay[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    let sudahSelesai = false;
    const bounds = hitungBounds(hotspots);

    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE_URL,
      interactive: false,
      attributionControl: false,
      // WAJIB: tanpa ini, canvas.toDataURL() bisa mengembalikan gambar
      // kosong/hitam krn buffer WebGL sudah dibersihkan browser sebelum
      // sempat kita baca. (Di maplibre-gl v6, field ini nested di dalam
      // canvasContextAttributes, bukan langsung di root options lagi.)
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    console.log('[PetaMiniHotspot] 1) Map dibuat, bounds:', bounds);

    const gagalKeFallback = (alasan: string) => {
      if (sudahSelesai) return;
      sudahSelesai = true;
      console.warn('[PetaMiniHotspot] GAGAL, jatuh ke fallback SVG. Alasan:', alasan);
      map.remove();
      onGagal();
    };

    const timeoutId = setTimeout(() => gagalKeFallback(`timeout ${TIMEOUT_MS}ms tercapai, 'idle' tidak pernah terpanggil`), TIMEOUT_MS);

    // CATATAN: sengaja TIDAK memasang map.on('error', gagalKeFallback) di sini.
    // MapLibre memunculkan event 'error' untuk banyak hal yang SEBENARNYA TIDAK
    // FATAL (satu tile di pinggir peta gagal dimuat, glyph font tertentu tidak
    // tersedia, dll) -- kalau tiap error langsung dianggap fatal, peta jadi
    // "menyerah" duluan sebelum sempat selesai render, padahal MapLibre memang
    // dirancang tangguh terhadap error parsial semacam itu dan tetap bisa
    // mencapai 'idle' dengan baik. Fallback ke SVG cukup diserahkan ke timeout
    // di atas (kalau beneran gagal total, 'idle' tidak akan pernah tercapai).
    //
    // Tetap log ke console (bukan console.error) supaya kelihatan utk debugging
    // tanpa mematikan peta -- KALAU tidak ada listener 'error' sama sekali,
    // MapLibre otomatis log sendiri ke console; di sini kita pasang listener
    // ringan supaya formatnya lebih jelas & tidak dobel.
    map.on('error', (e) => {
      console.warn('[PetaMiniHotspot] MapLibre error (non-fatal, peta tetap lanjut):', e.error?.message ?? e);
    });

    map.on('load', () => {
      console.log('[PetaMiniHotspot] 2) event load terpanggil, memanggil fitBounds...');
      try {
        map.fitBounds(
          [
            [bounds.lngMin, bounds.latMin],
            [bounds.lngMax, bounds.latMax],
          ],
          { padding: PADDING + 20, animate: false }
        );
        console.log('[PetaMiniHotspot] 3) fitBounds selesai tanpa error, zoom sekarang:', map.getZoom());
      } catch (err) {
        console.error('[PetaMiniHotspot] fitBounds MELEMPAR ERROR:', err);
      }
    });

    map.once('idle', () => {
      console.log('[PetaMiniHotspot] 4) event idle terpanggil!');
      if (sudahSelesai) return;
      sudahSelesai = true;
      clearTimeout(timeoutId);

      try {
        const overlay: TitikOverlay[] = [];

        hotspots.forEach((h) => {
          const p = map.project([h.longitude, h.latitude]);
          overlay.push({ x: p.x, y: p.y, jenis: 'hotspot' });
        });

        WILKER_LOKASI.forEach((w) => {
          const p = map.project([w.pusat.lng, w.pusat.lat]);
          overlay.push({
            x: p.x,
            y: p.y,
            jenis: 'wilker',
            label: NAMA_WILKER[w.kode] ?? w.kode,
            dekatTepiKanan: p.x > LEBAR - 130,
          });
        });

        const dataUrl = map.getCanvas().toDataURL('image/png');
        console.log('[PetaMiniHotspot] 5) Snapshot berhasil dibuat, panjang data URL:', dataUrl.length, '(kalau <5000 kemungkinan gambar kosong/hitam)');
        setTitikOverlay(overlay);
        setSnapshotUrl(dataUrl);
      } catch (err) {
        gagalKeFallback(`error saat snapshot: ${err}`);
        return;
      }

      map.remove();
    });

    return () => {
      sudahSelesai = true;
      clearTimeout(timeoutId);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(hotspots)]);

  return (
    <div style={{ position: 'relative', width: LEBAR, height: TINGGI }}>
      {/* Container MapLibre asli -- disembunyikan di luar viewport selagi
          dipakai utk snapshot; tidak pakai display:none krn WebGL butuh
          layout/ukuran nyata supaya render dgn benar. */}
      <div
        ref={containerRef}
        style={{ position: 'fixed', left: -9999, top: 0, width: LEBAR, height: TINGGI }}
        aria-hidden
      />

      {snapshotUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- <img> biasa (hasil snapshot
              canvas, bukan next/image) supaya aman di-capture html-to-image. */}
          <img
            src={snapshotUrl}
            alt="Peta sebaran titik panas Kalimantan Timur"
            width={LEBAR}
            height={TINGGI}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', borderRadius: 16 }}
          />
          <svg
            viewBox={`0 0 ${LEBAR} ${TINGGI}`}
            width={LEBAR}
            height={TINGGI}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="haloPanasAsli" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff5a4e" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#ff5a4e" stopOpacity={0} />
              </radialGradient>
            </defs>

            {titikOverlay
              .filter((t) => t.jenis === 'hotspot')
              .map((t, i) => (
                <circle key={`halo${i}`} cx={t.x} cy={t.y} r={14} fill="url(#haloPanasAsli)" />
              ))}
            {titikOverlay
              .filter((t) => t.jenis === 'hotspot')
              .map((t, i) => (
                <circle key={i} cx={t.x} cy={t.y} r={3.5} fill="#ff8a72" fillOpacity={0.95} stroke="#fff1ee" strokeWidth={0.5} />
              ))}

            {titikOverlay
              .filter((t) => t.jenis === 'wilker')
              .map((t, i) => (
                <g key={i}>
                  <circle cx={t.x} cy={t.y} r={5} fill="#0f2a38" stroke="#ffd166" strokeWidth={2} />
                  <text
                    x={t.dekatTepiKanan ? t.x - 11 : t.x + 11}
                    y={t.y + 4}
                    textAnchor={t.dekatTepiKanan ? 'end' : 'start'}
                    fontSize={12}
                    fontWeight={700}
                    fill="#ffffff"
                    style={{ paintOrder: 'stroke', stroke: '#0a2c40', strokeWidth: 3 }}
                  >
                    {t.label}
                  </text>
                </g>
              ))}

            <g transform={`translate(${PADDING}, ${TINGGI - 26})`}>
              <rect x={-10} y={-16} width={230} height={38} rx={8} fill="#0a1929" fillOpacity={0.55} />
              <circle cx={6} cy={0} r={4} fill="#ff8a72" />
              <text x={16} y={4} fontSize={11} fill="#ffffff">Titik panas</text>
              <circle cx={106} cy={0} r={5} fill="#0f2a38" stroke="#ffd166" strokeWidth={1.5} />
              <text x={118} y={4} fontSize={11} fill="#ffffff">Wilayah kerja</text>
            </g>
          </svg>
          {/* Atribusi WAJIB dicantumkan per ketentuan OpenFreeMap krn kita pakai
              snapshot gambar (bukan widget MapLibre langsung yg atribusinya
              otomatis) -- lihat https://openfreemap.org */}
          <p
            style={{
              position: 'absolute',
              right: 6,
              bottom: 4,
              margin: 0,
              fontSize: 8,
              color: 'rgba(255,255,255,0.75)',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            OpenFreeMap © OpenMapTiles Data © OpenStreetMap
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================
// MODE FALLBACK: ilustrasi SVG (dipakai kalau MapLibre/OpenFreeMap gagal dimuat)
// ============================================================

/** Convex hull sederhana (monotone chain) — dipakai utk siluet "daratan" ilustratif. */
function convexHull(titik: { x: number; y: number }[]): { x: number; y: number }[] {
  if (titik.length < 3) return titik;
  const pts = [...titik].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const lintas = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const bawah: { x: number; y: number }[] = [];
  for (const p of pts) {
    while (bawah.length >= 2 && lintas(bawah[bawah.length - 2], bawah[bawah.length - 1], p) <= 0) bawah.pop();
    bawah.push(p);
  }
  const atas: { x: number; y: number }[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (atas.length >= 2 && lintas(atas[atas.length - 2], atas[atas.length - 1], p) <= 0) atas.pop();
    atas.push(p);
  }
  atas.pop();
  bawah.pop();
  return [...bawah, ...atas];
}

/** Perbesar hull menjauhi titik pusatnya, lalu ubah jadi path Catmull-Rom halus (biar tidak kaku poligonal). */
function hullKeHalusPath(hull: { x: number; y: number }[], inflate: number): string {
  if (hull.length < 3) return '';
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  const membesar = hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const jarak = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: p.x + (dx / jarak) * inflate, y: p.y + (dy / jarak) * inflate };
  });

  const n = membesar.length;
  let d = `M ${membesar[0].x} ${membesar[0].y} `;
  for (let i = 0; i < n; i++) {
    const p0 = membesar[(i - 1 + n) % n];
    const p1 = membesar[i];
    const p2 = membesar[(i + 1) % n];
    const p3 = membesar[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y} `;
  }
  return d + 'Z';
}

function PetaIlustrasiFallback({ hotspots }: { hotspots: TitikHotspotMini[] }) {
  const bounds = hitungBounds(hotspots);
  const latMin = bounds.latMin - 0.15;
  const latMax = bounds.latMax + 0.15;
  const lngMin = bounds.lngMin - 0.15;
  const lngMax = bounds.lngMax + 0.15;
  const rentangLat = latMax - latMin || 1;
  const rentangLng = lngMax - lngMin || 1;

  const proyeksi = (lat: number, lng: number) => ({
    x: PADDING + ((lng - lngMin) / rentangLng) * (LEBAR - PADDING * 2),
    y: PADDING + (1 - (lat - latMin) / rentangLat) * (TINGGI - PADDING * 2),
  });

  const titikWilker = WILKER_LOKASI.map((w) => proyeksi(w.pusat.lat, w.pusat.lng));
  const titikHotspot = hotspots.map((h) => proyeksi(h.latitude, h.longitude));
  const pathDaratan = hullKeHalusPath(convexHull([...titikWilker, ...titikHotspot]), 46);

  const jumlahGrid = 6;
  const garisVertikal = Array.from({ length: jumlahGrid + 1 }, (_, i) => PADDING + (i * (LEBAR - PADDING * 2)) / jumlahGrid);
  const garisHorizontal = Array.from({ length: jumlahGrid + 1 }, (_, i) => PADDING + (i * (TINGGI - PADDING * 2)) / jumlahGrid);

  return (
    <svg
      viewBox={`0 0 ${LEBAR} ${TINGGI}`}
      width={LEBAR}
      height={TINGGI}
      style={{ width: '100%', height: '100%', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="airLaut" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0d3b52" />
          <stop offset="100%" stopColor="#0a2c40" />
        </linearGradient>
        <linearGradient id="daratan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f5b46" />
          <stop offset="100%" stopColor="#173f32" />
        </linearGradient>
        <radialGradient id="haloPanas" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff5a4e" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#ff5a4e" stopOpacity={0} />
        </radialGradient>
      </defs>

      <rect x={0} y={0} width={LEBAR} height={TINGGI} rx={16} fill="url(#airLaut)" />

      {garisVertikal.map((x, i) => (
        <line key={`v${i}`} x1={x} y1={PADDING} x2={x} y2={TINGGI - PADDING} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={1} />
      ))}
      {garisHorizontal.map((y, i) => (
        <line key={`h${i}`} x1={PADDING} y1={y} x2={LEBAR - PADDING} y2={y} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={1} />
      ))}

      {pathDaratan && <path d={pathDaratan} fill="url(#daratan)" stroke="#2f7a5f" strokeWidth={1.5} strokeOpacity={0.6} />}

      <rect x={4} y={4} width={LEBAR - 8} height={TINGGI - 8} rx={14} fill="none" stroke="#ffffff" strokeOpacity={0.12} strokeWidth={1.5} />

      {hotspots.map((h, i) => {
        const { x, y } = proyeksi(h.latitude, h.longitude);
        return <circle key={`halo${i}`} cx={x} cy={y} r={16} fill="url(#haloPanas)" />;
      })}
      {hotspots.map((h, i) => {
        const { x, y } = proyeksi(h.latitude, h.longitude);
        return <circle key={i} cx={x} cy={y} r={4} fill="#ff8a72" fillOpacity={0.9} stroke="#fff1ee" strokeWidth={0.5} />;
      })}

      {WILKER_LOKASI.map((w) => {
        const { x, y } = proyeksi(w.pusat.lat, w.pusat.lng);
        const nama = NAMA_WILKER[w.kode] ?? w.kode;
        const dekatTepiKanan = x > LEBAR - 130;
        return (
          <g key={w.kode}>
            <circle cx={x} cy={y} r={5} fill="#0f2a38" stroke="#ffd166" strokeWidth={2} />
            <text
              x={dekatTepiKanan ? x - 11 : x + 11}
              y={y + 4}
              textAnchor={dekatTepiKanan ? 'end' : 'start'}
              fontSize={12}
              fontWeight={700}
              fill="#ffffff"
              style={{ paintOrder: 'stroke', stroke: '#0a2c40', strokeWidth: 3 }}
            >
              {nama}
            </text>
          </g>
        );
      })}

      <g transform={`translate(${PADDING}, ${TINGGI - 26})`}>
        <circle cx={6} cy={0} r={4} fill="#ff8a72" />
        <text x={16} y={4} fontSize={11} fill="#c9dde6">Titik panas</text>
        <circle cx={106} cy={0} r={5} fill="#0f2a38" stroke="#ffd166" strokeWidth={1.5} />
        <text x={118} y={4} fontSize={11} fill="#c9dde6">Wilayah kerja</text>
      </g>
      <text x={LEBAR - PADDING} y={TINGGI - 26} textAnchor="end" fontSize={9} fill="#7fa0b3">
        *siluet daratan ilustratif, bukan peta presisi
      </text>
    </svg>
  );
}

export default function PetaMiniHotspot({ hotspots }: { hotspots: TitikHotspotMini[] }) {
  const [gagal, setGagal] = useState(false);
  if (gagal) return <PetaIlustrasiFallback hotspots={hotspots} />;
  return <PetaSungguhan hotspots={hotspots} onGagal={() => setGagal(true)} />;
}