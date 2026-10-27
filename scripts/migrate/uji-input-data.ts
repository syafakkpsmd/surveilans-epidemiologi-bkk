// Uji input data + unggah Excel (Tahap 3b). Butuh MariaDB berisi schema 01-05.
// Jalankan: DB_USER=... DB_PASSWORD=... DB_NAME=... [DB_SOCKET=...] \
//   npx tsx --test --test-force-exit scripts/migrate/uji-input-data.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { ubahBilangan, ubahRba, ubahTanggal, ubahWilker } from '../../lib/input-data/nilai';
import { MODUL } from '../../lib/input-data/modul';
import { validasiBaris } from '../../lib/input-data/validasi';
import { bacaExcel, buatTemplate } from '../../lib/input-data/parse-excel';
import { daftarData, daftarPilihan, hapusBatch, hitungRencana, simpanUnggahan, tambahSatu, ubahManual } from '../../lib/input-data/simpan';
import { cariNegara, kunciPelabuhan } from '../../lib/input-data/pelabuhan';
import { isiNegara, simpanMaster, terapkanMasterKeData, belumTerdaftar } from '../../lib/input-data/master';
import { ubahDesimal, ubahTanggalWaktu, ubahWaktu } from '../../lib/input-data/nilai';
import { getDbClient, tutupDb } from '../../lib/db/client';

const cop = MODUL.cop;
const phqc = MODUL.phqc;
const semuaKolom = (m: typeof cop) => m.kolom.map((k) => k.nama);

async function buku(baris: unknown[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  baris.forEach((b) => ws.addRow(b));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('tanggal: format yang diterima dan ditolak', () => {
  assert.deepEqual(ubahTanggal('2026-10-23'), { ok: true, nilai: '2026-10-23' });
  assert.deepEqual(ubahTanggal('23/10/2026'), { ok: true, nilai: '2026-10-23' });
  assert.deepEqual(ubahTanggal('5-1-2026'), { ok: true, nilai: '2026-01-05' });
  assert.deepEqual(ubahTanggal(new Date(Date.UTC(2026, 9, 23))), { ok: true, nilai: '2026-10-23' });
  assert.deepEqual(ubahTanggal(46318), { ok: true, nilai: '2026-10-23' }); // nomor seri Excel
  assert.equal(ubahTanggal('31/02/2026').ok, false);
  assert.equal(ubahTanggal('10/23/2026').ok, false); // bulan 23 tidak ada: tidak ditebak MM/DD
  assert.equal(ubahTanggal('kemarin').ok, false);
  // nama bulan Indonesia/Inggris: hasil sama apa pun bahasa komputer
  for (const t of ['23 Oktober 2026', '23-Oct-2026', 'Oct 23, 2026', 'October 23 2026', 'Jumat, 23 Okt 2026', '23 okt. 2026']) {
    assert.deepEqual(ubahTanggal(t), { ok: true, nilai: '2026-10-23' }, t);
  }
  assert.deepEqual(ubahTanggal('17 Agustus 2026'), { ok: true, nilai: '2026-08-17' });
  assert.deepEqual(ubahTanggal('17 Aug 2026'), { ok: true, nilai: '2026-08-17' });
  assert.equal(ubahTanggal('31 Februari 2026').ok, false);
  assert.equal(ubahTanggal('5 Foo 2026').ok, false);
  assert.deepEqual(ubahTanggal(''), { ok: true, nilai: null });
});

test('bilangan, RBA, wilayah', () => {
  assert.deepEqual(ubahBilangan('12'), { ok: true, nilai: 12 });
  assert.deepEqual(ubahBilangan(7), { ok: true, nilai: 7 });
  assert.deepEqual(ubahBilangan('-'), { ok: true, nilai: null });
  assert.equal(ubahBilangan('1,5').ok, false);
  assert.equal(ubahBilangan(-1).ok, false);
  assert.deepEqual(ubahRba(' merah '), { ok: true, nilai: 'Merah' });
  assert.equal(ubahRba('Biru').ok, false);
  assert.deepEqual(ubahWilker('Tanjung_Santan'), { ok: true, nilai: 'WK02' });
  assert.equal(ubahWilker('Tg. Laut').ok, false);
});

test('validasi baris: wajib, tahun, wilayah yang tidak berlaku', () => {
  const sah = { wilayah_kerja: 'Tanjung Santan', nama_kapal: 'KM A', tgl_kedatangan: '2026-03-01', jml_abk_wni: '5', rba: 'hijau' };
  const h = validasiBaris(cop, sah, 2026);
  assert.equal(h.galat.length, 0);
  assert.equal(h.nilai?.wilayah_kerja, 'TanjungSantan');
  assert.equal(h.nilai?.rba, 'Hijau');
  assert.ok(validasiBaris(cop, { ...sah, tgl_kedatangan: '2025-03-01' }, 2026).galat[0].includes('di luar tahun 2026'));
  assert.ok(validasiBaris(cop, { ...sah, nama_kapal: '' }, 2026).galat[0].includes('wajib'));
  assert.ok(validasiBaris(cop, { ...sah, wilayah_kerja: 'APT Pranoto' }, 2026).galat[0].includes('tidak berlaku'));
});

test('template bisa dibaca kembali sebagai berkas kosong (tanpa kolom hilang)', async () => {
  const h = await bacaExcel(await buatTemplate(cop), cop, 2026);
  assert.equal(h.fatal, null);
  assert.equal(h.jumlahBaris, 0);
});

test('baca Excel: judul di baris ke-3, alias, baris kosong, galat, duplikat, kolom asing', async () => {
  const buf = await buku([
    ['REKAP COP 2026'], [],
    ['Wilker', 'Nama Kapal', 'Tgl Kedatangan', 'ABK WNI', 'RBA', 'Catatan Petugas'],
    ['Samarinda', 'KM Satu', new Date(Date.UTC(2026, 0, 5)), 10, 'Hijau', 'x'],
    ['Samarinda', 'km satu', '05/01/2026', 3, 'Hijau', ''],      // duplikat (kunci unik COP)
    [null, null, null, null, null, null],                          // kosong, dilewati
    ['Sangatta', 'KM Dua', '2026-02-30', 4, 'Merah', ''],          // tanggal tidak ada
    ['Lhoktuan', 'KM Tiga', '2026-06-01', 'banyak', 'Kuning', ''], // bilangan salah
    ['Sangatta', 'KM Empat', '2026-07-01', 0, '', ''],
  ]);
  const h = await bacaExcel(buf, cop, 2026);
  assert.equal(h.fatal, null);
  assert.equal(h.jumlahBaris, 5);
  assert.deepEqual(h.sah.map((s) => s.baris), [4, 9]);
  assert.deepEqual(h.galat.map((g) => g.baris), [5, 7, 8]);
  assert.deepEqual(h.kolomDiabaikan, ['Catatan Petugas']);
  assert.equal(h.sah[0].nilai.tgl_kedatangan, '2026-01-05');
});

test('baca Excel: kolom wajib hilang dan berkas rusak -> fatal', async () => {
  const h1 = await bacaExcel(await buku([['Nama Kapal', 'Wilker'], ['KM A', 'Samarinda']]), cop, 2026);
  assert.match(h1.fatal ?? '', /Tanggal/);
  const h2 = await bacaExcel(Buffer.from('bukan excel'), cop, 2026);
  assert.match(h2.fatal ?? '', /tidak dikenal/);
});

// ---------------- Format Sinkarkes (tabel HTML berekstensi .xls) ----------------
const HTML_COP = `<table><tr><td colspan='17' align='center'><h2>Rekapitulasi Penerbitan Sertifikat COP<h2></td></tr>
<tr><td colspan='17'>Balai Karkes : Samarinda </td></tr><tr><td colspan='17'></td></tr>
<tr><td>No</td><td>Nama Balai Karkes</td><td>Induk/Wilker</td><td>Nama Kapal</td><td>Bendera Kapal</td><td>Berat</td><td>Pelabuhan Kedatangan</td><td>Tanggal</td><td>Jml. ABK WNA</td><td>Jml. ABK WNI</td><td>Jam Terbit</td><td>Tanggal Published</td><td>NTPN</td><td>Jumlah Bayar</td></tr>
<tr><td>1</td><td>Samarinda</td><td>Pelabuhan Laut Sangatta</td><td>MV MIR &amp; CO</td><td>PANAMA</td><td>36000</td><td>Pasir Gudang, Johor</td><td>2026-10-23</td><td>19</td><td>0</td><td>5:30</td><td>2026-10-27 07:34:51</td><td>'1BEB68N3</td><td>300000</td></tr>
<tr><td>2</td><td>Samarinda</td><td>Pelabuhan Lhok Tuan</td><td>LPG/C GAS</td><td>PANAMA</td><td>22814.5</td><td>Singapore</td><td>2026-10-23</td><td>11</td><td>12</td><td>11:10</td><td></td><td>'</td><td></td></tr></table>`;

test('HTML Sinkarkes: judul di baris ke-4, sel gabungan, entitas, apostrof, jam, desimal', async () => {
  const h = await bacaExcel(Buffer.from(HTML_COP), cop, 2026);
  assert.equal(h.fatal, null);
  assert.equal(h.sah.length, 2);
  const n = h.sah[0].nilai;
  assert.equal(n.wilayah_kerja, 'Sangatta');
  assert.equal(n.nama_kapal, 'MV MIR & CO');
  assert.equal(n.jam_terbit, '05:30:00');
  assert.equal(n.tgl_published, '2026-10-27 07:34:51');
  assert.equal(n.berat_kapal, 36000);
  assert.equal(h.sah[1].nilai.berat_kapal, 22814.5);
  assert.equal(h.sah[1].nilai.wilayah_kerja, 'Lhoktuan');
  assert.ok(h.kolomDiabaikan.includes('Nama Balai Karkes') && h.kolomDiabaikan.includes('NTPN'));
  assert.equal(h.kolomAda.includes('rba'), false);
});

test('berkas tanpa kolom wilayah: minta wilayah, lalu terima wilayah bawaan', async () => {
  const html = '<table><tr><td>Nama Kapal</td><td>Tanggal Terbit</td><td>Jml. ABK WNI</td></tr><tr><td>KM A</td><td>2026-02-01</td><td>3</td></tr></table>';
  const h1 = await bacaExcel(Buffer.from(html), phqc, 2026);
  assert.equal(h1.perluWilayah, true);
  const h2 = await bacaExcel(Buffer.from(html), phqc, 2026, { wilayahDefault: 'WK05' });
  assert.equal(h2.fatal, null);
  assert.equal(h2.sah[0].nilai.wilayah_kerja, 'Sangatta');
  assert.equal(h2.sah[0].nilai.tgl_keberangkatan, '2026-02-01');
});

test('kerangka frameset kosong dan .xls biner ditolak dengan pesan jelas', async () => {
  const h1 = await bacaExcel(Buffer.from('<html><meta name="Excel Workbook Frameset"><table><tr><td></td></tr></table></html>'), phqc, 2026);
  assert.match(h1.fatal ?? '', /kerangka/);
  const h2 = await bacaExcel(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]), phqc, 2026);
  assert.match(h2.fatal ?? '', /\.xls biner/);
});

test('tidak ada tabrakan judul/alias antar kolom', () => {
  for (const m of Object.values(MODUL)) {
    const seen = new Map<string, string>();
    for (const c of m.kolom) for (const j of [c.label, c.nama, ...(c.alias ?? [])]) {
      const k = j.toLowerCase().replace(/[^a-z0-9]+/g, '');
      assert.ok(!seen.has(k) || seen.get(k) === c.nama, `${m.kunci}: "${j}" bentrok ${seen.get(k)} vs ${c.nama}`);
      seen.set(k, c.nama);
    }
  }
});

test('jam, tanggal+jam, desimal, RBA Rendah/Sedang/Tinggi', () => {
  assert.deepEqual(ubahWaktu('5:30'), { ok: true, nilai: '05:30:00' });
  assert.deepEqual(ubahWaktu(0.5), { ok: true, nilai: '12:00:00' });
  assert.equal(ubahWaktu('25:00').ok, false);
  assert.deepEqual(ubahTanggalWaktu('2026-10-26 07:25:43'), { ok: true, nilai: '2026-10-26 07:25:43' });
  assert.deepEqual(ubahTanggalWaktu('26/10/2026 7:25'), { ok: true, nilai: '2026-10-26 07:25:00' });
  assert.deepEqual(ubahDesimal('22814.5'), { ok: true, nilai: 22814.5 });
  assert.equal(ubahDesimal('1.234,5').ok, false);
  assert.deepEqual(ubahRba('Tinggi'), { ok: true, nilai: 'Merah' });
  assert.deepEqual(ubahRba('Risiko Sedang'), { ok: true, nilai: 'Kuning' });
});

test('master pelabuhan: pencocokan nama', () => {
  const peta = new Map([[kunciPelabuhan('Qingdao'), 'China'], [kunciPelabuhan('Pasir Gudang'), 'Malaysia'], [kunciPelabuhan('Busan (ex Pusan)'), 'Korea'], [kunciPelabuhan('BANGLADESH'), 'Bangladesh']]);
  assert.equal(cariNegara(peta, 'QINGDAO'), 'China');
  assert.equal(cariNegara(peta, 'Pasir Gudang, Johor'), 'Malaysia');
  assert.equal(cariNegara(peta, 'Busan'), 'Korea');
  assert.equal(cariNegara(peta, 'Bangladesh'), 'Bangladesh');
  assert.equal(cariNegara(peta, 'Tidak Dikenal'), null);
});

// ---------------- Database ----------------
before(async () => {
  const db = getDbClient();
  await db.execute('DELETE FROM kegiatan_cop');
  await db.execute('DELETE FROM kegiatan_phqc');
  await db.execute('DELETE FROM upload_riwayat');
  await db.execute('DELETE FROM master_pelabuhan_negara');
});
after(async () => { await tutupDb(); });

const baris = (n: Record<string, string | number | null>) => n;
const opsiSimpan = (modul: typeof cop, data: Record<string, string | number | null>[], kolomAda?: string[]) => ({
  modul, tahun: 2026, namaFile: 'a.xlsx', baris: data, kolomAda: kolomAda ?? semuaKolom(modul), jumlahBaris: data.length, jumlahDitolak: 0, pengguna: 'uji@bkk',
});

test('unggah: tambah baru + perbarui yang ada, isian manual tidak tertimpa kosong, data lain utuh', async () => {
  const db = getDbClient();
  await db.execute({ sql: `INSERT INTO kegiatan_cop (wilayah_kerja,nama_kapal,tgl_kedatangan) VALUES (?,?,?),(?,?,?)`,
    args: ['Samarinda', 'AMAN1', '2026-03-03', 'Sangatta', 'AMAN2', '2025-12-31'] });

  const a = baris({ wilayah_kerja: 'Sangatta', nama_kapal: 'KM Satu', tgl_kedatangan: '2026-01-02', jml_abk_wni: 5, bendera_kapal: 'PANAMA' });
  const b = baris({ wilayah_kerja: 'Sangatta', nama_kapal: 'KM Dua', tgl_kedatangan: '2026-12-31', jml_abk_wni: 1 });
  const r1 = await simpanUnggahan(opsiSimpan(cop, [a, b]));
  assert.deepEqual([r1.baru, r1.diperbarui], [2, 0]);

  // petugas mengisi RBA
  const id = (await db.execute("SELECT id FROM kegiatan_cop WHERE nama_kapal='KM Satu'")).rows[0].id as string;
  assert.deepEqual(await ubahManual(cop, id, { rba: 'Merah', faktor_risiko: 'Tidak Ditemukan' }), { ok: true });

  // unggah ulang berkas yang SAMA (tanpa kolom manual) dengan jumlah ABK dikoreksi
  const a2 = { ...a, jml_abk_wni: 9, bendera_kapal: null };
  const rencana = await hitungRencana(cop, 2026, [a2, b]);
  assert.deepEqual(rencana, { baru: 0, diperbarui: 2 });
  const r2 = await simpanUnggahan(opsiSimpan(cop, [a2, b], ['wilayah_kerja', 'nama_kapal', 'tgl_kedatangan', 'jml_abk_wni', 'bendera_kapal']));
  assert.deepEqual([r2.baru, r2.diperbarui], [0, 2]);

  const k = (await db.execute("SELECT jml_abk_wni, bendera_kapal, rba, faktor_risiko, sumber, batch_id FROM kegiatan_cop WHERE nama_kapal='KM Satu'")).rows[0];
  assert.equal(k.jml_abk_wni, 9);            // diperbarui
  assert.equal(k.bendera_kapal, 'PANAMA');   // nilai kosong tidak menimpa
  assert.equal(k.rba, 'Merah');              // isian manual aman
  assert.equal(k.faktor_risiko, 'Tidak Ditemukan');
  assert.equal(k.batch_id, r1.batchId);      // baris tetap milik unggahan pertama
  assert.equal((await db.execute('SELECT COUNT(*) n FROM kegiatan_cop')).rows[0].n, 4);

  // batalkan unggahan pertama: hanya baris barunya yang hilang; AMAN* utuh
  assert.equal(await hapusBatch(cop, r1.batchId), 2);
  const sisa = await db.execute('SELECT nama_kapal FROM kegiatan_cop ORDER BY nama_kapal');
  assert.deepEqual(sisa.rows.map((r) => r.nama_kapal), ['AMAN1', 'AMAN2']);
});

test('ubah manual: hanya kolom manual, RBA divalidasi, kosong -> NULL', async () => {
  const db = getDbClient();
  await db.execute({ sql: `INSERT INTO kegiatan_cop (id,wilayah_kerja,nama_kapal,tgl_kedatangan,rba) VALUES (UUID(),?,?,?,?)`, args: ['Lhoktuan', 'M', '2026-05-05', 'Hijau'] });
  const id = (await db.execute("SELECT id FROM kegiatan_cop WHERE nama_kapal='M'")).rows[0].id as string;
  const g1 = await ubahManual(cop, id, { nama_kapal: 'X' });
  assert.equal(g1.ok, false);
  const g2 = await ubahManual(cop, id, { rba: 'Biru' });
  assert.equal(g2.ok, false);
  assert.deepEqual(await ubahManual(cop, id, { rba: 'Sedang', sanitasi: 'Baik' }), { ok: true });
  assert.deepEqual(await ubahManual(cop, id, { rba: '' }), { ok: true });
  const r = (await db.execute("SELECT rba, sanitasi FROM kegiatan_cop WHERE nama_kapal='M'")).rows[0];
  assert.equal(r.rba, null);
  assert.equal(r.sanitasi, 'Baik');
  const p = await daftarPilihan(cop);
  assert.ok(p.sanitasi.includes('Baik') && p.daerah_terjangkit.includes('Ya') && p.rba.length === 3);
  // filter bulan dan "belum lengkap"
  assert.equal((await daftarData(cop, { tahun: 2026, bulan: 5, belumLengkap: true })).total, 1);
  assert.equal((await daftarData(cop, { tahun: 2026, bulan: 6 })).total, 0);
});

test('unggah gagal di tengah -> tidak ada yang berubah (transaksi)', async () => {
  const db = getDbClient();
  await db.execute('DELETE FROM kegiatan_cop');
  await db.execute('DELETE FROM upload_riwayat');
  await db.execute({ sql: `INSERT INTO kegiatan_cop (wilayah_kerja,nama_kapal,tgl_kedatangan) VALUES (?,?,?)`, args: ['Lhoktuan', 'ADA', '2026-05-05'] });
  const ok1 = baris({ wilayah_kerja: 'Lhoktuan', nama_kapal: 'X', tgl_kedatangan: '2026-05-06' });
  const rusak = baris({ wilayah_kerja: 'Lhoktuan', nama_kapal: 'Y', tgl_kedatangan: '2026-05-07', jumlah_bayar: 'bukan angka' as unknown as number });
  await assert.rejects(simpanUnggahan(opsiSimpan(cop, [ok1, rusak])));
  assert.deepEqual((await db.execute('SELECT nama_kapal FROM kegiatan_cop')).rows.map((x) => x.nama_kapal), ['ADA']);
  assert.equal((await db.execute('SELECT COUNT(*) n FROM upload_riwayat')).rows[0].n, 0);
});

test('form: tambah satu, duplikat dilaporkan', async () => {
  const n = baris({ wilayah_kerja: 'Samarinda', nama_kapal: 'FORM', tgl_kedatangan: '2026-08-08', jml_abk_wna: 2, jml_abk_wni: 9, rba: 'Kuning' });
  assert.equal(await tambahSatu(cop, n), 'ok');
  assert.equal(await tambahSatu(cop, n), 'duplikat');
  const d = await daftarData(cop, { tahun: 2026, wilayah: 'Samarinda', sumber: 'input' });
  assert.equal(d.total, 1);
  assert.equal(d.baris[0].nama_kapal, 'FORM');
});

test('master negara: isi otomatis saat unggah, daftar belum terdaftar, terapkan ke data lama', async () => {
  const db = getDbClient();
  await db.execute('DELETE FROM kegiatan_cop');
  await simpanMaster('Qingdao', 'China', 'u');
  await simpanMaster('QINGDAO', 'Tiongkok', 'u'); // kunci sama -> memperbarui, bukan menggandakan
  assert.equal((await db.execute('SELECT COUNT(*) n FROM master_pelabuhan_negara')).rows[0].n, 1);
  await simpanMaster('Qingdao', 'China', 'u');

  const data = [
    baris({ wilayah_kerja: 'Sangatta', nama_kapal: 'A', tgl_kedatangan: '2026-01-01', pelabuhan_kedatangan: 'qingdao' }),
    baris({ wilayah_kerja: 'Sangatta', nama_kapal: 'B', tgl_kedatangan: '2026-01-02', pelabuhan_kedatangan: 'Pasir Gudang, Johor' }),
  ];
  const r = await isiNegara(data);
  assert.equal(r.terisi, 1);
  assert.deepEqual(r.tidakCocok, ['Pasir Gudang, Johor']);
  assert.equal(data[0].negara_kedatangan, 'China');
  await simpanUnggahan(opsiSimpan(cop, data));
  assert.deepEqual(await belumTerdaftar(), [{ pelabuhan: 'Pasir Gudang, Johor', jumlah: 1 }]);
  await simpanMaster('Pasir Gudang', 'Malaysia', 'u');
  assert.equal(await terapkanMasterKeData(), 1);
  assert.equal((await db.execute("SELECT negara_kedatangan n FROM kegiatan_cop WHERE nama_kapal='B'")).rows[0].n, 'Malaysia');
});

test('PHQC (tanpa kunci unik di tabel): tambah lalu perbarui, bukan menggandakan', async () => {
  const mk = (k: string, t: string, abk: number) => baris({ wilayah_kerja: 'Sangkulirang', nama_kapal: k, tgl_keberangkatan: t, jml_penumpang_wni: abk, tujuan_berlayar: null });
  const r1 = await simpanUnggahan(opsiSimpan(phqc, [mk('S1', '2026-01-01', 1), mk('S2', '2026-01-01', 2)]));
  assert.deepEqual([r1.baru, r1.diperbarui], [2, 0]);
  const id = (await getDbClient().execute("SELECT id FROM kegiatan_phqc WHERE nama_kapal='S1'")).rows[0].id as number;
  assert.deepEqual(await ubahManual(phqc, String(id), { tujuan_berlayar: 'Luar Negeri', rba: 'Rendah' }), { ok: true });
  const r2 = await simpanUnggahan(opsiSimpan(phqc, [mk('S1', '2026-01-01', 7)]));
  assert.deepEqual([r2.baru, r2.diperbarui], [0, 1]);
  const x = (await getDbClient().execute("SELECT jml_penumpang_wni, tujuan_berlayar, rba FROM kegiatan_phqc WHERE nama_kapal='S1'")).rows[0];
  assert.deepEqual([x.jml_penumpang_wni, x.tujuan_berlayar, x.rba], [7, 'Luar Negeri', 'Hijau']);
  assert.equal((await daftarData(phqc, {})).total, 2);
});
