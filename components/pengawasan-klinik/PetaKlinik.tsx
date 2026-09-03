// components/pengawasan-klinik/PetaKlinik.tsx
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// perbaikan default icon Leaflet yang sering rusak di Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type KlinikTitik = {
  id: string;
  nama_klinik: string;
  alamat_klinik: string | null;
  kabupaten_kota: string | null;
  telepon: string | null;
  latitude: number | null;
  longitude: number | null;
  statusTerbaru?: string | null;
};

const WARNA_STATUS: Record<string, string> = {
  memenuhi_syarat: '#16a34a',
  perlu_perbaikan: '#ca8a04',
  tidak_memenuhi_syarat: '#dc2626',
};

export default function PetaKlinik({ daftarKlinik }: { daftarKlinik: KlinikTitik[] }) {
  const titikValid = daftarKlinik.filter(
    (k) => k.latitude != null && k.longitude != null
  );

  const pusatDefault: [number, number] = titikValid.length
    ? [Number(titikValid[0].latitude), Number(titikValid[0].longitude)]
    : [0.5021, 117.1537]; // fallback: sekitar Samarinda

  if (titikValid.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-sm text-gray-500">
        Belum ada klinik dengan titik lokasi tersimpan.
      </div>
    );
  }

  return (
    <div
      className="border rounded-lg overflow-hidden relative"
      style={{ height: 400, isolation: 'isolate', zIndex: 0 }}
    >
      <MapContainer center={pusatDefault} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {titikValid.map((k) => (
          <Marker key={k.id} position={[Number(k.latitude), Number(k.longitude)]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{k.nama_klinik}</p>
                <p className="text-xs text-gray-600">{k.alamat_klinik}</p>
                <p className="text-xs text-gray-600">{k.kabupaten_kota} · {k.telepon}</p>
                {k.statusTerbaru && (
                  <span
                    className="inline-block mt-1 px-2 py-0.5 rounded text-xs text-white"
                    style={{ backgroundColor: WARNA_STATUS[k.statusTerbaru] ?? '#6b7280' }}
                  >
                    {k.statusTerbaru.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}