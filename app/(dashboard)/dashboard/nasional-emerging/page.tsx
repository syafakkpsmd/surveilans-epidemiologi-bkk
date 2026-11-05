// app/(dashboard)/nasional-emerging/page.tsx

import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getBanyakHasilAI, kunciAI } from '@/lib/ai/getBanyakHasilAI';
import { DAFTAR_PENYAKIT_NASIONAL } from '@/lib/ai/konstanta-penyakit';
import DashboardNasionalEmerging from '@/components/nasional-emerging/DashboardNasionalEmerging';
import { getPenyakitTambahan } from '@/lib/db/modul/nasionalEmerging';

export default async function NasionalEmergingPage() {
  const { sudahLogin, role } = await getStatusAkses();
  const bisaInput = sudahLogin && (role === 'petugas' || role === 'admin');
  const penyakitTambahan = await getPenyakitTambahan().catch(() => [] as string[]);

  // PENTING: kombinasi di bawah HARUS PERSIS SAMA dengan nilai default useState di
  // DashboardNasionalEmerging.tsx (penyakit, tahun, modeRentang, mgDari, mgSampai).
  const penyakitDefault = DAFTAR_PENYAKIT_NASIONAL[0];
  const tahunDefault = 2026;
  const periodeKeyDefault = `${tahunDefault}-W1_W53`; // mingguan, mgDari=1, mgSampai=53

  const permintaanDefault = [
    { konteks: 'nasional-emerging-mingguan', periodeKey: periodeKeyDefault, wilayahKerja: undefined, metrik: penyakitDefault, tipe: 'analisis' as const },
    { konteks: 'nasional-emerging-mingguan', periodeKey: periodeKeyDefault, wilayahKerja: undefined, metrik: penyakitDefault, tipe: 'prediksi' as const },
  ];
  const hasilAI = await getBanyakHasilAI(permintaanDefault);

  return (
    <>
      {bisaInput && (
        <div className="mx-auto flex max-w-6xl justify-end gap-2 px-4 pt-6">
          <Link href="/dashboard/nasional-emerging/edit"
            className="rounded-lg border border-[#0F4C5C] px-4 py-2 text-sm font-medium text-[#0F4C5C] hover:bg-white">
            Edit Data
          </Link>
          <Link href="/dashboard/nasional-emerging/input"
            className="rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            + Input Data
          </Link>
        </div>
      )}

      <DashboardNasionalEmerging
        sudahLogin={sudahLogin}
        role={role}
        penyakitTambahan={penyakitTambahan}
        hasilAwalInisial={{
          comboKeyDasar: `nasional-emerging-mingguan|${periodeKeyDefault}|${penyakitDefault}`,
          analisis: hasilAI[kunciAI({ konteks: 'nasional-emerging-mingguan', periodeKey: periodeKeyDefault, wilayahKerja: undefined, metrik: penyakitDefault, tipe: 'analisis' })] ?? null,
          prediksi: hasilAI[kunciAI({ konteks: 'nasional-emerging-mingguan', periodeKey: periodeKeyDefault, wilayahKerja: undefined, metrik: penyakitDefault, tipe: 'prediksi' })] ?? null,
        }}
      />
    </>
  );
}