// lib/vektor/simpan.ts
//
// Penyimpanan data vektor ke MariaDB. Dipisah dari server action agar bisa diuji langsung.
// Trigger `trg_hitung_*` mengisi HI/CI/BI/ABJ/TSI/MBR dll. saat INSERT, jadi tidak dihitung di sini.
import type { DbClient } from '../db/client';
import { konversiBaris } from './impor';
import type { DefinisiVektor } from './skema-input';

export type ModeSimpan = 'lewati' | 'perbarui';

export interface HasilSimpan {
  disimpan: number;
  diperbarui: number;
  dilewati: number;
  galat: { indeks: number; pesan: string }[];
}

/**
 * Simpan baris (nilai sudah dinormalisasi di browser, TETAPI divalidasi ulang di sini).
 *  - mode 'lewati'  : baris yang sudah ada (kunci sama) dilewati
 *  - mode 'perbarui': baris lama dihapus lalu diganti baris baru (trigger hitung ulang saat INSERT)
 * Satu transaksi; kegagalan satu baris (mis. FK/CHECK) dilaporkan dan baris lain tetap lanjut.
 */
export async function simpanBarisVektor(
  db: DbClient,
  def: DefinisiVektor,
  baris: Record<string, unknown>[],
  mode: ModeSimpan,
  inputOleh: string | null,
): Promise<HasilSimpan> {
  const hasil: HasilSimpan = { disimpan: 0, diperbarui: 0, dilewati: 0, galat: [] };
  // jenis tanpa kunci alami unik (Aedes, Lalat, Kecoa) tidak mendukung "perbarui"
  const modeEfektif: ModeSimpan = def.dukungPerbarui ? mode : 'lewati';

  const valid: { indeks: number; nilai: Record<string, string | number | null> }[] = [];
  baris.forEach((mentah, indeks) => {
    const h = konversiBaris(def, mentah);
    if (h.galat.length) hasil.galat.push({ indeks, pesan: h.galat.join('; ') });
    else valid.push({ indeks, nilai: h.nilai });
  });
  if (valid.length === 0) return hasil;

  const trx = await db.transaction();
  try {
    await trx.execute('SET @lewati_trigger_hitung = NULL');

    for (const { indeks, nilai } of valid) {
      try {
        const lengkap: Record<string, string | number | null> = { ...nilai, ...def.nilaiTetap };

        // cari baris yang sama (perbandingan null-aman <=>)
        const syarat = def.kunciDuplikat.map((c) => `\`${c}\` <=> ?`).join(' AND ');
        const ada = await trx.execute({
          sql: `SELECT id FROM \`${def.tabel}\` WHERE ${syarat}`,
          args: def.kunciDuplikat.map((c) => lengkap[c] ?? null),
        });

        if (ada.rows.length > 0) {
          if (modeEfektif === 'lewati') { hasil.dilewati++; continue; }
          const idLama = ada.rows.map((r) => r.id);
          await trx.execute({ sql: `DELETE FROM \`${def.tabel}\` WHERE id IN (${idLama.map(() => '?').join(',')})`, args: idLama });
        }

        // hanya kolom berisi: kolom kosong memakai DEFAULT bawaan tabel
        const kolom = Object.keys(lengkap).filter((c) => lengkap[c] !== null);
        const nilaiKolom = kolom.map((c) => lengkap[c]);
        if (def.adaInputOleh && inputOleh) { kolom.push('input_oleh'); nilaiKolom.push(inputOleh); }

        await trx.execute({
          sql: `INSERT INTO \`${def.tabel}\` (${kolom.map((c) => `\`${c}\``).join(', ')}) VALUES (${kolom.map(() => '?').join(', ')})`,
          args: nilaiKolom,
        });
        if (ada.rows.length > 0) hasil.diperbarui++; else hasil.disimpan++;
      } catch (err) {
        hasil.galat.push({ indeks, pesan: pesanDb(err) });
      }
    }
    await trx.commit();
  } catch (err) {
    await trx.rollback().catch(() => undefined);
    throw err;
  }
  return hasil;
}

function pesanDb(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/foreign key/i.test(m)) return 'Wilayah kerja tidak terdaftar di database';
  if (/CONSTRAINT|CHECK/i.test(m)) return 'Ada nilai yang ditolak aturan database (periksa pilihan Zona/Sub Lokasi/Hasil)';
  if (/Duplicate entry/i.test(m)) return 'Data dengan kunci yang sama sudah ada';
  if (/Out of range|Data too long|Incorrect/i.test(m)) return 'Ada nilai yang terlalu besar/panjang untuk kolomnya';
  return m.slice(0, 200);
}
