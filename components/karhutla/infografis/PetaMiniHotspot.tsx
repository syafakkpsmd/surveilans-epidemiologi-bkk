import { WILKER_LOKASI } from '@/lib/data/wilker-lokasi';
import { NAMA_WILKER } from '@/lib/karhutla/constants';

/**
 * Peta mini titik panas — SENGAJA pakai SVG statis buram-manual, BUKAN
 * Leaflet (seperti PetaHotspotKarhutla.tsx). Leaflet me-render tile map
 * lewat <canvas>/<img> dari server tile eksternal, yang seringkali gagal
 * di-capture html-to-image karena isu CORS/timing saat screenshot.
 * SVG murni di sini dijamin selalu ikut ter-capture dgn benar.
 *
 * Proyeksi equirectangular sederhana (linear lat/lng -> x/y) — cukup
 * akurat utk area sekecil cakupan wilker BKK Samarinda, tidak perlu
 * proyeksi peta yang presisi.
 */

interface TitikHotspotMini {
  latitude: number;
  longitude: number;
}

const LEBAR = 480;
const TINGGI = 620;
const PADDING = 36;

function buatProyeksi(titikTambahan: TitikHotspotMini[]) {
  const semuaLat = [...WILKER_LOKASI.map((w) => w.pusat.lat), ...titikTambahan.map((t) => t.latitude)];
  const semuaLng = [...WILKER_LOKASI.map((w) => w.pusat.lng), ...titikTambahan.map((t) => t.longitude)];

  const latMin = Math.min(...semuaLat) - 0.15;
  const latMax = Math.max(...semuaLat) + 0.15;
  const lngMin = Math.min(...semuaLng) - 0.15;
  const lngMax = Math.max(...semuaLng) + 0.15;

  const rentangLat = latMax - latMin || 1;
  const rentangLng = lngMax - lngMin || 1;

  return (lat: number, lng: number) => {
    const x = PADDING + ((lng - lngMin) / rentangLng) * (LEBAR - PADDING * 2);
    // lat lebih besar = lebih utara = y lebih kecil (SVG y ke bawah)
    const y = PADDING + (1 - (lat - latMin) / rentangLat) * (TINGGI - PADDING * 2);
    return { x, y };
  };
}

export default function PetaMiniHotspot({ hotspots }: { hotspots: TitikHotspotMini[] }) {
  const proyeksi = buatProyeksi(hotspots);

  return (
    <svg
      viewBox={`0 0 ${LEBAR} ${TINGGI}`}
      width={LEBAR}
      height={TINGGI}
      style={{ width: '100%', height: '100%', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x={0} y={0} width={LEBAR} height={TINGGI} rx={12} fill="#eaf3f1" />
      <rect x={4} y={4} width={LEBAR - 8} height={TINGGI - 8} rx={10} fill="none" stroke="#c3d9d5" strokeWidth={1.5} />

      {/* Titik hotspot — merah, ditumpuk transparan biar densitas kelihatan */}
      {hotspots.map((h, i) => {
        const { x, y } = proyeksi(h.latitude, h.longitude);
        return <circle key={i} cx={x} cy={y} r={5} fill="#d62839" fillOpacity={0.55} stroke="#d62839" strokeWidth={0.5} />;
      })}

      {/* Marker wilayah kerja — label pakai nama (Samarinda, APT Pranoto, dst),
          bukan kode WK01/WK07, supaya lebih gampang dibaca orang awam. */}
      {WILKER_LOKASI.map((w) => {
        const { x, y } = proyeksi(w.pusat.lat, w.pusat.lng);
        const nama = NAMA_WILKER[w.kode] ?? w.kode;
        // Marker dekat tepi kanan (mis. Sangkulirang) -> label dibalik ke kiri
        // supaya teks nama yang lebih panjang dari kode tidak kepotong tepi SVG.
        const dekatTepiKanan = x > LEBAR - 130;
        return (
          <g key={w.kode}>
            <circle cx={x} cy={y} r={7} fill="#0f2a38" stroke="#ffffff" strokeWidth={2} />
            <text
              x={dekatTepiKanan ? x - 11 : x + 11}
              y={y + 4}
              textAnchor={dekatTepiKanan ? 'end' : 'start'}
              fontSize={12}
              fontWeight={700}
              fill="#0f2a38"
              style={{ paintOrder: 'stroke', stroke: '#eaf3f1', strokeWidth: 3 }}
            >
              {nama}
            </text>
          </g>
        );
      })}

      {/* Legenda */}
      <g transform={`translate(${PADDING}, ${TINGGI - 26})`}>
        <circle cx={6} cy={0} r={5} fill="#d62839" fillOpacity={0.55} />
        <text x={16} y={4} fontSize={12} fill="#5b7083">Titik panas</text>
        <circle cx={110} cy={0} r={6} fill="#0f2a38" />
        <text x={122} y={4} fontSize={12} fill="#5b7083">Wilayah kerja</text>
      </g>
    </svg>
  );
}
