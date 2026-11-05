// Uji modul wilayah kerja: (A) nilai BAWAAN kode lama masih sama dengan snapshot, (B) penerjemah penulisan -> kode,
// (C) kamus yang dibangun dari tabel wilker_ref/wilker_nama_alias di database konsisten (alias, wilayah nonaktif).
//
//   npx tsx --env-file=.env.local scripts/migrate/uji-wilayah-kerja.ts
// Tanpa DB_USER/DB_NAME, pemeriksaan database dilewati.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WILAYAH_KERJA, NAMA_PENDEK_BY_KODE, NAMA_PANJANG_BY_KODE, OPSI_WILKER_PETA, kodeDariTeks, namaDariKode, isKodeWilker, buatKamus, normalisasiWilayah } from '@/lib/wilayah-kerja';
import { NAMA_WILKER as NAMA_KARHUTLA } from '@/lib/karhutla/constants';
import { daftarWilkerMatriks } from '@/lib/status-laporan/core';
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
  cek('status-laporan/core daftarWilkerMatriks (dari bawaan)', () => assert.deepEqual(JSON.parse(JSON.stringify(daftarWilkerMatriks(buatKamus(WILAYAH_KERJA)))), lama.core_DAFTAR_WILKER));
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

  console.log('\n--- C. kamus dari database ---');
  if (!process.env.DATABASE_URL && (!process.env.DB_USER || !process.env.DB_NAME)) { console.log('(dilewati: DATABASE_URL atau DB_USER/DB_NAME tidak diisi)'); }
  else {
    const db = getDbClient();
    const ref = (await db.execute('SELECT * FROM wilker_ref')).rows;
    const aliasRows = (await db.execute('SELECT wilayah_kerja_teks AS teks, kode_wilker AS kode FROM wilker_nama_alias')).rows;
    const daftar = ref.map((r) => normalisasiWilayah(r, aliasRows.filter((a) => a.kode === r.kode).map((a) => String(a.teks))));
    const kamus = buatKamus(daftar);
    cek('kolom baru wilker_ref sudah ada (migrasi 20 dijalankan)', () => {
      for (const k of ['nama_pendek', 'nama_peta', 'urutan', 'aktif']) assert.ok(k in ref[0], `kolom ${k} belum ada`);
    });
    cek('wilker_ref memuat ke-7 kode baku BKK Samarinda', () => { for (const w of WILAYAH_KERJA) assert.ok(ref.some((r) => r.kode === w.kode), `${w.kode} tidak ada di wilker_ref`); });
    cek(`semua ${aliasRows.length} alias di database diterjemahkan ke kode yang sama`, () => {
      for (const a of aliasRows) assert.equal(kamus.kodeDariTeks(String(a.teks)), a.kode, `alias "${a.teks}": db=${a.kode}, kamus=${kamus.kodeDariTeks(String(a.teks))}`);
    });
    cek('setiap wilayah dikenali dari kode, nama resmi, dan nama pendeknya sendiri', () => {
      for (const w of kamus.semua) for (const b of [w.kode, w.nama, w.namaPendek]) assert.equal(kamus.kodeDariTeks(b), w.kode, `"${b}"`);
    });
    cek('wilayah nonaktif tetap dikenali tetapi tidak ada di daftar aktif', () => {
      for (const w of kamus.semua.filter((x) => !x.aktif)) {
        assert.equal(kamus.kodeDariTeks(w.kode), w.kode);
        assert.ok(!kamus.aktif.some((x) => x.kode === w.kode));
      }
    });
    cek('daftar aktif BKK Samarinda tepat WK01-WK07 (INDUK, WK08, WK09 nonaktif)', () => {
      assert.deepEqual(kamus.daftarKodeAktif, WILAYAH_KERJA.map((w) => w.kode));
    });
    const modul = (await db.execute('SELECT modul, kode_wilker FROM wilker_modul')).rows;
    const awal: Record<string, string> = { poliklinik: 'WK01,WK03,WK04,WK05,WK07', kier: 'WK01,WK03,WK04,WK05,WK07', siaos: 'WK01,WK04,WK07', posko: 'WK01,WK04,WK07', penumpang_kapal: 'WK01,WK04', skdr: 'WK01,WK02,WK03,WK04,WK05,WK06,WK07' };
    for (const [m, w] of Object.entries(awal)) {
      cek(`wilker_modul ${m} = ${w}`, () => assert.equal(modul.filter((r) => r.modul === m).map((r) => String(r.kode_wilker)).sort().join(','), w));
    }
    await tutupDb();
  }
  console.log(gagal ? `\n${gagal} PEMERIKSAAN GAGAL` : '\nSEMUA PEMERIKSAAN LULUS');
  process.exit(gagal ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
