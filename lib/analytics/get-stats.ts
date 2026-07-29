// lib/analytics/get-stats.ts
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export interface TrendItem {
  label: string;
  jumlah: number;
}

export type PeriodeType = 'harian' | 'mingguan' | 'bulanan' | 'tahunan';

export async function getStatistikKunjungan() {
  const supabase = createServiceRoleClient();

  // Ambil data 1 tahun terakhir agar mencakup statistik bulanan & harian
  const satuTahunLalu = new Date();
  satuTahunLalu.setFullYear(satuTahunLalu.getFullYear() - 1);

  const { data: rows, error } = await supabase
    .from('statistik_kunjungan')
    .select('created_at, tipe, role, kota, wilayah, negara')
    .gte('created_at', satuTahunLalu.toISOString())
    .order('created_at', { ascending: false })
    .limit(50000);

  if (error || !rows) {
    return { ok: false as const, error: error?.message };
  }

  // Gunakan .toLowerCase() untuk menghindari kendala case-sensitivity
  const totalPageload = rows.filter((r) => r.tipe?.toLowerCase() === 'pageload').length;
  const pageloadTamu = rows.filter(
    (r) => r.tipe?.toLowerCase() === 'pageload' && r.role?.toLowerCase() === 'tamu'
  ).length;   // <-- TAMBAH
  const loginAdmin = rows.filter(
    (r) => r.tipe?.toLowerCase() === 'login' && r.role?.toLowerCase() === 'admin'
  ).length;
  const loginPetugas = rows.filter(
    (r) => r.tipe?.toLowerCase() === 'login' && r.role?.toLowerCase() === 'petugas'
  ).length;

  // --- 1. TREN HARIAN (7 Hari Terakhir) ---
  const hariNama = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const trenHarian: TrendItem[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const tglStr = d.toLocaleDateString('id-ID');
    const count = rows.filter(
      (r) => new Date(r.created_at).toLocaleDateString('id-ID') === tglStr
    ).length;
    trenHarian.push({
      label: `${hariNama[d.getDay()]} ${d.getDate()}`,
      jumlah: count,
    });
  }

  // --- 2. TREN MINGGUAN (4 Minggu Terakhir) ---
  const trenMingguan: TrendItem[] = [];
  for (let i = 3; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const count = rows.filter((r) => {
      const dt = new Date(r.created_at);
      return dt >= start && dt <= end;
    }).length;

    trenMingguan.push({
      label: `Mgg ${4 - i}`,
      jumlah: count,
    });
  }

  // --- 3. TREN BULANAN (12 Bulan Terakhir) ---
  const bulanNama = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const trenBulanan: TrendItem[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const blnIdx = d.getMonth();
    const yr = d.getFullYear();

    const count = rows.filter((r) => {
      const dt = new Date(r.created_at);
      return dt.getMonth() === blnIdx && dt.getFullYear() === yr;
    }).length;

    trenBulanan.push({
      label: `${bulanNama[blnIdx]} ${yr.toString().slice(-2)}`,
      jumlah: count,
    });
  }

  // --- 4. TREN TAHUNAN (3 Tahun Terakhir) ---
  const currentYear = new Date().getFullYear();
  const trenTahunan: TrendItem[] = [];
  for (let i = 2; i >= 0; i--) {
    const yr = currentYear - i;
    const count = rows.filter((r) => new Date(r.created_at).getFullYear() === yr).length;
    trenTahunan.push({
      label: `${yr}`,
      jumlah: count,
    });
  }

  // Rekap Daerah Asal
  const daerahMap: Record<string, number> = {};
  rows.forEach((r) => {
    const label = r.kota && r.kota !== '-' ? `${r.kota}, ${r.wilayah}` : 'Tidak diketahui';
    daerahMap[label] = (daerahMap[label] || 0) + 1;
  });
  const daerahAsal = Object.entries(daerahMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, jumlah]) => ({ label, jumlah }));

  const recent = rows.slice(0, 10).map((r) => ({
    tgl: new Date(r.created_at).toLocaleString('id-ID'),
    role: r.role,
    ket: r.tipe,
    daerah: r.kota !== '-' ? `${r.kota}, ${r.wilayah}, ${r.negara}` : '-',
  }));

  return {
    ok: true as const,
    totalPageload,
    pageloadTamu,
    loginAdmin,
    loginPetugas,
    totalLogin: loginAdmin + loginPetugas,
    tren: {
      harian: trenHarian,
      mingguan: trenMingguan,
      bulanan: trenBulanan,
      tahunan: trenTahunan,
    },
    daerahAsal,
    recent,
  };
}