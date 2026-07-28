'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { Feature, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';

const PUSAT_PETA: [number, number] = [-2.5, 118]; // Leaflet: [lat, lng]
const ZOOM_AWAL = 5;

function normalisasiNama(nama: string = ''): string {
  return nama
    .toLowerCase()
    .replace(/^provinsi\s+|^propinsi\s+/, '')
    .replace(/[^a-z0-9]/g, '');
}

function warnaPropinsi(total: number, maxKasus: number): string {
  if (total === 0 || maxKasus === 0) return '#e2e8f0';
  const rasio = total / maxKasus;
  if (rasio < 0.15) return '#fde68a';
  if (rasio < 0.35) return '#fbbf24';
  if (rasio < 0.6) return '#f97316';
  if (rasio < 0.85) return '#dc2626';
  return '#7f1d1d';
}

interface RingkasanPropinsi {
  propinsi: string;
  total_kasus: number;
  breakdown?: { penyakit: string; jumlah_kasus: number }[];
}

interface Props {
  perPropinsi: RingkasanPropinsi[];
  tampilkanBreakdown?: boolean;
  tampilkanLabel?: boolean;
}

export default function NasionalEmergingPeta({ perPropinsi, tampilkanBreakdown = false, tampilkanLabel = true }: Props) {
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/indonesia-provinces.json')
      .then((res) => {
        if (!res.ok) throw new Error('File GeoJSON tidak ditemukan di /public/data/indonesia-provinces.json');
        return res.json();
      })
      .then((json) => setGeoJson(json))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat peta Indonesia.'))
      .finally(() => setLoading(false));
  }, []);

  const petaTotal = useMemo(() => {
    const peta = new Map<string, number>();
    perPropinsi.forEach((p) => peta.set(normalisasiNama(p.propinsi), p.total_kasus));
    return peta;
  }, [perPropinsi]);

  const petaBreakdown = useMemo(() => {
    const peta = new Map<string, RingkasanPropinsi>();
    perPropinsi.forEach((p) => peta.set(normalisasiNama(p.propinsi), p));
    return peta;
  }, [perPropinsi]);

  const maxKasus = useMemo(
    () => Math.max(0, ...perPropinsi.map((p) => p.total_kasus)),
    [perPropinsi]
  );

  function gayaPropinsi(feature?: Feature<Geometry>) {
    const namaAsli = String(feature?.properties?.PROVINSI ?? '');
    const total = petaTotal.get(normalisasiNama(namaAsli)) ?? 0;
    return {
      fillColor: warnaPropinsi(total, maxKasus),
      fillOpacity: 0.75,
      color: '#94a3b8',
      weight: 0.5,
    };
  }

  function saatEachFeature(feature: Feature<Geometry>, layer: L.Layer) {
    if (!tampilkanLabel) return;

    const namaAsli = String(feature.properties?.PROVINSI ?? 'Tidak diketahui');
    const info = petaBreakdown.get(normalisasiNama(namaAsli));
    const total = info?.total_kasus ?? 0;

    let isiTooltip = `${namaAsli}<br/>${total} kasus`;

    if (tampilkanBreakdown && info?.breakdown && info.breakdown.length > 0) {
      const daftarPenyakit = info.breakdown
        .map((b) => `${b.penyakit}: ${b.jumlah_kasus}`)
        .join('<br/>');
      isiTooltip = `${namaAsli}<br/>${daftarPenyakit}`;
    }

    layer.bindTooltip(
      `<div style="font-size:10px;font-weight:600;text-align:center;line-height:1.3">${isiTooltip}</div>`,
      {
        permanent: true,
        direction: 'center',
        className: 'label-negara-emerging',
      }
    );
  }

  if (loading) {
    return (
      <div className="flex h-105 items-center justify-center rounded-xl border text-sm text-slate-400">
        Memuat peta Indonesia...
      </div>
    );
  }

  if (error || !geoJson) {
    return (
      <div className="flex h-105 items-center justify-center rounded-xl border p-4 text-center text-sm text-red-600">
        {error ?? 'Gagal memuat peta Indonesia.'}
      </div>
    );
  }

  return (
    <div className="relative isolate h-105 w-full overflow-hidden rounded-xl border">
      <MapContainer center={PUSAT_PETA} zoom={ZOOM_AWAL} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON
          key={`${tampilkanLabel}-${tampilkanBreakdown}-${perPropinsi.map(p => `${p.propinsi}:${p.total_kasus}`).join(',')}`}
          data={geoJson}
          style={gayaPropinsi}
          onEachFeature={saatEachFeature}
        />
      </MapContainer>
    </div>
  );
}
