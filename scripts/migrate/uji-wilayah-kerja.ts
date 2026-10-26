// Uji Langkah B (penyeragaman wilayah kerja): memastikan daftar yang kini DITURUNKAN dari lib/wilayah-kerja
// bernilai SAMA PERSIS dengan daftar tulisan-tangan sebelum diganti (jadi tampilan tidak berubah),
// dan bahwa kode dan tabel master di database tidak saling menyimpang.
//
//   npx tsx --env-file=.env.local scripts/migrate/uji-wilayah-kerja.ts
// Tanpa DB_USER/DB_NAME, pemeriksaan database dilewati.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WILAYAH_KERJA, NAMA_PENDEK_BY_KODE, NAMA_PANJANG_BY_KODE, OPSI_WILKER_PETA, kodeDariTeks, namaDariKode, isKodeWilker } from '@/lib/wilayah-kerja';
import { NAMA_WILKER as NAMA_KARHUTLA } from '@/lib/karhutla/constants';
import { DAFTAR_WILKER } from '@/lib/status-laporan/core';
import { getDbClient, tutupDb } from '@/lib/db/client';

const lama = JSON.parse(readFileSync('scripts/migrate/wilker_snapshot_lama.json', 'utf8'));
let gagal = 0;
function cek(nama: string, fn: () => void) {
  try { fn(); console.log(`OK     ${nama}`); }
  catch (e) { gagal++; console.log(`GAGAL  ${nama}\n         ${(e as Error).message.split('\n').slice(0, 4).join(' | ').slice(0, 300)}`); }
}

async function main() {
  console.log('--- A. nilai turunan == nilai lama (tulisan tangan) ---');
  cek('karhutla/constants NAMA_WILKER (modul asli)', () => assert.deepEqual({ ...NAMA_KARHUTLA }, lama.karhutla_NAMA_WILKER));
  cek('status-laporan/core DAFTAR_WILKER (modul asli)', () => assert.deepEqual(JSON.parse(JSON.stringify(DAFTAR_WILKER)), lama.core_DAFTAR_WILKER));
  cek('ai/data NAMA_WILKER (nama panjang)', () => assert.deepEqual({ ...NAMA_PANJANG_BY_KODE }, lama.ai_NAMA_WILKER));
  cek('malaria KODE_KE_KATA_KUNCI_WILKER (nama pendek)', () => assert.deepEqual({ ...NAMA_PENDEK_BY_KODE }, lama.malaria_KATA_KUNCI));
  cek('peta KelolaFasilitasClient WILKER_LIST', () => assert.deepEqual(OPSI_WILKER_PETA, lama.peta_KelolaFasilitas));
  cek('peta WilkerSelector WILKER_LIST (INDUK + opsi)', () =>
    assert.deepEqual([{ kode: 'INDUK', nama: '🏢 Kantor Induk BKK Kelas I Samarinda' }, ...OPSI_WILKER_PETA], lama.peta_WilkerSelector));
  cek('peta FormFasilitas <option> WK01-WK07', () => assert.deepEqual(OPSI_WILKER_PETA, lama.peta_FormFasilitas));

  console.log('\n--- B. penerjemah penulisan -> kode ---');
  cek('semua bentuk penulisan menghasilkan kode yang benar', () => {
    for (const w of WILAYAH_KERJA) {
      const bentuk = [w.kode, w.kode.toLowerCase(), w.nama, w.namaPendek, w.namaPeta, w.namaPendek.replace(/ /g, ''), w.namaPendek.replace(/ /g, '_'),
        w.namaPendek.toUpperCase(), `  ${w.namaPendek}  `, ...(w.jenis === 'Pelabuhan' ? [`Pelabuhan Laut ${w.namaPendek}`] : [])];
      for (const b of bentuk) assert.equal(kodeDariTeks(b), w.kode, `"${b}" -> ${kodeDariTeks(b)} (harusnya ${w.kode})`);
    }
  });
  cek('penulisan tak dikenal ditolak (null), tidak ditebak', () => {
    for (const x of ['Tg. Laut', 'Balikpapan', '', '   ', 'WK99', 'Pelabuhan', null, undefined]) assert.equal(kodeDariTeks(x as string), null, String(x));
  });
  cek('isKodeWilker dan namaDariKode', () => {
    assert.ok(isKodeWilker('WK07') && !isKodeWilker('WK08') && !isKodeWilker('INDUK'));
    assert.equal(namaDariKode('WK07'), 'Bandara APT Pranoto');
    assert.equal(namaDariKode('WK02', 'pendek'), 'Tanjung Santan');
    assert.equal(namaDariKode('XX'), undefined);
  });

  console.log('\n--- C. kode vs tabel master di database ---');
  if (!process.env.DB_USER || !process.env.DB_NAME) { console.log('(dilewati: DB_USER/DB_NAME tidak diisi)'); }
  else {
    const db = getDbClient();
    const ref = (await db.execute('SELECT kode, nama, jenis FROM wilker_ref')).rows;
    cek('wilker_ref memuat ke-7 kode baku', () => { for (const w of WILAYAH_KERJA) assert.ok(ref.some((r) => r.kode === w.kode), `${w.kode} tidak ada di wilker_ref`); });
    const beda = WILAYAH_KERJA.filter((w) => { const r = ref.find((x) => x.kode === w.kode); return r && (r.nama !== w.nama || r.jenis !== w.jenis); });
    if (beda.length) console.log(`AVISO  nama/jenis di wilker_ref berbeda dari kode untuk: ${beda.map((w) => `${w.kode} (db="${ref.find((x) => x.kode === w.kode)!.nama}" kode="${w.nama}")`).join('; ')}\n         (bukan kegagalan: periksa mana yang benar, lalu samakan salah satunya)`);
    const alias = (await db.execute('SELECT wilayah_kerja_teks AS teks, kode_wilker AS kode FROM wilker_nama_alias')).rows;
    cek(`semua ${alias.length} alias di database diterjemahkan kode ke kode yang sama`, () => {
      for (const a of alias) assert.equal(kodeDariTeks(String(a.teks)), a.kode, `alias "${a.teks}": db=${a.kode}, kode=${kodeDariTeks(String(a.teks))}`);
    });
    await tutupDb();
  }
  console.log(gagal ? `\n${gagal} PEMERIKSAAN GAGAL` : '\nSEMUA PEMERIKSAAN LULUS');
  process.exit(gagal ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
