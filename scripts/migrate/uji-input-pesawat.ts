// Uji input data pesawat (lib/db/modul/inputPesawat.ts + excelPesawat.ts): validasi murni, template dan pembaca
// Excel (bolak-balik lewat file .xlsx sungguhan), duplikat, transaksi, kenaikan rencana -> final.
// Butuh database UJI dengan tabel kegiatan_pesawat dan wilker_ref berisi WK07 (Bandara). JANGAN ke data asli.
//   DB_USER=epic DB_PASSWORD=epic DB_NAME=epic_uji DB_SOCKET=/run/mysqld/mysqld.sock \
//     npx tsx --test --test-force-exit scripts/migrate/uji-input-pesawat.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { getDbClient, tutupDb } from '../../lib/db/client';
import {
  KOLOM_PESAWAT,
  WILKER_BANDARA,
  barisMentahDariForm,
  hitungIdentitasDiDb,
  kunciIdentitas,
  naikkanRencanaKeFinal,
  parseTanggal,
  periksaBanyak,
  simpanBarisPesawat,
  tandaiDuplikat,
  validasiBarisPesawat,
  getPesawatTerbaru,
} from '../../lib/db/modul/inputPesawat';
import type { BarisPesawat } from '../../lib/db/modul/inputPesawat';
import { bacaExcelPesawat, buatTemplatePesawat } from '../../lib/db/modul/excelPesawat';

const HARI_INI = '2026-10-27';
const WK = 'WK07';

const sah = (m: Record<string, unknown>): BarisPesawat => {
  const h = validasiBarisPesawat({ tanggal: '2026-10-26', maskapai: 'Uji Air', ...m }, HARI_INI, WK);
  assert.ok('data' in h, `harus lolos: ${'galat' in h ? h.galat.join(' | ') : ''}`);
  return h.data;
};
const galat = (m: Record<string, unknown>, kode = WK): string => {
  const h = validasiBarisPesawat({ tanggal: '2026-10-26', maskapai: 'Uji Air', kedatangan: 'X', penumpang_datang: 1, ...m }, HARI_INI, kode);
  assert.ok('galat' in h, `harus ditolak: ${JSON.stringify(m)}`);
  return h.galat.join(' | ');
};

const BERSIH = "DELETE FROM kegiatan_pesawat WHERE maskapai LIKE 'Uji%'";
before(async () => { await getDbClient().execute(BERSIH); });
after(async () => { await getDbClient().execute(BERSIH); await tutupDb(); });

// ------------------------------------------------------------------ murni

test('hanya bandara yang ditawarkan, dan kolom lengkap 18', () => {
  assert.deepEqual(WILKER_BANDARA.map((w) => w.kode), ['WK07']);
  assert.equal(KOLOM_PESAWAT.length, 18);
  assert.equal(new Set(KOLOM_PESAWAT.map((k) => k.kunci)).size, 18);
});

test('parseTanggal: ISO, hari-dulu, nama bulan Indonesia, Date, nomor seri Excel; yang tidak valid null', () => {
  assert.equal(parseTanggal('2026-10-27'), '2026-10-27');
  assert.equal(parseTanggal('2026-1-5'), '2026-01-05');
  assert.equal(parseTanggal('27/10/2026'), '2026-10-27');
  assert.equal(parseTanggal('05-01-2026'), '2026-01-05'); // hari dulu
  assert.equal(parseTanggal('27.10.2026'), '2026-10-27');
  assert.equal(parseTanggal('12 Juli 2026'), '2026-07-12');
  assert.equal(parseTanggal('3 Agu 2026'), '2026-08-03');
  assert.equal(parseTanggal('3 Agt 2026'), '2026-08-03');
  assert.equal(parseTanggal(new Date(Date.UTC(2026, 9, 27))), '2026-10-27');
  assert.equal(parseTanggal(46322), '2026-10-27'); // nomor seri Excel
  for (const buruk of ['', 'besok', '2026-02-30', '31/04/2026', '2026-13-01', '12 Foo 2026', 12, null, undefined, {}, new Date('x')]) {
    assert.equal(parseTanggal(buruk as unknown), null, `harus null: ${String(buruk)}`);
  }
});

test('validasi: baris sah, kosong = 0, teks dirapikan, status final/rencana dari tanggal', () => {
  const b = sah({ maskapai: '  Batik   Air ', keberangkatan: ' Jakarta ', crew_berangkat: '6', penumpang_berangkat: '120' });
  assert.equal(b.maskapai, 'Batik Air');
  assert.equal(b.keberangkatan, 'Jakarta');
  assert.equal(b.kedatangan, null);
  assert.equal(b.crew_berangkat, 6);
  assert.equal(b.penumpang_datang, 0);
  assert.equal(b.sklt_male, 0);
  assert.equal(b.kode_wilker, 'WK07');
  assert.equal(b.status_data, 'final');
  assert.equal(sah({ tanggal: HARI_INI, kedatangan: 'X', crew_datang: 1 }).status_data, 'final'); // hari ini = final
  assert.equal(sah({ tanggal: '2026-10-28', kedatangan: 'X', crew_datang: 1 }).status_data, 'rencana');
  assert.equal(sah({ tanggal: '2026-11-26', kedatangan: 'X', crew_datang: 1 }).status_data, 'rencana'); // tepat 30 hari
});

test('validasi: aturan wajib dan batas', () => {
  assert.match(galat({ tanggal: '' }), /Tanggal wajib/);
  assert.match(galat({ tanggal: 'besok' }), /tidak dapat dibaca/);
  assert.match(galat({ tanggal: '2026-11-27' }), /ke depan/); // 31 hari
  assert.match(galat({ tanggal: '1999-12-31' }), /terlalu lama/);
  assert.match(galat({ maskapai: '  ' }), /Maskapai wajib/);
  assert.match(galat({ maskapai: 'x'.repeat(256) }), /terlalu panjang/);
  assert.match(galat({}, 'WK01'), /bukan bandara/); // pelabuhan ditolak
  assert.match(galat({}, "WK07'; DROP TABLE x;--"), /bukan bandara/);
  assert.match(galat({ kedatangan: '', penumpang_datang: 5 }), /Kota asal wajib/);
  assert.match(galat({ keberangkatan: '', crew_berangkat: 2 }), /Kota tujuan wajib/);
  assert.match(galat({ kedatangan: '', penumpang_datang: 0 }), /tidak berisi/);
  assert.match(galat({ crew_datang: '-1' }), /Crew Datang/);
  assert.match(galat({ crew_datang: '1.5' }), /Crew Datang/);
  assert.match(galat({ crew_datang: 2.5 }), /Crew Datang/);
  assert.match(galat({ crew_datang: '1e3' }), /Crew Datang/);
  assert.match(galat({ crew_datang: true }), /bukan angka/);
  assert.match(galat({ penumpang_datang: 100001 }), /terlalu besar/);
  assert.match(galat({ sklt_male: 'abc' }), /SKLT Laki-laki/);
});

test('validasi: semua galat satu baris dilaporkan sekaligus', () => {
  const h = validasiBarisPesawat({ tanggal: 'x', maskapai: '', crew_datang: '-1', penumpang_datang: 'abc' }, HARI_INI, WK);
  assert.ok('galat' in h);
  assert.ok(h.galat.length >= 4, h.galat.join(' | '));
});

test('validasi ulang hasil validasi memberi hasil yang sama (dasar server tidak mempercayai pratinjau)', () => {
  const a = sah({ keberangkatan: 'Jakarta', crew_berangkat: 6, penumpang_berangkat: 100, kedatangan: 'Balikpapan', sklt_female: 3, tanggal: '27/10/2026' });
  const b = validasiBarisPesawat(a as unknown as Record<string, unknown>, HARI_INI, WK);
  assert.ok('data' in b);
  assert.deepEqual(b.data, a);
});

test('barisMentahDariForm membaca semua kolom', () => {
  const f = new FormData();
  f.set('tanggal', '2026-10-26'); f.set('maskapai', 'Uji Air'); f.set('kedatangan', 'X'); f.set('crew_datang', '2');
  const m = barisMentahDariForm(f);
  assert.equal(m.maskapai, 'Uji Air');
  assert.equal(m.crew_datang, '2');
  assert.equal(m.kier_female, undefined);
  assert.ok('data' in validasiBarisPesawat(m, HARI_INI, WK));
});

test('kunci identitas: tidak peka huruf besar/spasi, peka angka dan rute', () => {
  const a = sah({ maskapai: 'Batik Air', kedatangan: 'Jakarta', penumpang_datang: 10 });
  const b = sah({ maskapai: ' batik  AIR ', kedatangan: 'JAKARTA', penumpang_datang: 10 });
  assert.equal(kunciIdentitas(a), kunciIdentitas(b));
  assert.notEqual(kunciIdentitas(a), kunciIdentitas(sah({ maskapai: 'Batik Air', kedatangan: 'Jakarta', penumpang_datang: 11 })));
  assert.notEqual(kunciIdentitas(a), kunciIdentitas(sah({ maskapai: 'Batik Air', kedatangan: 'Surabaya', penumpang_datang: 10 })));
});

test('tandaiDuplikat: multiset (DB punya 1, file punya 2 -> hanya yang pertama duplikat)', () => {
  const x = sah({ kedatangan: 'Jakarta', penumpang_datang: 10 });
  const y = sah({ kedatangan: 'Surabaya', penumpang_datang: 10 });
  const ada = new Map([[kunciIdentitas(x), 1]]);
  assert.deepEqual(tandaiDuplikat([x, x, y], ada), [true, false, false]);
  assert.deepEqual(tandaiDuplikat([x, x], new Map()), [false, false]);
  assert.deepEqual(tandaiDuplikat([x, x], new Map([[kunciIdentitas(x), 5]])), [true, true]);
});

// ------------------------------------------------------------------ Excel

async function bukuDariTemplate() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await buatTemplatePesawat()) as unknown as ExcelJS.Buffer);
  return wb;
}
const simpanBuku = async (wb: ExcelJS.Workbook) => Buffer.from(await wb.xlsx.writeBuffer());

test('template: sheet Data + Petunjuk, header sesuai kolom, validasi angka terpasang', async () => {
  const wb = await bukuDariTemplate();
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Data', 'Petunjuk']);
  const ws = wb.getWorksheet('Data')!;
  assert.deepEqual(KOLOM_PESAWAT.map((_, i) => String(ws.getRow(1).getCell(i + 1).value)), KOLOM_PESAWAT.map((k) => k.header));
  const iCrew = KOLOM_PESAWAT.findIndex((k) => k.kunci === 'crew_berangkat') + 1;
  assert.equal(ws.getCell(2, iCrew).dataValidation?.type, 'whole');
  assert.equal(ws.getCell(2, 1).numFmt, 'yyyy-mm-dd');
});

test('baca Excel: template kosong ditolak; baris campuran dibaca dengan nomor baris benar', async () => {
  const kosong = await bacaExcelPesawat(await buatTemplatePesawat());
  assert.ok(!kosong.ok && /Tidak ada baris data/.test(kosong.galatFile));

  const wb = await bukuDariTemplate();
  const ws = wb.getWorksheet('Data')!;
  const kol = (kunci: string) => KOLOM_PESAWAT.findIndex((k) => k.kunci === kunci) + 1;
  ws.getCell(2, kol('tanggal')).value = new Date(Date.UTC(2026, 9, 26)); // sel tanggal sungguhan
  ws.getCell(2, kol('maskapai')).value = 'Uji Air';
  ws.getCell(2, kol('kedatangan')).value = 'Jakarta';
  ws.getCell(2, kol('penumpang_datang')).value = 120;
  ws.getCell(3, kol('tanggal')).value = '27 Oktober 2026'; // teks
  ws.getCell(3, kol('maskapai')).value = { richText: [{ text: 'Uji ' }, { text: 'Wings' }] }; // rich text
  ws.getCell(3, kol('keberangkatan')).value = 'Surabaya';
  ws.getCell(3, kol('penumpang_berangkat')).value = { formula: '100+20', result: 120 }; // rumus
  // baris 4 sengaja kosong, baris 5 tanggal rusak
  ws.getCell(5, kol('tanggal')).value = 'bukan tanggal';
  ws.getCell(5, kol('maskapai')).value = 'Uji Rusak';

  const baca = await bacaExcelPesawat(await simpanBuku(wb));
  assert.ok(baca.ok);
  assert.deepEqual(baca.baris.map((b) => b.nomor), [2, 3, 5]); // baris kosong dilewati, nomor Excel asli
  assert.deepEqual(baca.peringatan, []);

  const hasil = await periksaBanyak(baca.baris, HARI_INI, WK);
  assert.deepEqual(hasil.map((h) => h.status), ['siap', 'siap', 'galat']);
  assert.equal(hasil[0].data?.tanggal, '2026-10-26');
  assert.equal(hasil[0].data?.penumpang_datang, 120);
  assert.equal(hasil[1].data?.maskapai, 'Uji Wings');
  assert.equal(hasil[1].data?.tanggal, '2026-10-27');
  assert.equal(hasil[1].data?.penumpang_berangkat, 120);
  assert.match(hasil[2].galat!.join(' '), /Tanggal tidak dapat dibaca/);
});

test('baca Excel: judul beda ejaan/urutan dan judul di baris bawah tetap dikenali; kolom hilang jadi peringatan', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Lembar1');
  ws.addRow(['LAPORAN PESAWAT BULAN OKTOBER']); // judul di atas header
  ws.addRow([]);
  ws.addRow(['MASKAPAI', 'tgl', 'Kota Asal', 'Penumpang Datang', 'sklt l']);
  ws.addRow(['Uji Lion', '26/10/2026', 'Makassar', 88, 2]);
  const baca = await bacaExcelPesawat(await simpanBuku(wb));
  assert.ok(baca.ok);
  assert.equal(baca.baris[0].nomor, 4);
  assert.match(baca.peringatan[0], /Kolom tidak ditemukan/);
  const [h] = await periksaBanyak(baca.baris, HARI_INI, WK);
  assert.equal(h.status, 'siap');
  assert.equal(h.data?.kedatangan, 'Makassar');
  assert.equal(h.data?.sklt_male, 2);
  assert.equal(h.data?.status_data, 'final');
});

test('baca Excel: file bukan xlsx, header tidak ada, dan terlalu banyak baris ditolak dengan pesan jelas', async () => {
  const bukan = await bacaExcelPesawat(Buffer.from('tanggal,maskapai\n2026-10-26,Uji'));
  assert.ok(!bukan.ok && /bukan Excel/.test(bukan.galatFile));
  const rusak = await bacaExcelPesawat(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('sampah')]));
  assert.ok(!rusak.ok && /rusak/.test(rusak.galatFile));

  const tanpaHeader = new ExcelJS.Workbook();
  tanpaHeader.addWorksheet('S').addRow(['a', 'b', 'c']);
  const r1 = await bacaExcelPesawat(await simpanBuku(tanpaHeader));
  assert.ok(!r1.ok && /Judul kolom tidak ditemukan/.test(r1.galatFile));

  const banyak = await bukuDariTemplate();
  const ws = banyak.getWorksheet('Data')!;
  for (let r = 2; r <= 2002; r++) { ws.getCell(r, 1).value = '2026-10-26'; ws.getCell(r, 2).value = 'Uji X'; }
  const r2 = await bacaExcelPesawat(await simpanBuku(banyak));
  assert.ok(!r2.ok && /lebih dari 2\.000/.test(r2.galatFile.replace(/\s/g, ' ')) === true || (!r2.ok && /2.000/.test(r2.galatFile)));
});

// ------------------------------------------------------------------ database

const barisUji = (o: Partial<Record<string, unknown>> = {}) =>
  sah({ maskapai: 'Uji Garuda', keberangkatan: 'Jakarta', crew_berangkat: 6, penumpang_berangkat: 100, kedatangan: 'Surabaya', crew_datang: 6, penumpang_datang: 110, ...o });

test('simpan: tersimpan lengkap (termasuk Unicode, created_by UUID, status) dan muncul di daftar terbaru', async () => {
  const uuid = '123e4567-e89b-12d3-a456-426614174000';
  const b = barisUji({ maskapai: "Uji Çağrı 'Air' \"X\"", sklt_male: 2, kier_female: 1 });
  assert.equal(await simpanBarisPesawat([b], uuid), 1);
  const r = await getDbClient().execute({ sql: "SELECT * FROM kegiatan_pesawat WHERE maskapai LIKE 'Uji Çağrı%'", args: [] });
  assert.equal(r.rows.length, 1);
  const x = r.rows[0];
  assert.equal(x.maskapai, "Uji Çağrı 'Air' \"X\"");
  assert.equal(x.kode_wilker, 'WK07');
  assert.equal(x.tanggal, '2026-10-26');
  assert.equal(Number(x.sklt_male), 2);
  assert.equal(Number(x.kier_female), 1);
  assert.equal(x.status_data, 'final');
  assert.equal(x.created_by, uuid);
  assert.match(String(x.id), /^[0-9a-f-]{36}$/); // UUID otomatis
  const terbaru = await getPesawatTerbaru(5);
  assert.ok(terbaru.some((t) => t.maskapai.startsWith('Uji Çağrı')));
});

test('simpan: id pengguna yang bukan UUID dicatat null (tidak membuat penyimpanan gagal)', async () => {
  await simpanBarisPesawat([barisUji({ maskapai: 'Uji null-id' })], 'bukan-uuid');
  const r = await getDbClient().execute({ sql: "SELECT created_by FROM kegiatan_pesawat WHERE maskapai = 'Uji null-id'", args: [] });
  assert.equal(r.rows[0].created_by, null);
});

test('duplikat: baris identik dengan DB ditandai; multiset; beda sedikit bukan duplikat', async () => {
  const dasar = barisUji({ maskapai: 'Uji Dup', tanggal: '2026-10-20' });
  await simpanBarisPesawat([dasar], null);

  const hasil = await periksaBanyak(
    [
      { nomor: 2, mentah: { ...dasar } }, // identik dengan DB
      { nomor: 3, mentah: { ...dasar } }, // kembar kedua di file: penerbangan terpisah
      { nomor: 4, mentah: { ...dasar, penumpang_datang: 111 } }, // beda angka
      { nomor: 5, mentah: { ...dasar, maskapai: ' uji   DUP ' } }, // beda huruf/spasi saja = identik
      { nomor: 6, mentah: { ...dasar, tanggal: 'rusak' } },
    ],
    HARI_INI,
    WK,
  );
  assert.deepEqual(hasil.map((h) => h.status), ['duplikat', 'siap', 'siap', 'siap', 'galat']);
  // baris 5 identik dengan DB juga, tetapi DB hanya punya 1 baris dan sudah "dipakai" baris 2
  assert.equal((await hitungIdentitasDiDb([dasar])).get(kunciIdentitas(dasar)), 1);
});

test('transaksi: bila satu baris gagal di database, TIDAK ADA baris dari unggahan itu yang tersimpan', async () => {
  const hitung = async () => Number((await getDbClient().execute({ sql: "SELECT COUNT(*) n FROM kegiatan_pesawat WHERE maskapai LIKE 'Uji Atom%'", args: [] })).rows[0].n);
  assert.equal(await hitung(), 0);
  const baik = barisUji({ maskapai: 'Uji Atom A' });
  const buruk = { ...barisUji({ maskapai: 'Uji Atom B' }), kode_wilker: 'WK99' }; // melanggar FK wilker_ref
  await assert.rejects(() => simpanBarisPesawat([baik, buruk], null));
  assert.equal(await hitung(), 0, 'rollback: baris yang baik pun tidak boleh tersimpan');
});

test('simpan banyak baris lintas potongan (250 baris) utuh', async () => {
  const banyak = Array.from({ length: 250 }, (_, i) => barisUji({ maskapai: `Uji Massal ${i}` }));
  assert.equal(await simpanBarisPesawat(banyak, null), 250);
  const n = Number((await getDbClient().execute({ sql: "SELECT COUNT(DISTINCT maskapai) n FROM kegiatan_pesawat WHERE maskapai LIKE 'Uji Massal %'", args: [] })).rows[0].n);
  assert.equal(n, 250);
});

test('rencana -> final: baris tanggal depan tersimpan rencana, naik setelah tanggalnya tiba, tidak sebelum', async () => {
  const b = barisUji({ maskapai: 'Uji Rencana', tanggal: '2026-10-29' });
  assert.equal(b.status_data, 'rencana');
  await simpanBarisPesawat([b], null);
  const status = async () => (await getDbClient().execute({ sql: "SELECT status_data FROM kegiatan_pesawat WHERE maskapai = 'Uji Rencana'", args: [] })).rows[0].status_data;
  assert.equal(await status(), 'rencana');
  await naikkanRencanaKeFinal('2026-10-28');
  assert.equal(await status(), 'rencana', 'tanggal belum tiba');
  assert.ok((await naikkanRencanaKeFinal('2026-10-29')) >= 1);
  assert.equal(await status(), 'final', 'tepat pada tanggalnya sudah final');
  assert.equal(await naikkanRencanaKeFinal('2026-10-29'), 0, 'idempoten');
});

test('kolom yang dibaca dashboard terisi sesuai masukan (status final)', async () => {
  await simpanBarisPesawat([barisUji({ maskapai: 'Uji Garuda' })], null);
  const r = await getDbClient().execute({
    sql: "SELECT status_data, crew_datang, penumpang_datang FROM kegiatan_pesawat WHERE maskapai = 'Uji Garuda' AND status_data = 'final' LIMIT 1",
    args: [],
  });
  // kolom yang dibaca dashboard terisi sesuai masukan (6 crew, 110 penumpang datang)
  assert.equal(Number(r.rows[0].crew_datang), 6);
  assert.equal(Number(r.rows[0].penumpang_datang), 110);
});
