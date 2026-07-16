"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getFasilitas, Fasilitas } from "@/lib/data/fasilitas";
import WilkerSelector from "./WilkerSelector";
import SubPelabuhanSelector from "./SubPelabuhanSelector";
import GaleriFoto from "./GaleriFoto";
import FormFasilitas from "./FormFasilitas";

// Metadata cluster wilker (bukan data fasilitas — cuma titik pusat + level zoom)
const WILKER_META: Record<string, { nama: string; pusat: { lat: number; lng: number }; zoomDetail: number }> = {
  WK01: { nama: "Samarinda", pusat: { lat: -0.5022, lng: 117.1536 }, zoomDetail: 13 },
  WK02: { nama: "Tanjung Santan", pusat: { lat: -0.08, lng: 117.45 }, zoomDetail: 14 },
  WK03: { nama: "Tanjung Laut", pusat: { lat: 0.35, lng: 117.55 }, zoomDetail: 13 },
  WK04: { nama: "Lhok Tuan", pusat: { lat: 0.10, lng: 117.50 }, zoomDetail: 13 },
  WK05: { nama: "Sangatta", pusat: { lat: 0.50, lng: 117.55 }, zoomDetail: 13 },
  WK06: { nama: "Sangkulirang", pusat: { lat: 1.00, lng: 118.00 }, zoomDetail: 13 },
  WK07: { nama: "Bandara APT Pranoto", pusat: { lat: -0.3746, lng: 117.2506 }, zoomDetail: 15 },
};

const PUSAT_SAMARINDA: [number, number] = [-0.5022, 117.1536];
const ZOOM_OVERVIEW = 9;

const iconWilker = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconFasilitas = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
});

function FlyToTarget({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }, [lat, lng, zoom, map]);
  return null;
}

export default function PetaWilker({ isAdmin }: { isAdmin: boolean }) {
  const [fasilitasList, setFasilitasList] = useState<Fasilitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWilker, setSelectedWilker] = useState<string | null>(null);
  const [activeFasilitas, setActiveFasilitas] = useState<Fasilitas | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Fasilitas | null>(null);

  const muatFasilitas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFasilitas();
      setFasilitasList(data);
    } catch (err) {
      console.error("Gagal memuat fasilitas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muatFasilitas();
  }, [muatFasilitas]);

  function handlePilihWilker(kode: string | null) {
    setSelectedWilker(kode);
    setActiveFasilitas(null);
  }

  function handlePilihFasilitas(f: Fasilitas) {
    setActiveFasilitas(f);
  }

  function handleKembali() {
    setSelectedWilker(null);
    setActiveFasilitas(null);
  }

  function handleTambah() {
    setEditTarget(null);
    setShowForm(true);
  }

  function handleEdit(f: Fasilitas) {
    setEditTarget(f);
    setShowForm(true);
  }

  const fasilitasWilkerAktif = selectedWilker
    ? fasilitasList.filter((f) => f.kode_wilker === selectedWilker)
    : [];

  // Tentukan target flyTo saat ini
  let flyTarget: { lat: number; lng: number; zoom: number };
  if (activeFasilitas) {
    flyTarget = { lat: activeFasilitas.lat, lng: activeFasilitas.lng, zoom: 16 };
  } else if (selectedWilker) {
    const meta = WILKER_META[selectedWilker];
    flyTarget = { lat: meta.pusat.lat, lng: meta.pusat.lng, zoom: meta.zoomDetail };
  } else {
    flyTarget = { lat: PUSAT_SAMARINDA[0], lng: PUSAT_SAMARINDA[1], zoom: ZOOM_OVERVIEW };
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <WilkerSelector selected={selectedWilker} onSelect={handlePilihWilker} />
        {isAdmin && (
          <button
            onClick={handleTambah}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
          >
            + Tambah Pelabuhan
          </button>
        )}
      </div>

      {selectedWilker && (
        <SubPelabuhanSelector
          fasilitas={fasilitasWilkerAktif}
          activeId={activeFasilitas?.id ?? null}
          onSelect={handlePilihFasilitas}
        />
      )}

      <div className="relative isolate h-[75vh] w-full rounded-xl overflow-hidden border">
        {(selectedWilker || activeFasilitas) && (
          <button
            onClick={handleKembali}
            className="absolute z-[1000] top-4 left-4 bg-white px-3 py-2 rounded-lg shadow font-medium text-sm hover:bg-gray-50"
          >
            ← Kembali ke Peta Keseluruhan
          </button>
        )}

        {loading && (
          <div className="absolute z-[1000] top-4 right-16 bg-white/90 px-3 py-1.5 rounded-lg shadow text-xs text-gray-500">
            Memuat data fasilitas...
          </div>
        )}

        <MapContainer center={PUSAT_SAMARINDA} zoom={ZOOM_OVERVIEW} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Peta Jalan">
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Citra Satelit">
              <TileLayer
                attribution='Tiles &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <FlyToTarget lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />

          {!selectedWilker &&
            Object.entries(WILKER_META).map(([kode, meta]) => (
              <Marker
                key={kode}
                position={[meta.pusat.lat, meta.pusat.lng]}
                icon={iconWilker}
                eventHandlers={{ click: () => handlePilihWilker(kode) }}
              >
                <Popup>
                  <div className="font-medium">{meta.nama}</div>
                  <div className="text-xs text-gray-500">
                    {kode} · {fasilitasList.filter((f) => f.kode_wilker === kode).length} fasilitas
                  </div>
                </Popup>
              </Marker>
            ))}

          {selectedWilker &&
            fasilitasWilkerAktif.map((f) => (
              <Marker key={f.id} position={[f.lat, f.lng]} icon={iconFasilitas} eventHandlers={{ click: () => handlePilihFasilitas(f) }}>
                <Popup minWidth={220}>
                  <div className="space-y-2">
                    <div>
                      <div className="font-medium">{f.nama}</div>
                      <div className="text-xs text-gray-500 capitalize">{f.tipe}</div>
                      {f.deskripsi && <p className="text-xs text-gray-600 mt-1">{f.deskripsi}</p>}
                    </div>
                    <GaleriFoto fasilitasId={f.id} />
                    {isAdmin && (
                      <button
                        onClick={() => handleEdit(f)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Edit Pelabuhan
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>

      {showForm && (
        <FormFasilitas
          kodeWilkerAktif={selectedWilker}
          fasilitasEdit={editTarget}
          onClose={() => setShowForm(false)}
          onSaved={muatFasilitas}
        />
      )}
    </div>
  );
}