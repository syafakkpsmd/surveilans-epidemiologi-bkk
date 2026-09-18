import { getWilkerRef } from '@/lib/supabase/queries';
import {
  getRingkasanUtamaMigrasi,
  getBreakdownKategoriMigrasi,
  getBreakdownMultiSelectMigrasi,
  getRuteMigrasiTeratas,
  getDistribusiUsiaMigrasi,
  getTrenMingguanRdtGender,
  getTrenBulananRdtGender,
  getBreakdownKapalPesawat,
} from '@/lib/turso/queriesMigrasiMalaria';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import FilterWilker from '@/components/vektor/FilterWilker';
import FilterRentangMinggu from '@/components/vektor/FilterRentangMinggu';
import FilterRentangBulan from '@/components/vektor/FilterRentangBulan';
import GrafikTrenMultiVariabel from '@/components/vektor/GrafikTrenMultiVariabel';
import GrafikBarBulanan from '@/components/vektor/GrafikBarBulanan';
import BarHorizontalChart from '@/components/vektor/BarHorizontalChart';
import BreakdownList from '@/components/vektor/BreakdownList';
import MultiSelectBarList from '@/components/vektor/MultiSelectBarList';
import DonutChart from '@/components/vektor/DonutChart';
import KpiCard from '@/components/vektor/KpiCard';
import { AnalisisPrediksiMalaria } from '@/components/AnalisisPrediksiMalaria';

type SearchParams = {
  wilker?: string;
  tahun?: string;
  mgDari?: string;
  mgSampai?: string;
  // Format "tahun-bulan", mis. "2026-03" — hanya bagian bulan yang dipakai di sini
  // karena tahunnya sudah mengikuti filter `tahun` global.
  bulanDari?: string;
  bulanSampai?: string;
};

export default async function MalariaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tahun = sp.tahun ? parseInt(sp.tahun, 10) : new Date().getFullYear();
  const kodeWilker = sp.wilker && sp.wilker !== 'Semua' ? sp.wilker : undefined;

  const { mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();
  const mgDari = sp.mgDari ? parseInt(sp.mgDari, 10) : 1;
  const mgSampai = sp.mgSampai ? parseInt(sp.mgSampai, 10) : mingguBerjalan;

  const bulanDari = sp.bulanDari ? parseInt(sp.bulanDari.split('-')[1], 10) : 1;
  const bulanSampai = sp.bulanSampai ? parseInt(sp.bulanSampai.split('-')[1], 10) : 12;

  const [role, daftarWilker] = await Promise.all([getUserRole(), getWilkerRef()]);
  const sudahLogin = role !== null;
  const labelWilayahTerpilih = kodeWilker
    ? daftarWilker.find((w) => w.kode === kodeWilker)?.nama ?? kodeWilker
    : 'Semua Wilayah Kerja';

  const [
    ringkasan,
    jenisKelamin,
    usia,
    pendidikan,
    pekerjaan,
    kapKnowledgeSakit,
    kapKnowledgePenyakit,
    kapKnowledgeGejala,
    kapPakaiBaju,
    kapPakaiTidur,
    kapTempatBerobat,
    kapDekatFaktorRisiko,
    rute,
    trenMingguan,
    trenBulanan,
    kapalPesawat,
  ] = await Promise.all([
    getRingkasanUtamaMigrasi({ tahun, kodeWilker }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'jenis_kelamin' }),
    getDistribusiUsiaMigrasi({ tahun, kodeWilker }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'pendidikan_terakhir' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'pekerjaan' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'pernah_sakit_malaria' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'tahu_penyakit_malaria' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'tahu_gejala_malaria' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'pakai_baju_panjang_repellent' }),
    getBreakdownMultiSelectMigrasi({ tahun, kodeWilker, kolom: 'pakai_saat_tidur' }),
    getBreakdownMultiSelectMigrasi({ tahun, kodeWilker, kolom: 'tempat_berobat' }),
    getBreakdownMultiSelectMigrasi({ tahun, kodeWilker, kolom: 'sekitar_dekat_dengan' }),
    getRuteMigrasiTeratas({ tahun, kodeWilker }),
    getTrenMingguanRdtGender({ tahun, mgDari, mgSampai, kodeWilker }),
    getTrenBulananRdtGender({ tahun, bulanDari, bulanSampai, kodeWilker }),
    getBreakdownKapalPesawat({ tahun, bulanDari, bulanSampai, kodeWilker }),
  ]);

  return (
    <div className="space-y-6 p-4 pt-6 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🔬 Surveilans Migrasi Malaria</h1>
          <p className="text-sm text-gray-500">
            Deteksi dini kasus malaria impor serta pemetaan pengetahuan, sikap, dan perilaku
            berisiko pada penumpang/ABK migran di wilayah kerja BKK Samarinda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
        </div>
      </div>

      {ringkasan.totalResponden === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Belum ada kegiatan tercatat untuk tahun {tahun}.
        </div>
      ) : (
        <>
          {/* KPI headline */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Total Responden Diskrining"
              value={ringkasan.totalResponden.toLocaleString('id-ID')}
            />
            <KpiCard
              label="Diperiksa RDT"
              value={ringkasan.totalDiperiksaRdt.toLocaleString('id-ID')}
              keterangan={
                ringkasan.totalResponden > 0
                  ? `${((ringkasan.totalDiperiksaRdt / ringkasan.totalResponden) * 100).toFixed(0)}% dari total responden`
                  : undefined
              }
            />
            <KpiCard
              label="Positif RDT"
              value={ringkasan.totalPositifRdt.toLocaleString('id-ID')}
              warna={ringkasan.totalPositifRdt > 0 ? 'bahaya' : 'aman'}
            />
            <KpiCard
              label="Angka Positivitas"
              value={`${ringkasan.angkaPositivitas}%`}
              keterangan={`${ringkasan.jumlahWilkerAktif} wilker aktif melapor`}
              warna={ringkasan.angkaPositivitas > 5 ? 'bahaya' : 'aman'}
            />
          </div>

          {/* Donut demografi */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Profil Demografi Responden — Tahun {tahun}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DonutChart judul="Jenis Kelamin" data={jenisKelamin} />
              <DonutChart judul="Kelompok Usia" data={usia} />
              <DonutChart judul="Pendidikan Terakhir" data={pendidikan} />
              <DonutChart judul="Pekerjaan" data={pekerjaan} />
            </div>
          </div>

          {/* KAP (Knowledge-Attitude-Practice) & faktor risiko */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Pengetahuan &amp; Perilaku Berisiko — Tahun {tahun}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <BreakdownList judul="Riwayat Pernah Sakit Malaria" data={kapKnowledgeSakit} warna="#B71C1C" />
              <BreakdownList judul="Tahu tentang Penyakit Malaria" data={kapKnowledgePenyakit} warna="#006064" />
              <BreakdownList judul="Tahu Gejala Penyakit Malaria" data={kapKnowledgeGejala} warna="#0F4C5C" />
              <BreakdownList
                judul="Pakai Baju Panjang/Repellent Malam Hari"
                data={kapPakaiBaju}
                warna="#5D4037"
              />
              <MultiSelectBarList judul="Perlindungan Saat Tidur Malam" data={kapPakaiTidur} warna="#0F4C5C" />
              <MultiSelectBarList judul="Tempat Berobat Saat Sakit" data={kapTempatBerobat} warna="#006064" />
              <MultiSelectBarList
                judul="Kedekatan dengan Faktor Risiko Lingkungan"
                data={kapDekatFaktorRisiko}
                warna="#B71C1C"
              />
            </div>
          </div>

          {/* Tren mingguan RDT & Jenis Kelamin */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700">
                Tren Mingguan — Diperiksa, Positif RDT &amp; Jenis Kelamin
              </h2>
              <FilterRentangMinggu />
            </div>
            <GrafikTrenMultiVariabel
              data={trenMingguan}
              metrikUtama={{ key: 'diperiksa', label: 'Jml. Diperiksa', warna: '#0F4C5C' }}
              seriTambahan={[
                { key: 'positif_rdt', label: 'Positif RDT', warna: '#B71C1C', default: true },
                { key: 'laki_laki', label: 'Laki-laki', warna: '#546E7A', default: false },
                { key: 'perempuan', label: 'Perempuan', warna: '#8D6E63', default: false },
              ]}
            />
          </div>

          {/* Tren bulanan RDT & Jenis Kelamin */}
          <div>
            <div className="mb-2 flex justify-end">
              <FilterRentangBulan />
            </div>
            <GrafikBarBulanan
              judul="Tren Bulanan — Diperiksa, Positif RDT & Jenis Kelamin"
              data={trenBulanan}
              seriesList={[
                { key: 'diperiksa', label: 'Jml. Diperiksa', warna: '#0F4C5C' },
                { key: 'positif_rdt', label: 'Positif RDT', warna: '#B71C1C' },
                { key: 'laki_laki', label: 'Laki-laki', warna: '#546E7A' },
                { key: 'perempuan', label: 'Perempuan', warna: '#8D6E63' },
              ]}
            />
          </div>

          {/* Nama Kapal/Pesawat & rute migrasi */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                Nama Kapal/Pesawat dengan Responden Terbanyak
              </h2>
              <p className="mb-2 text-[11px] text-gray-400">
                Mengikuti rentang bulan &amp; wilayah kerja yang sama dengan tren bulanan di atas.
              </p>
              <BarHorizontalChart data={kapalPesawat} />
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                10 Rute Migrasi dengan Responden Terbanyak — Tahun {tahun}
              </h2>
              <ol className="space-y-1 text-sm text-gray-700">
                {rute.map((r, i) => (
                  <li
                    key={r.rute}
                    className="flex items-center justify-between border-b border-gray-100 py-1 last:border-0"
                  >
                    <span>
                      {i + 1}. {r.rute}
                    </span>
                    <span className="font-semibold text-[#0F2A38]">{r.jumlah}</span>
                  </li>
                ))}
                {rute.length === 0 && <li className="text-gray-400">Belum ada data rute.</li>}
              </ol>
            </div>
          </div>
        </>
      )}

      {/* Analisis & Prediksi AI — selalu di paling bawah, bisa dilihat siapa saja */}
      <AnalisisPrediksiMalaria
        role={role as any}
        sudahLogin={sudahLogin}
        tahun={tahun}
        kodeWilker={kodeWilker}
        labelWilayah={labelWilayahTerpilih}
      />
    </div>
  );
}