"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getFasilitas, Fasilitas } from "@/lib/data/fasilitas";
import WilkerSelector from "./WilkerSelector";
import SubPelabuhanSelector from "./SubPelabuhanSelector";
import GaleriFoto from "./GaleriFoto";
import FormFasilitas from "./FormFasilitas";
import { opsiWilkerPeta, pusatOverviewPeta } from "@/lib/wilayah-kerja/peta";
import type { Wilayah } from "@/lib/wilayah-kerja";

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

export default function PetaWilker({ isAdmin, wilayah }: { isAdmin: boolean; wilayah: Wilayah[] }) {
  const opsiWilker = useMemo(() => opsiWilkerPeta(wilayah), [wilayah]);
  const WILKER_META = useMemo(() => Object.fromEntries(opsiWilker.map((w) => [w.kode, w])), [opsiWilker]);
  const PUSAT_OVERVIEW = useMemo(() => pusatOverviewPeta(opsiWilker), [opsiWilker]);
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
    if (kode) {
      const kantor = fasilitasList.find((f) => f.kode_wilker === kode && f.tipe === "kantor");
      setActiveFasilitas(kantor ?? null);
    } else {
      setActiveFasilitas(null);
    }
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

  const fasilitasNonKantor = fasilitasWilkerAktif.filter((f) => f.tipe !== "kantor");

  let flyTarget: { lat: number; lng: number; zoom: number };
  if (activeFasilitas) {
    flyTarget = { lat: activeFasilitas.lat, lng: activeFasilitas.lng, zoom: 16 };
  } else if (selectedWilker) {
    const meta = WILKER_META[selectedWilker];
    flyTarget = meta
      ? { lat: meta.pusat.lat, lng: meta.pusat.lng, zoom: meta.zoomDetail }
      : { lat: PUSAT_OVERVIEW[0], lng: PUSAT_OVERVIEW[1], zoom: ZOOM_OVERVIEW };
  } else {
    flyTarget = { lat: PUSAT_OVERVIEW[0], lng: PUSAT_OVERVIEW[1], zoom: ZOOM_OVERVIEW };
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <WilkerSelector opsi={opsiWilker} selected={selectedWilker} onSelect={handlePilihWilker} />
        {isAdmin && (
          <button
            onClick={handleTambah}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
          >
            + Tambah Fasilitas
          </button>
        )}
      </div>

      {selectedWilker && (
        <SubPelabuhanSelector
          fasilitas={fasilitasNonKantor}
          activeId={activeFasilitas?.id ?? null}
          onSelect={handlePilihFasilitas}
        />
      )}

      <div className="relative isolate h-[75vh] w-full rounded-xl overflow-hidden border">
        {(selectedWilker || activeFasilitas) && (
          <button
            onClick={handleKembali}
            className="absolute z-1000 top-4 left-4 bg-white px-3 py-2 rounded-lg shadow font-medium text-sm hover:bg-gray-50"
          >
            ← Kembali ke Peta Keseluruhan
          </button>
        )}

        {loading && (
          <div className="absolute z-1000 top-4 right-16 bg-white/90 px-3 py-1.5 rounded-lg shadow text-xs text-gray-500">
            Memuat data fasilitas...
          </div>
        )}

        <MapContainer center={PUSAT_OVERVIEW} zoom={ZOOM_OVERVIEW} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
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
            Object.entries(WILKER_META).map(([kode, meta]) => {
              const kantor = fasilitasList.find((f) => f.kode_wilker === kode && f.tipe === "kantor");
              const posisi = kantor ? { lat: kantor.lat, lng: kantor.lng } : meta.pusat;
              return (
                <Marker
                  key={kode}
                  position={[posisi.lat, posisi.lng]}
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
              );
            })}

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
                        Edit Fasilitas
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
          opsiWilker={opsiWilker}
          kodeWilkerAktif={selectedWilker}
          fasilitasEdit={editTarget}
          onClose={() => setShowForm(false)}
          onSaved={muatFasilitas}
        />
      )}
    </div>
  );
}