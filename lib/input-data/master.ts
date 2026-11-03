// lib/input-data/master.ts
// SERVER-ONLY. Master pelabuhan -> negara: dipakai bersama oleh semua wilayah kerja.
import { getDbClient, type DbValue } from '@/lib/db/client';
import { bacaGrid, petakanKolom } from './parse-excel';
import { cariNegara, kunciPelabuhan } from './pelabuhan';
import { kunciJudul } from './modul';
import { selMentah } from './nilai';
import { ubahTeks } from './nilai';
import type { NilaiBaris } from './validasi';

export async function petaMaster(): Promise<Map<string, string>> {
  const r = await getDbClient().execute('SELECT kunci, negara FROM master_pelabuhan_negara');
  return new Map(r.rows.map((x) => [String(x.kunci), String(x.negara)]));
}

/** Isi negara_kedatangan yang masih kosong dari pelabuhan_kedatangan. Mengembalikan pelabuhan yang tidak ada di master. */
export async function isiNegara(baris: NilaiBaris[]): Promise<{ terisi: number; tidakCocok: string[] }> {
  const peta = await petaMaster();
  const tidak = new Set<string>();
  let terisi = 0;
  for (const b of baris) {
    if (b.negara_kedatangan != null || b.pelabuhan_kedatangan == null) continue;
    const n = cariNegara(peta, String(b.pelabuhan_kedatangan));
    if (n) { b.negara_kedatangan = n; terisi++; } else tidak.add(String(b.pelabuhan_kedatangan));
  }
  return { terisi, tidakCocok: [...tidak].sort() };
}

export async function daftarMaster(cari: string, halaman: number, ukuran = 50) {
  const where = cari ? 'WHERE nama_pelabuhan LIKE ? OR negara LIKE ?' : '';
  const args: DbValue[] = cari ? [`%${cari}%`, `%${cari}%`] : [];
  const db = getDbClient();
  const ukur = Math.min(Math.max(ukuran, 1), 200);
  const [jml, isi] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) n FROM master_pelabuhan_negara ${where}`, args }),
    db.execute({
      sql: `SELECT id, nama_pelabuhan, negara FROM master_pelabuhan_negara ${where} ORDER BY nama_pelabuhan LIMIT ${ukur} OFFSET ${(Math.max(halaman, 1) - 1) * ukur}`,
      args,
    }),
  ]);
  return { total: Number(jml.rows[0]?.n ?? 0), baris: isi.rows, ukuran: ukur };
}

/** Tambah atau ubah (kunci sama -> negara diperbarui). */
export async function simpanMaster(nama: string, negara: string, pengguna: string): Promise<'ok' | 'galat'> {
  const n = nama.replace(/\s+/g, ' ').trim();
  const g = negara.replace(/\s+/g, ' ').trim();
  const k = kunciPelabuhan(n);
  if (!n || !g || !k || n.length > 255 || g.length > 100) return 'galat';
  await getDbClient().execute({
    sql: `INSERT INTO master_pelabuhan_negara (kunci, nama_pelabuhan, negara, dibuat_oleh) VALUES (?,?,?,?)
          ON CONFLICT (kunci) DO UPDATE SET negara = EXCLUDED.negara, nama_pelabuhan = EXCLUDED.nama_pelabuhan`,
    args: [k, n, g, pengguna.slice(0, 255)],
  });
  return 'ok';
}

export async function hapusMaster(id: number): Promise<number> {
  const r = await getDbClient().execute({ sql: 'DELETE FROM master_pelabuhan_negara WHERE id = ?', args: [id] });
  return r.rowsAffected;
}

/** Unggah Excel/Sinkarkes master: kolom "Nama Pelabuhan" dan "Negara". Baris sah disimpan (tambah atau perbarui). */
export async function unggahMaster(buffer: Buffer, pengguna: string, simpan: boolean) {
  const g = await bacaGrid(buffer);
  if ('fatal' in g) return { fatal: g.fatal };
  const peta = new Map([
    [kunciJudul('Nama Pelabuhan'), 'pelabuhan'], [kunciJudul('Pelabuhan'), 'pelabuhan'],
    [kunciJudul('Negara'), 'negara'],
  ]);
  const pk = petakanKolom(g.grid, peta);
  const ada = pk ? new Set(pk.kolomKe.values()) : new Set<string>();
  if (!pk || !ada.has('pelabuhan') || !ada.has('negara')) return { fatal: 'Kolom "Nama Pelabuhan" dan "Negara" tidak ditemukan.' };
  const sah: { nama: string; negara: string }[] = [];
  const galat: { baris: number; pesan: string }[] = [];
  const terlihat = new Set<string>();
  const kol = new Map([...pk.kolomKe].map(([n, v]) => [v, n]));
  for (let r = pk.barisJudul + 1; r < g.grid.length; r++) {
    const a = ubahTeks(selMentah(g.grid[r][kol.get('pelabuhan')!]));
    const b = ubahTeks(selMentah(g.grid[r][kol.get('negara')!]), 100);
    if ((!a.ok || a.nilai === null) && (!b.ok || b.nilai === null)) continue;
    if (!a.ok || a.nilai === null || !b.ok || b.nilai === null) { galat.push({ baris: r + 1, pesan: 'Nama Pelabuhan dan Negara harus terisi' }); continue; }
    const k = kunciPelabuhan(a.nilai);
    if (!k) { galat.push({ baris: r + 1, pesan: 'Nama pelabuhan tidak valid' }); continue; }
    if (terlihat.has(k)) { galat.push({ baris: r + 1, pesan: 'Nama pelabuhan ganda di berkas (dilewati)' }); continue; }
    terlihat.add(k);
    sah.push({ nama: a.nilai, negara: b.nilai });
  }
  if (simpan) for (const s of sah) await simpanMaster(s.nama, s.negara, pengguna);
  return { fatal: null, jumlahBaris: sah.length + galat.length, sah: sah.length, ditolak: galat.length, galat: galat.slice(0, 200), disimpan: simpan };
}

/** Pelabuhan kedatangan di data COP yang negara-nya kosong dan belum ada di master, dengan jumlah kapal. */
export async function belumTerdaftar(): Promise<{ pelabuhan: string; jumlah: number }[]> {
  const r = await getDbClient().execute(
    `SELECT pelabuhan_kedatangan AS p, COUNT(*) AS n FROM kegiatan_cop
     WHERE pelabuhan_kedatangan IS NOT NULL AND pelabuhan_kedatangan <> '' AND (negara_kedatangan IS NULL OR negara_kedatangan = '')
     GROUP BY pelabuhan_kedatangan ORDER BY n DESC LIMIT 500`,
  );
  const peta = await petaMaster();
  return r.rows.filter((x) => !cariNegara(peta, String(x.p))).map((x) => ({ pelabuhan: String(x.p), jumlah: Number(x.n) }));
}

/** Terapkan master ke data COP yang negara-nya masih kosong. Mengembalikan jumlah baris yang terisi. */
export async function terapkanMasterKeData(): Promise<number> {
  const db = getDbClient();
  const peta = await petaMaster();
  const r = await db.execute(
    `SELECT DISTINCT pelabuhan_kedatangan AS p FROM kegiatan_cop
     WHERE pelabuhan_kedatangan IS NOT NULL AND pelabuhan_kedatangan <> '' AND (negara_kedatangan IS NULL OR negara_kedatangan = '')`,
  );
  let total = 0;
  for (const x of r.rows) {
    const n = cariNegara(peta, String(x.p));
    if (!n) continue;
    const u = await db.execute({
      sql: `UPDATE kegiatan_cop SET negara_kedatangan = ? WHERE pelabuhan_kedatangan = ? AND (negara_kedatangan IS NULL OR negara_kedatangan = '')`,
      args: [n, String(x.p)],
    });
    total += u.rowsAffected;
  }
  return total;
}
