// app/(dashboard)/nasional-emerging/page.tsx

import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getBanyakHasilAI, kunciAI } from '@/lib/ai/getBanyakHasilAI';
import { DAFTAR_PENYAKIT_NASIONAL } from '@/lib/ai/konstanta-penyakit';
import DashboardNasionalEmerging from '@/components/nasional-emerging/DashboardNasionalEmerging';

export default async function NasionalEmergingPage() {
  const { sudahLogin, role } = await getStatusAkses();

  // ============================================================
  // PENTING: kombinasi di bawah HARUS PERSIS SAMA dengan nilai
  // default useState di DashboardNasionalEmerging.tsx (penyakit,
  // tahun, modeRentang, mgDari, mgSampai). Kalau default di client
  // component itu berubah nanti, kombinasi ini WAJIB disesuaikan
  // juga -- kalau tidak, hasilAwalInisial tidak akan pernah cocok
  // (comboKey mismatch) dan fallback fetch client tetap jalan
  // (aman, cuma prefetch-nya jadi mubazir, bukan bug).
  // ============================================================
  const penyakitDefault = DAFTAR_PENYAKIT_NASIONAL[0];
  const tahunDefault = 2026;
  const periodeKeyDefault = `${tahunDefault}-W1_W53`; // mingguan, mgDari=1, mgSampai=53

  const permintaanDefault = [
    { konteks: 'nasional-emerging-mingguan', periodeKey: periodeKeyDefault, wilayahKerja: undefined, metrik: penyakitDefault, tipe: 'analisis' as const },
    { konteks: 'nasional-emerging-mingguan', periodeKey: periodeKeyDefault, wilayahKerja: undefined, metrik: penyakitDefault, tipe: 'prediksi' as const },
  ];
  const hasilAI = await getBanyakHasilAI(permintaanDefault);

  return (
    <DashboardNasionalEmerging
      sudahLogin={sudahLogin}
      role={role}
      hasilAwalInisial={{
        // Format bebas asal SAMA PERSIS dengan cara client membangun
        // comboKeyDasar-nya sendiri (lihat DashboardNasionalEmerging.tsx).
        // Sengaja TIDAK pakai kunciAI() di sini karena kunciAI menyertakan
        // `tipe`, sedangkan analisis & prediksi perlu berbagi 1 comboKeyDasar
        // yang sama (cuma beda field analisis/prediksi di objek hasil).
        comboKeyDasar: `nasional-emerging-mingguan|${periodeKeyDefault}|${penyakitDefault}`,
        analisis: hasilAI[kunciAI({ konteks: 'nasional-emerging-mingguan', periodeKey: periodeKeyDefault, wilayahKerja: undefined, metrik: penyakitDefault, tipe: 'analisis' })] ?? null,
        prediksi: hasilAI[kunciAI({ konteks: 'nasional-emerging-mingguan', periodeKey: periodeKeyDefault, wilayahKerja: undefined, metrik: penyakitDefault, tipe: 'prediksi' })] ?? null,
      }}
    />
  );
}