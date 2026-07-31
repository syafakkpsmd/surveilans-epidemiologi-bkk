// lib/analytics/get-stats.ts
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export interface TrendItem {
  label: string;
  jumlah: number;
}

export type PeriodeType = 'harian' | 'mingguan' | 'bulanan' | 'tahunan';

const ZONA_WITA = 'Asia/Makassar';

// Helper: format tanggal (DD/MM/YYYY) sebuah Date di zona WITA, dipakai untuk
// membandingkan "hari yang sama" tanpa salah ambil akibat offset UTC server.
function tglWita(d: Date): string {
  return d.toLocaleDateString('id-ID', { timeZone: ZONA_WITA });
}

// Helper: ambil bagian tanggal (tahun/bulan/hari) sesuai kalender WITA,
// bukan kalender UTC bawaan getMonth()/getFullYear().
function bagianWita(d: Date): { tahun: number; bulan: number; hari: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_WITA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { tahun: get('year'), bulan: get('month') - 1, hari: get('day') }; // bulan 0-indexed spy konsisten sama getMonth()
}

// Helper: format waktu lengkap (tanggal + jam) di zona WITA, untuk tabel Aktivitas Terakhir.
function waktuLengkapWita(d: Date): string {
  return d.toLocaleString('id-ID', {
    timeZone: ZONA_WITA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

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
  ).length;
  const loginAdmin = rows.filter(
    (r) => r.tipe?.toLowerCase() === 'login' && r.role?.toLowerCase() === 'admin'
  ).length;
  const loginPetugas = rows.filter(
    (r) => r.tipe?.toLowerCase() === 'login' && r.role?.toLowerCase() === 'petugas'
  ).length;

  // --- 1. TREN HARIAN (7 Hari Terakhir) — dibandingkan berdasarkan hari kalender WITA ---
  const hariNama = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const trenHarian: TrendItem[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const tglStr = tglWita(d);
    const count = rows.filter((r) => tglWita(new Date(r.created_at)) === tglStr).length;

    // Ambil hari-minggu & tanggal versi WITA (bukan versi lokal server) untuk label
    const { hari } = bagianWita(d);
    const dWita = new Date(d);
    dWita.setDate(hari); // aman dipakai hanya untuk ambil getDay() relatif, label angka pakai `hari` langsung

    trenHarian.push({
      label: `${hariNama[new Date(tglStr.split('/').reverse().join('-')).getDay()]} ${hari}`,
      jumlah: count,
    });
  }

  // --- 2. TREN MINGGUAN (4 Minggu Terakhir) — perbandingan rentang waktu absolut, sudah aman ---
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

  // --- 3. TREN BULANAN (12 Bulan Terakhir) — dikelompokkan berdasarkan bulan kalender WITA ---
  const bulanNama = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const trenBulanan: TrendItem[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const { tahun: yr, bulan: blnIdx } = bagianWita(d);

    const count = rows.filter((r) => {
      const b = bagianWita(new Date(r.created_at));
      return b.bulan === blnIdx && b.tahun === yr;
    }).length;

    trenBulanan.push({
      label: `${bulanNama[blnIdx]} ${yr.toString().slice(-2)}`,
      jumlah: count,
    });
  }

  // --- 4. TREN TAHUNAN (3 Tahun Terakhir) — dikelompokkan berdasarkan tahun kalender WITA ---
  const currentYear = bagianWita(new Date()).tahun;
  const trenTahunan: TrendItem[] = [];
  for (let i = 2; i >= 0; i--) {
    const yr = currentYear - i;
    const count = rows.filter((r) => bagianWita(new Date(r.created_at)).tahun === yr).length;
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

  // --- 10 Aktivitas Terakhir — jam ditampilkan dalam WITA ---
  const recent = rows.slice(0, 10).map((r) => ({
    tgl: waktuLengkapWita(new Date(r.created_at)),
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