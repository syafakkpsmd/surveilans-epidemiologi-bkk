// lib/turso/sklt.ts
// Import client Turso: samakan dengan yang dipakai di lib/turso/kier.ts
import { getTursoClient } from "@/lib/turso/client";

const turso = getTursoClient();

export type SkltRow = {
  id: number;
  tanggal: string; // yyyy-mm-dd
  inisial: string; // nama disamarkan di server — nama lengkap tidak pernah dikirim ke browser
  maskapai: string;
  rute: string; // nama bandara
  jk: string;
  umur: number | null;
  diagnosis: string;
  laik: 'Laik' | 'Tidak Laik' | 'Belum diisi';
  jenisPenyakit: string;
  gcs: string;
  nadi: number | null;
  suhu: number | null;
  hamil: boolean;
  pendamping: boolean;
  fasilitas: string;
};

const NEGATIF = new Set(['', '-', '--', 'tidak', 'tdk', 'tidak hamil', 'tidak ada', 'no', 'n', '0', 'x']);
const yaFlag = (v: unknown) => !NEGATIF.has(String(v ?? '').trim().toLowerCase());

/** "Muhammad Ali Sadikin" → "M. A. S." */
function inisial(nama: unknown): string {
  const kata = String(nama ?? '').trim().split(/\s+/).filter(Boolean);
  if (!kata.length) return '-';
  return kata.map((k) => k[0].toUpperCase() + '.').join(' ');
}

const angka = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));

export async function getTahunSklt(): Promise<number[]> {
  const rs = await turso.execute(
    `SELECT DISTINCT substr(tanggal,1,4) AS t FROM sklt_penumpang
     WHERE tanggal IS NOT NULL AND tanggal <> '' ORDER BY t DESC`
  );
  return rs.rows.map((r) => Number(r.t)).filter((n) => Number.isFinite(n));
}

export async function getSkltData(tahun: number): Promise<SkltRow[]> {
  const rs = await turso.execute({
    sql: `SELECT id, tanggal, nama, maskapai, rute, jenis_kelamin, umur, diagnosis, status_laik,
                 jenis_penyakit, gcs, nadi, suhu, hamil, pendamping, fasilitas
          FROM sklt_penumpang
          WHERE substr(tanggal,1,4) = ?
          ORDER BY tanggal DESC, no_urut DESC`,
    args: [String(tahun)],
  });

  return rs.rows.map((r) => {
    const laikMentah = String(r.status_laik ?? '');
    return {
      id: Number(r.id),
      tanggal: String(r.tanggal ?? ''),
      inisial: inisial(r.nama),
      maskapai: String(r.maskapai ?? '').trim() || 'Tidak diisi',
      rute: String(r.rute ?? '').trim() || 'Tidak diisi',
      jk: String(r.jenis_kelamin ?? ''),
      umur: angka(r.umur),
      diagnosis: String(r.diagnosis ?? '').trim(),
      laik: laikMentah === 'Laik' || laikMentah === 'Tidak Laik' ? laikMentah : 'Belum diisi',
      jenisPenyakit: String(r.jenis_penyakit ?? ''),
      gcs: String(r.gcs ?? ''),
      nadi: angka(r.nadi),
      suhu: angka(r.suhu),
      hamil: yaFlag(r.hamil),
      pendamping: yaFlag(r.pendamping),
      fasilitas: String(r.fasilitas ?? '').trim(),
    } as SkltRow;
  });
}