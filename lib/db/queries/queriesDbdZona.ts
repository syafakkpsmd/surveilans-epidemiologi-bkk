// lib/db/queries/queriesDbdZona.ts
// Rincian survei DBD per zona dan sub lokasi untuk halaman Aedes. Semua indeks dihitung dari TOTAL
// (rumah/container), bukan rata-rata indeks per survei, supaya survei kecil dan besar berbobot sesuai ukurannya.
import { getDbClient } from '@/lib/db/client';
import type { DbValue } from '@/lib/db/client';
import { getRentangMingguEpid } from '@/lib/db/queries/queriesVektorBreakdown';
import { hitungIndeks } from '@/lib/vektor/dbd/config';

export interface FilterRincianDbd {
  tahun: number;
  /** Rentang minggu epid (mode mingguan). */
  mgDari?: number;
  mgSampai?: number;
  /** Rentang bulan "YYYY-MM" (mode bulanan). */
  bulanDari?: string;
  bulanSampai?: string;
  kodeWilker?: string;
  zona?: string;
  subLokasi?: string;
}

export interface BarisSubLokasi {
  zona: string;
  subLokasi: string | null;
  survei: number;
  rumah: number;
  rumahPositif: number;
  container: number;
  containerPositif: number;
  hi: number;
  ci: number;
  bi: number;
  abj: number;
}

/** HI per bulan untuk perbandingan zona (null = zona itu tidak disurvei bulan tersebut). */
export interface TitikZonaBulan {
  bulan: string; // YYYY-MM
  label: string; // "Mar 2026"
  perimeter: number | null;
  buffer: number | null;
}

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const keIso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

function rentangTanggal(f: FilterRincianDbd): { mulai: string; selesai: string } {
  if (f.mgDari && f.mgSampai) {
    return { mulai: keIso(getRentangMingguEpid(f.tahun, f.mgDari).mulai), selesai: keIso(getRentangMingguEpid(f.tahun, f.mgSampai).selesai) };
  }
  if (f.bulanDari && f.bulanSampai) {
    const [thn, bln] = f.bulanSampai.split('-').map(Number);
    return { mulai: `${f.bulanDari}-01`, selesai: new Date(Date.UTC(thn, bln, 0)).toISOString().slice(0, 10) };
  }
  return { mulai: `${f.tahun}-01-01`, selesai: `${f.tahun}-12-31` };
}

const urutZona = (z: string) => (z === 'Perimeter' ? 0 : 1);

export async function getRincianZonaSubLokasi(f: FilterRincianDbd): Promise<{ baris: BarisSubLokasi[]; tren: TitikZonaBulan[] }> {
  const { mulai, selesai } = rentangTanggal(f);
  const syarat = ['tgl_survei >= ?::date', 'tgl_survei <= ?::date'];
  const args: DbValue[] = [mulai, selesai];
  if (f.kodeWilker && f.kodeWilker !== 'Semua') { syarat.push('kode_wilker = ?'); args.push(f.kodeWilker); }
  if (f.zona === 'Perimeter' || f.zona === 'Buffer') { syarat.push('zona = ?'); args.push(f.zona); }
  if (f.subLokasi) { syarat.push("lower(coalesce(btrim(sub_lokasi), '')) = lower(?)"); args.push(f.subLokasi); }
  const where = syarat.join(' AND ');
  const db = getDbClient();

  const [perSub, perBulan] = await Promise.all([
    db.execute({
      sql: `SELECT zona, min(nullif(btrim(sub_lokasi), '')) AS sub_lokasi, count(*) AS survei,
                   sum(jml_rumah_diperiksa) AS rumah, sum(jml_positif_jentik) AS rumah_positif,
                   sum(coalesce(container_diperiksa, 0)) AS container, sum(coalesce(container_positif, 0)) AS container_positif
            FROM vektor_dbd WHERE ${where}
            GROUP BY zona, lower(coalesce(btrim(sub_lokasi), ''))`,
      args,
    }),
    db.execute({
      sql: `SELECT to_char(tgl_survei, 'YYYY-MM') AS bulan, zona,
                   sum(jml_rumah_diperiksa) AS rumah, sum(jml_positif_jentik) AS rumah_positif
            FROM vektor_dbd WHERE ${where}
            GROUP BY 1, 2 ORDER BY 1`,
      args,
    }),
  ]);

  const baris: BarisSubLokasi[] = perSub.rows.map((r) => {
    const rumah = Number(r.rumah ?? 0), rumahPositif = Number(r.rumah_positif ?? 0);
    const container = Number(r.container ?? 0), containerPositif = Number(r.container_positif ?? 0);
    const idx = rumah > 0 ? hitungIndeks(rumah, rumahPositif, container, containerPositif) : { hi: 0, ci: 0, bi: 0, abj: 0 };
    return {
      zona: String(r.zona ?? ''), subLokasi: r.sub_lokasi == null ? null : String(r.sub_lokasi), survei: Number(r.survei ?? 0),
      rumah, rumahPositif, container, containerPositif, ...idx,
    };
  }).sort((a, b) => urutZona(a.zona) - urutZona(b.zona) || b.hi - a.hi || (a.subLokasi ?? '').localeCompare(b.subLokasi ?? '', 'id', { numeric: true }));

  const titik = new Map<string, TitikZonaBulan>();
  for (const r of perBulan.rows) {
    const bulan = String(r.bulan);
    const rumah = Number(r.rumah ?? 0);
    const hi = rumah > 0 ? Math.round((Number(r.rumah_positif ?? 0) / rumah) * 10000) / 100 : null;
    const t = titik.get(bulan) ?? { bulan, label: `${NAMA_BULAN[Number(bulan.slice(5, 7)) - 1]} ${bulan.slice(0, 4)}`, perimeter: null, buffer: null };
    if (r.zona === 'Perimeter') t.perimeter = hi; else if (r.zona === 'Buffer') t.buffer = hi;
    titik.set(bulan, t);
  }
  return { baris, tren: [...titik.values()].sort((a, b) => a.bulan.localeCompare(b.bulan)) };
}