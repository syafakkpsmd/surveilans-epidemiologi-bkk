import PapanJadwalLive from '@/components/pesawat/PapanJadwalLive';

// Route ini menampilkan data live (lewat PapanJadwalLive -> /api/jadwal-pesawat-live),
// jadi halamannya sendiri juga harus dinamis -- kalau tidak, Next.js bisa
// nge-cache HTML halaman ini secara statis dan pengguna melihat cangkang
// kosong/lama sebelum client-side fetch sempat jalan.
export const dynamic = 'force-dynamic';

export default function HalamanJadwalPesawatLive() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Jadwal Penerbangan Live</h1>
        <p className="text-sm text-gray-500">
          Papan jadwal kedatangan &amp; keberangkatan real-time bandara di wilayah kerja
        </p>
      </div>
      <PapanJadwalLive />
    </div>
  );
}