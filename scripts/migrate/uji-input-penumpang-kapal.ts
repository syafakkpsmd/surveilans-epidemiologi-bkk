// Uji input manual penumpang kapal (lib/db/modul/inputPenumpangKapal.ts): validasi murni + penulisan ke MariaDB.
// Butuh database UJI dengan tabel data_penumpang_kapal (skema 01 + kolom kode_wilker dari 03). JANGAN ke data asli.
//   DB_USER=epic DB_PASSWORD=epic DB_NAME=epic_uji DB_SOCKET=/run/mysqld/mysqld.sock \
//     npx tsx --test --test-force-exit scripts/migrate/uji-input-penumpang-kapal.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getDbClient, tutupDb } from '../../lib/db/client';
import {
  validasiInput,
  simpanPenumpangKapal,
  getPenumpangKapalTerbaru,
  WILKER_PELABUHAN,
} from '../../lib/db/modul/inputPenumpangKapal';
import type { InputPenumpangKapal } from '../../lib/db/modul/inputPenumpangKapal';

const HARI_INI = '2026-10-27';
const form = (o: Record<string, string>) => {
  const f = new FormData();
  const dasar = { kode_wilker: 'WK01', tanggal_tiba: '2026-10-26', nama_kapal: 'KM Uji', ...o };
  for (const [k, v] of Object.entries(dasar)) f.set(k, v);
  return f;
};
const galat = (o: Record<string, string>) => {
  const h = validasiInput(form(o), HARI_INI);
  assert.ok('error' in h, `harus ditolak: ${JSON.stringify(o)}`);
  return h.error;
};
const sah = (o: Record<string, string>): InputPenumpangKapal => {
  const h = validasiInput(form(o), HARI_INI);
  assert.ok('data' in h, `harus lolos: ${'error' in h ? h.error : ''}`);
  return h.data;
};

const masukan = (o: Partial<InputPenumpangKapal> = {}): InputPenumpangKapal => ({
  kodeWilker: 'WK01', tanggalTiba: '2026-10-26', tanggalBerangkat: null, namaKapal: 'KM Uji',
  abkDatang: 1, abkBerangkat: 2, penumpangDatang: 3, penumpangBerangkat: 4, siaos: null, keterangan: null, ...o,
});

before(async () => {
  await getDbClient().execute("DELETE FROM data_penumpang_kapal WHERE nama_kapal LIKE 'KM Uji%' OR wilker = 'TanjungSantan'");
});
after(async () => {
  await getDbClient().execute("DELETE FROM data_penumpang_kapal WHERE nama_kapal LIKE 'KM Uji%' OR wilker = 'TanjungSantan'");
  await tutupDb();
});

test('hanya pelabuhan yang ditawarkan (bandara tidak)', () => {
  assert.deepEqual(WILKER_PELABUHAN.map((w) => w.kode), ['WK01', 'WK02', 'WK03', 'WK04', 'WK05', 'WK06']);
});

test('validasi: isian sah, kosong = 0, spasi dipangkas', () => {
  const d = sah({ nama_kapal: '  KM Uji  ', abk_datang: '', penumpang_datang: '12', siaos: ' ', keterangan: '' });
  assert.equal(d.namaKapal, 'KM Uji');
  assert.equal(d.abkDatang, 0);
  assert.equal(d.penumpangDatang, 12);
  assert.equal(d.siaos, null);
  assert.equal(d.keterangan, null);
  assert.equal(d.tanggalBerangkat, null);
});

test('validasi: wilker, tanggal, dan nama kapal', () => {
  assert.match(galat({ kode_wilker: 'WK07' }), /Wilayah kerja/); // bandara
  assert.match(galat({ kode_wilker: "WK01'; DROP TABLE x;--" }), /Wilayah kerja/);
  assert.match(galat({ tanggal_tiba: '2026-02-30' }), /Tanggal tiba/);
  assert.match(galat({ tanggal_tiba: '26-10-2026' }), /Tanggal tiba/);
  assert.match(galat({ tanggal_tiba: '1999-01-01' }), /Tanggal tiba/);
  assert.match(galat({ tanggal_tiba: '2026-12-31' }), /ke depan/);
  sah({ tanggal_tiba: '2026-11-20' }); // 24 hari ke depan: boleh
  assert.match(galat({ nama_kapal: '   ' }), /Nama kapal wajib/);
  assert.match(galat({ nama_kapal: 'x'.repeat(256) }), /terlalu panjang/);
});

test('validasi: tanggal berangkat dan angka', () => {
  assert.match(galat({ tanggal_berangkat: '2026-10-25' }), /sebelum tanggal tiba/);
  assert.match(galat({ tanggal_berangkat: 'besok' }), /Tanggal berangkat/);
  assert.equal(sah({ tanggal_berangkat: '2026-10-26' }).tanggalBerangkat, '2026-10-26');
  assert.match(galat({ abk_datang: '-1' }), /ABK datang/);
  assert.match(galat({ penumpang_datang: '1.5' }), /Penumpang datang/);
  assert.match(galat({ penumpang_berangkat: '1e3' }), /Penumpang berangkat/);
  assert.match(galat({ abk_berangkat: '100001' }), /terlalu besar/);
  assert.match(galat({ siaos: 'x'.repeat(501) }), /SIAOS/);
  assert.match(galat({ keterangan: 'x'.repeat(2001) }), /Keterangan/);
});

test('simpan: no_baris naik per wilker dan mulai dari 1 untuk wilker lain', async () => {
  const a = await simpanPenumpangKapal(masukan({ namaKapal: 'KM Uji A', kodeWilker: 'WK03' }));
  const b = await simpanPenumpangKapal(masukan({ namaKapal: 'KM Uji B', kodeWilker: 'WK03' }));
  const c = await simpanPenumpangKapal(masukan({ namaKapal: 'KM Uji C', kodeWilker: 'WK05' }));
  assert.equal(b.noBaris, a.noBaris + 1);
  assert.equal(c.noBaris, 1);
  const r = await getDbClient().execute({ sql: 'SELECT * FROM data_penumpang_kapal WHERE id = ?', args: [a.id ?? 0] });
  const x = r.rows[0];
  assert.equal(x.wilker, 'Tanjung Laut'); // belum ada data lama: nama pendek
  assert.equal(x.kode_wilker, 'WK03');
  assert.equal(x.tanggal_tiba, '2026-10-26');
  assert.equal(Number(x.penumpang_berangkat), 4);
  assert.equal(x.tanggal_berangkat, null);
});

test('simpan: memakai ejaan wilker yang sudah ada di data lama', async () => {
  await getDbClient().execute({
    sql: "INSERT INTO data_penumpang_kapal (wilker, kode_wilker, no_baris, tanggal_tiba, nama_kapal) VALUES ('TanjungSantan', 'WK02', 7, '2026-01-02', 'KM Uji lama')",
    args: [],
  });
  const h = await simpanPenumpangKapal(masukan({ kodeWilker: 'WK02', namaKapal: 'KM Uji baru' }));
  assert.equal(h.noBaris, 8); // melanjutkan dari 7, bukan mulai dari 1
  const r = await getDbClient().execute({ sql: 'SELECT wilker FROM data_penumpang_kapal WHERE id = ?', args: [h.id ?? 0] });
  assert.equal(r.rows[0].wilker, 'TanjungSantan');
});

test('simpan: karakter Indonesia/Unicode dan teks bebas utuh', async () => {
  const h = await simpanPenumpangKapal(masukan({
    namaKapal: "KM Uji Çağrı 'petik' \"ganda\" ; --", siaos: 'SIAOS/2026/ä', keterangan: 'Baris 1\nBaris 2',
  }));
  const r = await getDbClient().execute({ sql: 'SELECT nama_kapal, siaos, keterangan FROM data_penumpang_kapal WHERE id = ?', args: [h.id ?? 0] });
  assert.equal(r.rows[0].nama_kapal, "KM Uji Çağrı 'petik' \"ganda\" ; --");
  assert.equal(r.rows[0].siaos, 'SIAOS/2026/ä');
  assert.equal(r.rows[0].keterangan, 'Baris 1\nBaris 2');
});

test('simpan: 5 penyimpanan serentak ke wilker sama semuanya berhasil dengan no_baris berbeda', async () => {
  const hasil = await Promise.all(
    [1, 2, 3, 4, 5].map((n) => simpanPenumpangKapal(masukan({ kodeWilker: 'WK04', namaKapal: `KM Uji paralel ${n}` }))),
  );
  const nomor = hasil.map((h) => h.noBaris);
  assert.equal(new Set(nomor).size, 5, `nomor harus unik: ${nomor}`);
});

test('daftar terbaru memuat yang baru disimpan, terbaru dahulu', async () => {
  const h = await simpanPenumpangKapal(masukan({ namaKapal: 'KM Uji terakhir', penumpangDatang: 99 }));
  const daftar = await getPenumpangKapalTerbaru(10);
  assert.equal(daftar[0].id, h.id);
  assert.equal(daftar[0].nama_kapal, 'KM Uji terakhir');
  assert.equal(daftar[0].penumpang_datang, 99);
  assert.ok(daftar.length <= 10);
});
