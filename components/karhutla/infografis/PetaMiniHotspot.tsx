import { WILKER_LOKASI } from '@/lib/data/wilker-lokasi';
import { NAMA_WILKER } from '@/lib/karhutla/constants';

/**
 * Peta mini titik panas -- PETA ASLI (mosaik tile raster OpenStreetMap),
 * BUKAN ilustrasi/siluet SVG.
 *
 * KENAPA PENDEKATAN INI (mosaik <img> tile OSM, bukan MapLibre GL/vector
 * tile seperti versi sebelumnya):
 *
 * 1. 100% GRATIS, TANPA API key, TANPA daftar akun/kartu -- tile.openstreetmap.org
 *    adalah server tile resmi OSM Foundation. Kebijakan resminya (per
 *    https://operations.osmfoundation.org/policies/tiles/) mengizinkan
 *    "normal interactive viewing" tanpa syarat khusus selain mencantumkan
 *    atribusi -- pemakaian di sini (mosaik ~6-12 tile, sekali per
 *    pembuatan info grafis) jauh di bawah ambang itu.
 *
 * 2. TERBUKTI aman di-capture ke JPEG/PDF: tile PNG OSM MEMANG mengirim
 *    header `Access-Control-Allow-Origin: *` (kebijakan resmi sejak 2013),
 *    jadi tidak "menodai" (taint) canvas dan aman dibaca lintas origin.
 *    Ini beda dari pendekatan MapLibre GL (WebGL) sebelumnya, yang harus
 *    disembunyikan di luar viewport, menunggu event 'idle', snapshot
 *    manual ke data URL, baru dihancurkan -- rawan gagal/timeout dan
 *    berakhir jatuh ke ilustrasi siluet.
 *
 * 3. LEBIH SEDERHANA & DETERMINISTIK: hanya <img> biasa yang disusun jadi
 *    grid, diposisikan lewat proyeksi Web Mercator manual (rumus baku yang
 *    sama dipakai semua slippy map/Google Maps/OSM). Tidak butuh WebGL,
 *    tidak butuh state loading/useEffect/timeout sama sekali -- komponen
 *    ini murni fungsi dari props. html-to-image (dipakai saat unduh JPEG/
 *    PDF di InfografisClient) sendiri yang menunggu semua elemen <img>
 *    ini selesai dimuat sebelum merasterisasi, jadi tidak ada race
 *    condition seperti pada versi WebGL sebelumnya.
 *
 * 4. TIDAK ADA fallback otomatis ke ilustrasi siluet lagi -- sesuai
 *    permintaan eksplisit. Kalau satu tile gagal dimuat (mis. benar-benar
 *    offline), browser cukup menampilkan kotak kosong utk tile itu saja.
 */

interface TitikHotspotMini {
  latitude: number;
  longitude: number;
}

const LEBAR = 400;
const TINGGI = 460;
const PADDING = 24;
const UKURAN_TILE = 256;
const ZOOM_MAKS = 14;
const ZOOM_MIN = 4;

// Rumus proyeksi Web Mercator baku (dipakai semua slippy map, termasuk OSM) --
// mengubah lat/lng jadi koordinat piksel di "dunia" pada level zoom tertentu.
function lng2pxX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * UKURAN_TILE * 2 ** zoom;
}
function lat2pxY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * UKURAN_TILE * 2 ** zoom;
}

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

/** Cari level zoom TERBESAR (paling detail) yang membuat seluruh bounds tetap muat di area target. */
function pilihZoom(bounds: ReturnType<typeof hitungBounds>, lebarTarget: number, tinggiTarget: number): number {
  for (let z = ZOOM_MAKS; z >= ZOOM_MIN; z--) {
    const lebarPx = lng2pxX(bounds.lngMax, z) - lng2pxX(bounds.lngMin, z);
    const tinggiPx = lat2pxY(bounds.latMin, z) - lat2pxY(bounds.latMax, z);
    if (lebarPx <= lebarTarget && tinggiPx <= tinggiTarget) return z;
  }
  return ZOOM_MIN;
}

export default function PetaMiniHotspot({ hotspots }: { hotspots: TitikHotspotMini[] }) {
  const bounds = hitungBounds(hotspots);
  const zoom = pilihZoom(bounds, LEBAR - PADDING * 2, TINGGI - PADDING * 2);

  const bboxXMin = lng2pxX(bounds.lngMin, zoom);
  const bboxXMax = lng2pxX(bounds.lngMax, zoom);
  const bboxYMin = lat2pxY(bounds.latMax, zoom); // sisi atas (lat lebih besar => y lebih kecil)
  const bboxYMax = lat2pxY(bounds.latMin, zoom); // sisi bawah

  // Pojok kiri-atas kanvas dlm sistem piksel dunia, supaya bounds berada di tengah kanvas.
  const originX = bboxXMin - (LEBAR - (bboxXMax - bboxXMin)) / 2;
  const originY = bboxYMin - (TINGGI - (bboxYMax - bboxYMin)) / 2;

  const jumlahTileDunia = 2 ** zoom;
  const tileXMin = Math.max(0, Math.floor(originX / UKURAN_TILE));
  const tileXMax = Math.min(jumlahTileDunia - 1, Math.floor((originX + LEBAR) / UKURAN_TILE));
  const tileYMin = Math.max(0, Math.floor(originY / UKURAN_TILE));
  const tileYMax = Math.min(jumlahTileDunia - 1, Math.floor((originY + TINGGI) / UKURAN_TILE));

  const daftarTile: { x: number; y: number; kiri: number; atas: number }[] = [];
  for (let ty = tileYMin; ty <= tileYMax; ty++) {
    for (let tx = tileXMin; tx <= tileXMax; tx++) {
      daftarTile.push({ x: tx, y: ty, kiri: tx * UKURAN_TILE - originX, atas: ty * UKURAN_TILE - originY });
    }
  }

  const proyeksi = (lat: number, lng: number) => ({
    x: lng2pxX(lng, zoom) - originX,
    y: lat2pxY(lat, zoom) - originY,
  });

  return (
    <div style={{ position: 'relative', width: LEBAR, height: TINGGI, overflow: 'hidden', background: '#dce6e0' }}>
      {daftarTile.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element -- <img> biasa (tile PNG OSM),
        // sengaja BUKAN next/image: lazy-load & optimizer eksternalnya bikin html-to-image
        // gagal/kosong saat capture poster ini jadi JPEG/PDF.
        <img
          key={`${zoom}-${t.x}-${t.y}`}
          src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
          alt=""
          crossOrigin="anonymous"
          width={UKURAN_TILE}
          height={UKURAN_TILE}
          style={{
            position: 'absolute',
            left: t.kiri,
            top: t.atas,
            width: UKURAN_TILE,
            height: UKURAN_TILE,
            display: 'block',
          }}
        />
      ))}

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

        {hotspots.map((h, i) => {
          const { x, y } = proyeksi(h.latitude, h.longitude);
          return <circle key={`halo${i}`} cx={x} cy={y} r={14} fill="url(#haloPanasAsli)" />;
        })}
        {hotspots.map((h, i) => {
          const { x, y } = proyeksi(h.latitude, h.longitude);
          return <circle key={i} cx={x} cy={y} r={3.5} fill="#ff8a72" fillOpacity={0.95} stroke="#fff1ee" strokeWidth={0.5} />;
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
          <rect x={-10} y={-16} width={230} height={38} rx={8} fill="#0a1929" fillOpacity={0.55} />
          <circle cx={6} cy={0} r={4} fill="#ff8a72" />
          <text x={16} y={4} fontSize={11} fill="#ffffff">Titik panas</text>
          <circle cx={106} cy={0} r={5} fill="#0f2a38" stroke="#ffd166" strokeWidth={1.5} />
          <text x={118} y={4} fontSize={11} fill="#ffffff">Wilayah kerja</text>
        </g>
      </svg>

      {/* Atribusi WAJIB per kebijakan OpenStreetMap --
          https://operations.osmfoundation.org/policies/tiles/ */}
      <p
        style={{
          position: 'absolute',
          right: 6,
          bottom: 4,
          margin: 0,
          fontSize: 8,
          color: 'rgba(255,255,255,0.9)',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        © OpenStreetMap contributors
      </p>
    </div>
  );
}