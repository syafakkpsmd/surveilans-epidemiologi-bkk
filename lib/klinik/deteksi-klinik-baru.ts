import { getTursoClient } from '@/lib/turso/client';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export type KlinikBelumTerdaftar = {
  spreadsheetId: string;
  namaKlinik: string;
};

export async function cekKlinikBaru(): Promise<KlinikBelumTerdaftar[]> {
  const client = getTursoClient();

  // Ambil spreadsheet_id + nama_klinik unik dari KEDUA tabel - jaga-jaga klinik baru
  // yang baru punya data stok tapi belum ada data ICV, atau sebaliknya.
  const [hasilIcv, hasilStok] = await Promise.all([
    client.execute('SELECT DISTINCT spreadsheet_id, nama_klinik FROM data_icv'),
    client.execute('SELECT DISTINCT spreadsheet_id, nama_klinik FROM stok_vaksin'),
  ]);

  const petaTurso = new Map<string, string>();
  for (const row of [...hasilIcv.rows, ...hasilStok.rows]) {
    const id = row.spreadsheet_id as string;
    const nama = row.nama_klinik as string;
    if (id && !petaTurso.has(id)) petaTurso.set(id, nama);
  }

  const supabase = createServiceRoleClient();
  const { data: sudahTerdaftar } = await supabase.from('klinik_binaan').select('spreadsheet_id');
  const idSudahAda = new Set((sudahTerdaftar ?? []).map((k) => k.spreadsheet_id).filter(Boolean));

  const belumTerdaftar: KlinikBelumTerdaftar[] = [];
  for (const [spreadsheetId, namaKlinik] of petaTurso) {
    if (!idSudahAda.has(spreadsheetId)) {
      belumTerdaftar.push({ spreadsheetId, namaKlinik });
    }
  }

  return belumTerdaftar;
}