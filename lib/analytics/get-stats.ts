// lib/analytics/get-stats.ts
import { createClient } from '@/lib/supabase/server';

export async function getStatistikKunjungan() {
  const supabase = await createClient();

  const tujuhHariLalu = new Date();
  tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7);

  const { data: rows, error } = await supabase
    .from('statistik_kunjungan')
    .select('created_at, tipe, role, kota, wilayah, negara')
    .gte('created_at', tujuhHariLalu.toISOString())
    .order('created_at', { ascending: false });

  if (error || !rows) {
    return { ok: false as const, error: error?.message };
  }

  const totalPageload = rows.filter((r) => r.tipe === 'pageload').length;
  const loginAdmin = rows.filter((r) => r.tipe === 'login' && r.role === 'admin').length;
  const loginPetugas = rows.filter((r) => r.tipe === 'login' && r.role === 'petugas').length;

  // tren 7 hari terakhir
  const hariNama = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const tglStr = d.toLocaleDateString('id-ID');
    labels.push(`${hariNama[d.getDay()]} ${d.getDate()}`);
    values.push(
      rows.filter((r) => new Date(r.created_at).toLocaleDateString('id-ID') === tglStr).length
    );
  }

  // rekap daerah asal (kota/wilayah)
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
    loginAdmin,
    loginPetugas,
    totalLogin: loginAdmin + loginPetugas,
    tren: { labels, values },
    daerahAsal,
    recent,
  };
}