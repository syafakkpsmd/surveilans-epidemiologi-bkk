'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, CircleMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css'; // dijamin ke-load duluan, tidak bergantung urutan import global layout

export interface HotspotRow {
  id: string;
  latitude: number;
  longitude: number;
  tanggal_deteksi: string;
  jam_deteksi: string | null;
  confidence: number | null;
  satelit: string | null;
  frp: number | null;
}

/**
 * Peta hotspot Karhutla Kaltim pakai Leaflet, mengikuti pola PetaWilker
 * yang sudah ada di EPIC-AI (dynamic import, no SSR).
 */
export default function PetaHotspotKarhutla({ hotspots }: { hotspots: HotspotRow[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<CircleMarker[]>([]);
  const [statusMuat, setStatusMuat] = useState<'memuat' | 'siap' | 'error'>('memuat');

  useEffect(() => {
    let dibatalkan = false;

    async function initPeta() {
      try {
        // @types/leaflet pakai `export =`, bukan default export ES module,
        // jadi dynamic import di-cast manual ke tipe leaflet aslinya.
        const modul = (await import('leaflet')) as unknown as {
          default?: typeof import('leaflet');
        } & typeof import('leaflet');
        const L = modul.default ?? modul;

        // pastikan CSS leaflet sudah di-import sekali secara global di app,
        // mis. di app/layout.tsx: import 'leaflet/dist/leaflet.css'

        if (dibatalkan || !containerRef.current) return;

        if (!mapRef.current) {
          // Titik tengah kira-kira wilayah kerja Kaltim (Samarinda)
          mapRef.current = L.map(containerRef.current).setView([-0.5, 117.1], 8);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18,
          }).addTo(mapRef.current);
        }

        // Fix klasik Leaflet: kalau container belum punya ukuran final saat
        // map di-inisialisasi (mis. masih di dalam layout yang animasi/transisi),
        // tile akan salah posisi/terpotong. invalidateSize() memaksa Leaflet
        // menghitung ulang setelah layout benar-benar settle.
        requestAnimationFrame(() => {
          mapRef.current?.invalidateSize();
        });
        setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 300);

        // Bersihkan marker lama sebelum render ulang
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        hotspots.forEach((h) => {
          const conf = h.confidence ?? 0;
          // Warna berdasar confidence: makin tinggi makin merah pekat
          const warna = conf >= 90 ? '#B91C1C' : conf >= 80 ? '#EA580C' : '#F59E0B';

          const marker = L.circleMarker([h.latitude, h.longitude], {
            radius: 6,
            color: warna,
            fillColor: warna,
            fillOpacity: 0.7,
            weight: 1,
          }).addTo(mapRef.current!);

          marker.bindPopup(`
            <div style="font-size:13px;line-height:1.5">
              <strong>Hotspot ${h.satelit ?? ''}</strong><br/>
              Tanggal: ${h.tanggal_deteksi} ${h.jam_deteksi ? `(${h.jam_deteksi} UTC)` : ''}<br/>
              Confidence: ${conf}%<br/>
              ${h.frp ? `FRP: ${h.frp} MW<br/>` : ''}
              Koordinat: ${h.latitude.toFixed(4)}, ${h.longitude.toFixed(4)}
            </div>
          `);

          markersRef.current.push(marker);
        });

        setStatusMuat('siap');
      } catch (err) {
        console.error('[PetaHotspotKarhutla] gagal inisialisasi peta:', err);
        setStatusMuat('error');
      }
    }

    initPeta();

    return () => {
      dibatalkan = true;
    };
  }, [hotspots]);

  useEffect(() => {
    function handleResize() {
      mapRef.current?.invalidateSize();
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">
          Peta Sebaran Titik Panas (Hotspot) di Kalimantan Timur
        </h3>
        <span className="text-xs text-gray-500">{hotspots.length} titik (confidence &gt;80%)</span>
      </div>

      {statusMuat === 'error' && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          Gagal memuat peta. Pastikan library "leaflet" sudah ter-install.
        </div>
      )}

      <div className="relative isolate z-0 overflow-hidden rounded-md">
        {/*
          Paksa z-index internal Leaflet (pane, kontrol zoom, popup) tetap rendah.
          Tanpa ini, elemen Leaflet (default z-index bisa sampai ~700-1000 untuk
          popup) bisa "bocor" menutupi header/navbar fixed di layout dashboard
          saat halaman di-scroll.
        */}
        <style jsx global>{`
          .leaflet-pane,
          .leaflet-top,
          .leaflet-bottom,
          .leaflet-control {
            z-index: 10 !important;
          }
          .leaflet-popup {
            z-index: 20 !important;
          }
        `}</style>
        <div ref={containerRef} style={{ height: 420, width: '100%' }} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#B91C1C' }} /> Confidence ≥90%</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#EA580C' }} /> Confidence 80-89%</span>
      </div>
    </div>
  );
}

/*
  Cara pakai (server component, mis. app/dashboard/karhutla/page.tsx):

  import dynamic from 'next/dynamic';
  const PetaHotspotKarhutla = dynamic(
    () => import('@/components/karhutla/PetaHotspotKarhutla'),
    { ssr: false }
  );

  const hotspots = await ambilHotspotCache(3);
  <PetaHotspotKarhutla hotspots={hotspots} />
*/