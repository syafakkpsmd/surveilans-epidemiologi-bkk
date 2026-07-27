'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from 'react-leaflet';
import type { Feature, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';

const PUSAT_PETA: [number, number] = [15, 105]; // fokus Asia, sesuai sebaran negara emerging
const ZOOM_AWAL = 3;

// Nama di GeoJSON (Natural Earth) -> nama lokal yang dipakai data kita
const NEGARA_NAME_MAP: Record<string, string> = {
  China: 'China',
  Philippines: 'Filipina',
  Vietnam: 'Vietnam',
  Malaysia: 'Malaysia',
  India: 'India',
  'South Korea': 'Korea Selatan',
  Taiwan: 'Taiwan',
  'Saudi Arabia': 'Arab Saudi',
  Japan: 'Jepang',
  Thailand: 'Thailand',
  Bangladesh: 'Bangladesh',
};

// Balik: nama lokal -> nama GeoJSON, untuk lookup pas render
const NAMA_LOKAL_KE_GEOJSON: Record<string, string> = Object.fromEntries(
  Object.entries(NEGARA_NAME_MAP).map(([geo, lokal]) => [lokal, geo])
);

// Singapura & Hong Kong tidak punya polygon di GeoJSON resolusi ini
// (negara/wilayah terlalu kecil) -- dirender sebagai CircleMarker.
const NEGARA_TITIK: { nama: string; koordinat: [number, number] }[] = [
  { nama: 'Singapura', koordinat: [1.3521, 103.8198] }, // Leaflet: [lat, lng]
  { nama: 'Hong Kong', koordinat: [22.3193, 114.1694] },
];

interface RingkasanNegara {
  negara: string;
  total_kasus: number;
}

interface Props {
  data: RingkasanNegara[];
}

function warnaByTotal(total: number, maxKasus: number) {
  if (maxKasus === 0 || total === 0) return '#e5e7eb';
  const rasio = total / maxKasus;
  if (rasio < 0.15) return '#fde68a';
  if (rasio < 0.35) return '#fbbf24';
  if (rasio < 0.6) return '#f97316';
  if (rasio < 0.85) return '#dc2626';
  return '#7f1d1d';
}

export default function GlobalEmergingNegaraMap({ data }: Props) {
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/world-countries.json')
      .then((res) => {
        if (!res.ok) throw new Error('File GeoJSON tidak ditemukan di /public/data/world-countries.json');
        return res.json();
      })
      .then((json) => setGeoJson(json))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat peta dunia.'))
      .finally(() => setLoading(false));
  }, []);

  const totalPerNegara = useMemo(() => {
    const peta = new Map<string, number>();
    data.forEach((r) => {
      peta.set(r.negara, (peta.get(r.negara) ?? 0) + (r.total_kasus ?? 0));
    });
    return peta;
  }, [data]);

  const maxKasus = useMemo(
    () => Math.max(0, ...Array.from(totalPerNegara.values())),
    [totalPerNegara]
  );

  function gayaNegara(feature?: Feature<Geometry>) {
    const namaAsli = String(feature?.properties?.name ?? '');
    const namaLokal = NEGARA_NAME_MAP[namaAsli];
    const total = namaLokal ? totalPerNegara.get(namaLokal) ?? 0 : 0;
    const dipantau = Boolean(namaLokal);
    return {
      fillColor: dipantau ? warnaByTotal(total, maxKasus) : '#f1f5f9',
      fillOpacity: dipantau ? 0.75 : 0.3,
      color: '#94a3b8',
      weight: 0.5,
    };
  }

  function saatEachFeature(feature: Feature<Geometry>, layer: L.Layer) {
    const namaAsli = String(feature.properties?.name ?? 'Tidak diketahui');
    const namaLokal = NEGARA_NAME_MAP[namaAsli];

    if (!namaLokal) return; // negara yang tidak dipantau tidak diberi label, biar peta tidak penuh

    const total = totalPerNegara.get(namaLokal) ?? 0;

    layer.bindTooltip(
        `<div style="font-size:11px;font-weight:600;text-align:center;line-height:1.3">${namaLokal}<br/>${total} kasus</div>`,
        {
        permanent: true,
        direction: 'center',
        className: 'label-negara-emerging',
        }
    );
    }

  if (loading) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-[10px] bg-white text-sm text-gray-500 shadow-sm">
        Memuat peta dunia...
      </div>
    );
  }

  if (error || !geoJson) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-[10px] bg-white p-4 text-center text-sm text-red-600 shadow-sm">
        {error ?? 'Gagal memuat peta dunia.'}
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-[#0F2A38] mb-3">Peta sebaran kasus per negara</h2>

      <div className="relative isolate h-[420px] w-full overflow-hidden rounded-xl border">
        <MapContainer center={PUSAT_PETA} zoom={ZOOM_AWAL} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <GeoJSON data={geoJson} style={gayaNegara} onEachFeature={saatEachFeature} />

          {NEGARA_TITIK.map((n) => {
            const total = totalPerNegara.get(n.nama) ?? 0;
            return (
              <CircleMarker
                key={n.nama}
                center={n.koordinat}
                radius={7}
                pathOptions={{
                  fillColor: warnaByTotal(total, maxKasus),
                  fillOpacity: 0.9,
                  color: '#334155',
                  weight: 1,
                }}
              >
                <Tooltip sticky>{`${n.nama}: ${total} kasus`}</Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>Rendah</span>
        <span className="w-4 h-4 rounded" style={{ background: '#fde68a' }} />
        <span className="w-4 h-4 rounded" style={{ background: '#fbbf24' }} />
        <span className="w-4 h-4 rounded" style={{ background: '#f97316' }} />
        <span className="w-4 h-4 rounded" style={{ background: '#dc2626' }} />
        <span className="w-4 h-4 rounded" style={{ background: '#7f1d1d' }} />
        <span>Tinggi</span>
        <span className="ml-3 text-gray-400">● = Singapura/Hong Kong (marker titik)</span>
      </div>
    </div>
  );
}