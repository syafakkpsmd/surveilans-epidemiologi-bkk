import type { JadwalPesawat } from '@/lib/supabase/queriesPesawat';

const NAMA_BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

function formatTanggalPendek(tanggalIso: string) {
  const d = new Date(tanggalIso);
  return `${d.getDate()} ${NAMA_BULAN_SINGKAT[d.getMonth()]}`;
}

/**
 * Widget "Jadwal Akan Datang" -- khusus menampilkan baris dengan
 * status_data = 'rencana' (tanggal H+2/H+3, penumpang sudah pasti tapi
 * sertifikat belum diisi). Sengaja diberi styling berbeda (border putus-
 * putus + warna amber + badge "RENCANA") supaya user tidak mengira ini
 * data final.
 */
export default function JadwalAkanDatang({ data }: { data: JadwalPesawat[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-400">
        Belum ada jadwal pesawat mendatang yang tercatat.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((jadwal) => (
        <div
          key={jadwal.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-800">
              {formatTanggalPendek(jadwal.tanggal)}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-800">{jadwal.maskapai}</p>
              <p className="text-xs text-gray-500">
                {jadwal.keberangkatan ?? '-'} &rarr; {jadwal.kedatangan ?? '-'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            <span>Berangkat: {jadwal.crew_berangkat} crew, {jadwal.penumpang_berangkat} pnp</span>
            <span>Datang: {jadwal.crew_datang} crew, {jadwal.penumpang_datang} pnp</span>
          </div>

          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Rencana
          </span>
        </div>
      ))}
    </div>
  );
}