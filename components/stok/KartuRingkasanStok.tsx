// components/stok/KartuRingkasanStok.tsx
import { RingkasanStokKlinik, JENIS_STOK_LABEL, ambilSatuan } from '@/lib/klinik/agregasiStok';

export function KartuRingkasanStok({ ringkasan }: { ringkasan: RingkasanStokKlinik[] }) {
  const jenisUnik = Array.from(new Set(ringkasan.map((r) => r.jenisStok)));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {jenisUnik.map((jenis) => {
        const dataJenis = ringkasan.filter((r) => r.jenisStok === jenis);
        const totalSisa = dataJenis.reduce((a, r) => a + r.sisaStokTerkini, 0);
        const jumlahKritis = dataJenis.filter((r) => r.status === 'kritis').length;
        const jumlahKlinikAktif = dataJenis.filter((r) => r.sisaStokTerkini > 0).length;
        const satuan = ambilSatuan(jenis);

        return (
          <div key={jenis} className="rounded-xl bg-white p-4 shadow-xs border border-gray-100">
            <p className="text-xs font-medium text-gray-500">{JENIS_STOK_LABEL[jenis] ?? jenis}</p>
            <p className="text-2xl font-bold text-[#0F2A38] mt-1">{totalSisa.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {satuan} tersisa di {jumlahKlinikAktif} klinik
            </p>
            {jumlahKritis > 0 && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                ⚠ {jumlahKritis} klinik kritis
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}