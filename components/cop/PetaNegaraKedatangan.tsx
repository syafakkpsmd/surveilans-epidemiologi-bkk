"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Feature, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";

export interface DataNegara {
  nilai: string;
  jumlah: number;
}

const PUSAT_PETA: [number, number] = [10, 110]; // rentang Asia-Pasifik, sesuai sebaran data
const ZOOM_AWAL = 3;

/** Alias nama negara input petugas -> nama resmi di GeoJSON, kalau beda ejaan/istilah. */
const ALIAS_NEGARA: Record<string, string> = {
  "Amerika Serikat": "United States of America",
  "Korea Selatan": "South Korea",
  "Korea Utara": "North Korea",
};

function cocokkanNama(nilai: string): string {
  return ALIAS_NEGARA[nilai] ?? nilai;
}

/** Interpolasi hex 2 warna, t antara 0..1. */
function campurWarna(warnaA: string, warnaB: string, t: number): string {
  const a = parseInt(warnaA.slice(1), 16);
  const b = parseInt(warnaB.slice(1), 16);
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

/** Skala warna: rendah = hijau, tengah = kuning, tinggi = merah. */
function warnaJumlah(jumlah: number, min: number, max: number): string {
  if (max === min) return "#22c55e";
  const t = (jumlah - min) / (max - min);
  if (t < 0.5) return campurWarna("#22c55e", "#eab308", t / 0.5);
  return campurWarna("#eab308", "#dc2626", (t - 0.5) / 0.5);
}

export function PetaNegaraKedatangan({ data }: { data: DataNegara[] }) {
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/world-countries.geo.json")
      .then((res) => {
        if (!res.ok) throw new Error("File GeoJSON tidak ditemukan di /public/data/world-countries.geo.json");
        return res.json();
      })
      .then((json) => setGeoJson(json))
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat peta dunia."))
      .finally(() => setLoading(false));
  }, []);

  // Peta nilai(negara ternormalisasi -> jumlah), untuk lookup cepat saat render tiap polygon.
  const petaJumlah = useMemo(() => {
    const peta = new Map<string, number>();
    data.forEach((d) => {
      if (d.nilai.toLowerCase() === "tidak diisi") return;
      peta.set(cocokkanNama(d.nilai).toLowerCase(), d.jumlah);
    });
    return peta;
  }, [data]);

  const { min, max } = useMemo(() => {
    const nilaiJumlah = Array.from(petaJumlah.values());
    if (nilaiJumlah.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...nilaiJumlah), max: Math.max(...nilaiJumlah) };
  }, [petaJumlah]);

  // Negara di data kita yang TIDAK ketemu di GeoJSON -- ditampilkan di legenda sebagai catatan.
  const tidakDitemukan = useMemo(() => {
    if (!geoJson) return [];
    const namaDiPeta = new Set(
      geoJson.features.map((f) => String(f.properties?.name ?? "").toLowerCase())
    );
    return data
      .filter((d) => d.nilai.toLowerCase() !== "tidak diisi")
      .filter((d) => !namaDiPeta.has(cocokkanNama(d.nilai).toLowerCase()));
  }, [geoJson, data]);

  function gayaNegara(feature?: Feature<Geometry>) {
    const nama = String(feature?.properties?.name ?? "").toLowerCase();
    const jumlah = petaJumlah.get(nama);
    return {
      fillColor: jumlah !== undefined ? warnaJumlah(jumlah, min, max) : "#e5e7eb",
      fillOpacity: jumlah !== undefined ? 0.75 : 0.3,
      color: "#94a3b8",
      weight: 0.5,
    };
  }

  function saatEachFeature(feature: Feature<Geometry>, layer: L.Layer) {
    const nama = String(feature.properties?.name ?? "Tidak diketahui");
    const jumlah = petaJumlah.get(nama.toLowerCase());
    layer.bindPopup(
      jumlah !== undefined
        ? `<div style="font-size:13px"><strong>${nama}</strong><br/>${jumlah} kapal</div>`
        : `<div style="font-size:13px"><strong>${nama}</strong><br/>Tidak ada data kedatangan</div>`
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg bg-bg text-sm text-muted">
        Memuat peta dunia...
      </div>
    );
  }

  if (error || !geoJson) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg bg-bg p-4 text-center text-sm text-risiko-merah">
        {error ?? "Gagal memuat peta dunia."}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="font-semibold uppercase tracking-wide">Skala jumlah kapal:</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
          <span>Rendah ({min})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#eab308" }} />
          <span>Sedang</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
          <span>Tinggi ({max})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#e5e7eb" }} />
          <span>Tidak ada data</span>
        </div>
      </div>

      <div className="relative isolate h-[420px] w-full overflow-hidden rounded-xl border">
        <MapContainer center={PUSAT_PETA} zoom={ZOOM_AWAL} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <GeoJSON data={geoJson} style={gayaNegara} onEachFeature={saatEachFeature} />
        </MapContainer>
      </div>

      {tidakDitemukan.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Tidak ditemukan di peta (nama mungkin beda ejaan): {tidakDitemukan.map((d) => d.nilai).join(", ")}.
        </p>
      )}
    </div>
  );
}