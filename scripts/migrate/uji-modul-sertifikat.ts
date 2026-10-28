// Uji modul SSCEC, P3K Kapal, Sertifikat Air, Buku Kesehatan di kerangka lib/input-data.
// Bagian 1 murni (tanpa database). Bagian 2 butuh MariaDB berisi schema 01-03, 05, 07.
// Jalankan: DB_USER=... DB_PASSWORD=... DB_NAME=... [DB_SOCKET=...] \
//   npx tsx --test --test-force-exit scripts/migrate/uji-modul-sertifikat.ts
// Data di sini KARANGAN (bukan data Sinkarkes asli); judul kolom meniru ekspor Sinkarkes 27 Okt 2026.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { MODUL, kunciJudul, type ModulInput } from '../../lib/input-data/modul';
<<<<<<< ours
import { ubahWilker } from '../../lib/input-data/nilai';
=======
import { ubahBilangan, ubahDesimal, ubahTanggal, ubahTanggalWaktu, ubahWaktu, ubahWilker } from '../../lib/input-data/nilai';
>>>>>>> theirs
import { kunciBaris, validasiBaris } from '../../lib/input-data/validasi';
import { bacaExcel, buatTemplate, petakanKolom } from '../../lib/input-data/parse-excel';
import { daftarData, hapusBatch, hitungRencana, simpanUnggahan, tambahSatu } from '../../lib/input-data/simpan';
import { getDbClient, tutupDb } from '../../lib/db/client';

const BARU = ['sscec', 'p3k', 'air', 'buku_kesehatan'].map((k) => MODUL[k]);

// Judul kolom ASLI ekspor Sinkarkes (baris judul laporan ada di atasnya).
const JUDUL_ASLI: Record<string, string[]> = {
  sscec: ['No', 'Nama KKP', 'Nama Pelabuhan', 'Nama Kapal', 'Nomor Barcode', 'Nomor Registrasi/lMO No', 'Berat (GT)', 'Bendera', 'Pada waktu diperiksa, palka-palka', 'berat palka', 'Tanggal', 'Mencatat Pemeriksaan', 'Nama petugas pemeriksa', 'Nama pejabat dan instansi yang menerbitkan', ' Tanggal Terbit', 'Nama Wajib Bayar', 'Kode Billing', 'NTPN', 'NTBN', 'Tanggal Bayar', 'Jumlah Bayar'],
  p3k: ['No', 'Nama Balai Karkes', 'No Registrasi/IMO No', 'Nama Kapal', 'Bendera Kapal', 'Berat', 'Diterbitkan Tanggal', 'Berlaku Tanggal', 'Tanggal Published', 'Petugas Pemeriksa', 'NIP', 'QR Code', 'Kode Billing', 'Nama Wajib Bayar', 'NTPN', 'NTB', 'Jam Bayar', 'Jumlah Bayar', 'Channel Bayar', 'Bank/Pos Bayar'],
  air: ['No', 'KKP Induk/Wilker', 'Nama Perusahaan', 'Nama Pengusaha', 'Alamat', 'Telepon', 'Lokasi Pengambilan', 'Jenis penampungan', 'Lainnya', 'Volume Sampel', 'Tanggal pengambilan', 'Jam pengambilan', 'Tanggal Analisis', 'Jam Analisis', 'Sample ID', 'Kesimpulan', 'Sebagai', 'Tempat terbit', 'Tanggal', 'Berlaku sampai', 'Kepala KKP', 'Petugas', 'QRCode', 'Kode Billing', 'NTPN', 'NTB', 'Jumlah Bayar', 'Tanggal Bayar', 'Tanggal Buku'],
  buku_kesehatan: ['No', 'Nama Balai Karkes', 'QR Code', 'e-Healthbook', 'No Registrasi/IMO No', 'Nama Kapal', 'Jenis Kapal', 'Bendera Kapal', 'Berat', 'Pemilik', 'Diterbitkan Di', 'Diterbitkan Tanggal', 'Kode Billing', 'Nama Wajib Bayar', 'NTPN', 'NTB', 'Jam Bayar', 'Jumlah Bayar', 'Channel Bayar', 'Bank/Pos Bayar'],
};
// Kolom ekspor yang HARUS dikenal (nama kolom tabel yang terisi dari judul asli).
const HARUS_DIKENAL: Record<string, string[]> = {
  sscec: ['wilayah_kerja', 'nama_kapal', 'nomor_barcode', 'berat_gt', 'bendera', 'palka', 'berat_palka', 'tgl_periksa', 'pencatat_pemeriksaan', 'tgl_terbit', 'nama_wajib_bayar', 'tgl_bayar', 'jumlah_bayar'],
  p3k: ['wilayah_kerja', 'nama_kapal', 'bendera', 'berat', 'tgl_terbit', 'tgl_published', 'petugas_pemeriksa', 'nip', 'qr_code', 'nama_wajib_bayar', 'jumlah_bayar'],
  air: ['wilayah_kerja', 'nama_perusahaan', 'lokasi_pengambilan', 'jenis_penampungan', 'penampungan_lainnya', 'volume_sampel', 'tgl_pengambilan', 'tgl_analisis', 'jam_analisis', 'sample_id', 'kesimpulan', 'sebagai', 'tempat_terbit', 'tgl_terbit', 'berlaku_sampai', 'jumlah_bayar'],
  buku_kesehatan: ['wilayah_kerja', 'qr_code', 'e_healthbook', 'nama_kapal', 'bendera', 'berat', 'pemilik', 'tgl_terbit', 'nama_wajib_bayar', 'jumlah_bayar'],
};

const kolomNama = (m: ModulInput) => m.kolomKunci === 'sample_id' ? 'nama_perusahaan' : 'nama_kapal';

/** Satu baris karangan menurut judul asli. kkp = isi kolom KKP/balai; id membedakan dokumen. */
function baris(kunci: string, kkp: string, id: string, tgl: string, qr = 'QR-' + id): Record<string, unknown> {
  const t = JUDUL_ASLI[kunci];
  const nilai: Record<string, unknown> = {
    'Nama KKP': kkp, 'Nama Balai Karkes': kkp, 'KKP Induk/Wilker': kkp === 'Samarinda' ? 'Samarinda / Samarinda' : `Samarinda / ${kkp}`,
    'Nama Kapal': 'UJI-' + id, 'Nomor Barcode': qr, 'QR Code': qr, 'QRCode': qr, 'Berat (GT)': 1250, 'Berat': '2300.5',
    'Bendera': 'INDONESIA', 'Bendera Kapal': 'INDONESIA', 'Tanggal': tgl, ' Tanggal Terbit': tgl + ' 15:08:02', 'Diterbitkan Tanggal': tgl,
    'Tanggal Published': tgl + ' 11:13:43', 'Mencatat Pemeriksaan': 'Bebas dari pengawasan', 'Nama Wajib Bayar': 'PT Uji',
    'Tanggal Bayar': tgl + ' 09:54:52', 'Jumlah Bayar': 150000, 'NIP': '198001012005011001', 'Petugas Pemeriksa': 'Petugas Uji',
    'Nama Perusahaan': 'PT UJI-' + id, 'Sample ID': 'UJI-' + id, 'Sebagai': 'AIR MINUM', 'Kesimpulan': 'MEMENUHI SYARAT', 'Jam Analisis': '10:30:00',
    'Tanggal Analisis': tgl, 'Tanggal pengambilan': tgl, 'Berlaku sampai': '2027-04-26', 'Lokasi Pengambilan': 'SAMARINDA', 'Volume Sampel': 100,
    'e-Healthbook': '', 'Pemilik': 'PT Pemilik Uji', 'Kode Billing': "'8202610260000", 'NTPN': "'AAAA",
  };
  return Object.fromEntries(t.map((j) => [j, nilai[j] ?? '']));
}

/** Berkas xlsx berbentuk ekspor Sinkarkes: 4 baris judul laporan, baris kosong, judul kolom, data. */
async function xlsxSinkarkes(kunci: string, rows: Record<string, unknown>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Detail');
  ws.addRow(['Rekapitulasi Sertifikat']); ws.addRow(['Balai Karkes : Samarinda']); ws.addRow(['Balai Karkes Tempat : Semua']); ws.addRow(['Periode : 27-10-2026 - 27-10-2026']); ws.addRow([]);
  ws.addRow(JUDUL_ASLI[kunci]);
  rows.forEach((r, i) => ws.addRow(JUDUL_ASLI[kunci].map((j) => (j === 'No' ? i + 1 : r[j]))));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------------------------------------------------------- Bagian 1: murni

test('konfigurasi modul baru konsisten', () => {
  for (const m of BARU) {
    const nama = m.kolom.map((k) => k.nama);
    assert.equal(new Set(nama).size, nama.length, `${m.kunci}: nama kolom ganda`);
    for (const c of m.kolomDaftar) assert.ok(nama.includes(c), `${m.kunci}: kolomDaftar ${c} tidak ada`);
    for (const c of [m.kolomWilayah, m.kolomTanggal, m.kolomKunci, ...(m.kolomKunciTambahan ?? [])]) assert.ok(nama.includes(c), `${m.kunci}: ${c}`);
    assert.equal(m.wilayahBoleh.length, 7);
    assert.ok(m.kolom.find((k) => k.nama === m.kolomTanggal)?.wajib, `${m.kunci}: tanggal terbit harus wajib`);
    const dipakai = new Map<string, string>(); // satu judul Excel tidak boleh menunjuk dua kolom
    for (const k of m.kolom) for (const j of [k.label, k.nama, ...(k.alias ?? [])]) {
      const kj = kunciJudul(j);
      assert.ok(!dipakai.has(kj) || dipakai.get(kj) === k.nama, `${m.kunci}: judul "${j}" ambigu (${dipakai.get(kj)} vs ${k.nama})`);
      dipakai.set(kj, k.nama);
    }
  }
});

test('judul kolom ASLI Sinkarkes dikenali; kolom lain (billing, NTPN, dst.) diabaikan', () => {
  for (const m of BARU) {
    const peta = new Map<string, string>();
    for (const k of m.kolom) for (const j of [k.label, k.nama, ...(k.alias ?? [])]) if (!peta.has(kunciJudul(j))) peta.set(kunciJudul(j), k.nama);
    const pk = petakanKolom([['Rekapitulasi'], ['Balai Karkes : Samarinda'], [], JUDUL_ASLI[m.kunci]], peta);
    assert.ok(pk, `${m.kunci}: baris judul tidak ditemukan`);
    assert.equal(pk!.barisJudul, 3);
    const dikenal = [...pk!.kolomKe.values()].sort();
    assert.deepEqual(dikenal, [...HARUS_DIKENAL[m.kunci]].sort(), `${m.kunci}: kolom dikenal`);
    assert.ok(pk!.diabaikan.includes('Kode Billing'), `${m.kunci}: Kode Billing harus diabaikan`);
  }
});

<<<<<<< ours
=======

test('angka: pemisah ribuan/desimal Indonesia dan Inggris dibaca benar; yang ambigu ditolak, tidak salah baca diam-diam', () => {
  const d = (v: string) => { const r = ubahDesimal(v); return r.ok ? r.nilai : 'ditolak'; };
  for (const [v, h] of [['150000', 150000], ['150000.00', 150000], ['150.000,00', 150000], ['150,000.00', 150000], ['1.250.000', 1250000], ['1250,5', 1250.5],
    ['1.250,5', 1250.5], ['Rp 150.000', 150000], ['Rp. 1.500.000', 1500000], ['12.5', 12.5], ['135', 135]] as [string, number][]) assert.equal(d(v), h, v);
  for (const v of ['150.000', '1.250', '1,250', 'abc', '1.2.3']) assert.equal(d(v), 'ditolak', `${v} harus ditolak`);
  assert.equal(ubahBilangan('1.000').ok, false);
  assert.deepEqual(ubahBilangan('12.0'), { ok: true, nilai: 12 });
  assert.deepEqual(ubahBilangan(1000), { ok: true, nilai: 1000 }); // sel angka asli selalu aman
  assert.deepEqual(ubahDesimal(150000), { ok: true, nilai: 150000 });
});

test('tanggal: sel Excel (Date/nomor seri) tidak bergantung zona waktu; teks Indonesia/Inggris/ISO dibaca; m/d/y tidak ditebak', () => {
  assert.deepEqual(ubahTanggal(new Date(Date.UTC(2026, 9, 27))), { ok: true, nilai: '2026-10-27' });
  assert.deepEqual(ubahTanggal(46322), { ok: true, nilai: '2026-10-27' });
  assert.deepEqual(ubahTanggalWaktu(new Date(Date.UTC(2026, 9, 27, 23, 59, 30))), { ok: true, nilai: '2026-10-27 23:59:30' });
  assert.deepEqual(ubahTanggalWaktu(46322.4375), { ok: true, nilai: '2026-10-27 10:30:00' });
  assert.deepEqual(ubahWaktu(new Date(Date.UTC(1899, 11, 30, 10, 30))), { ok: true, nilai: '10:30:00' });
  for (const v of ['2026-10-27', '2026-10-27 15:08:02', '2026/10/27', '27/10/2026', '27/10/2026 15:08', '27-10-2026', '27.10.2026', '27 Oktober 2026',
    '27-Okt-2026', 'Selasa, 27 Oktober 2026', 'Oct 27, 2026', '27 October 2026']) assert.deepEqual(ubahTanggal(v), { ok: true, nilai: '2026-10-27' }, v);
  assert.equal(ubahTanggal('10/27/2026').ok, false); // bulan 27: ditolak, bukan ditebak
  assert.equal(ubahTanggal('27/10/26').ok, false);   // tahun 2 digit: ditolak
  assert.deepEqual(ubahTanggal('10/05/2026'), { ok: true, nilai: '2026-05-10' }); // selalu hari/bulan/tahun (Indonesia)
});

>>>>>>> theirs
test('wilayah dari nama KKP/balai dan dari "KKP Induk/Wilker" (bagian kanan "/")', () => {
  assert.deepEqual(ubahWilker('Samarinda'), { ok: true, nilai: 'WK01' });
  assert.deepEqual(ubahWilker('Pelabuhan Laut Sangatta'), { ok: true, nilai: 'WK05' });
  assert.deepEqual(ubahWilker('Pelabuhan Tanjung Laut'), { ok: true, nilai: 'WK03' });
  assert.deepEqual(ubahWilker('Samarinda / Samarinda'), { ok: true, nilai: 'WK01' });
  assert.deepEqual(ubahWilker('Samarinda / Pelabuhan Laut Sangkulirang'), { ok: true, nilai: 'WK06' });
  assert.deepEqual(ubahWilker('Samarinda / Entah Dimana'), { ok: true, nilai: 'WK01' });
  assert.equal(ubahWilker('Balikpapan / Entah').ok, false);
  assert.equal(ubahWilker('Tg. Laut').ok, false); // tetap tidak menebak
});

test('kunci pencocokan: barcode/QR membedakan dokumen kapal yang sama di hari yang sama; COP tidak berubah', () => {
  const m = MODUL.sscec;
  const dasar = { wilayah_kerja: 'Samarinda', nama_kapal: 'KM A', tgl_terbit: '2026-10-27' };
  assert.notEqual(kunciBaris(m, { ...dasar, nomor_barcode: 'X1' }), kunciBaris(m, { ...dasar, nomor_barcode: 'X2' }));
  assert.equal(kunciBaris(m, { ...dasar, nomor_barcode: 'x1' }), kunciBaris(m, { ...dasar, nomor_barcode: ' X1 ' }));
  assert.equal(JSON.parse(kunciBaris(MODUL.cop, { wilayah_kerja: 'Samarinda', nama_kapal: 'KM A', tgl_kedatangan: '2026-10-27' })!).length, 3);
  assert.equal(kunciBaris(MODUL.air, { wilayah_kerja: 'Samarinda', sample_id: null, tgl_terbit: '2026-10-27' }), null);
});

test('validasi baris: berat/bayar numerik, tanggal+jam Sinkarkes, jam analisis', () => {
  const h = validasiBaris(MODUL.sscec, { wilayah_kerja: 'Pelabuhan Laut Sangkulirang', nama_kapal: 'KM A', tgl_terbit: '2026-10-27 15:08:02', berat_gt: 4337, jumlah_bayar: '600000', tgl_bayar: '2026-10-26 11:18:49' }, 2026);
  assert.deepEqual(h.galat, []);
  assert.equal(h.nilai?.wilayah_kerja, 'Sangkulirang');
  assert.equal(h.nilai?.tgl_terbit, '2026-10-27');
  assert.equal(h.nilai?.tgl_bayar, '2026-10-26');
  assert.equal(h.nilai?.jumlah_bayar, 600000);
  assert.equal(validasiBaris(MODUL.air, { wilayah_kerja: 'WK01', nama_perusahaan: 'PT X', tgl_terbit: '2026-10-27', jam_analisis: '10:30:00' }).nilai?.jam_analisis, '10:30:00');
  assert.match(validasiBaris(MODUL.sscec, { wilayah_kerja: 'WK01', nama_kapal: 'K', tgl_terbit: '2025-12-31' }, 2026).galat[0], /di luar tahun 2026/);
  assert.match(validasiBaris(MODUL.sscec, { wilayah_kerja: 'WK01', tgl_terbit: '2026-01-01' }).galat[0], /Nama Kapal: wajib diisi/);
});

test('template tiap modul dapat dibaca kembali (kosong)', async () => {
  for (const m of BARU) {
    const h = await bacaExcel(await buatTemplate(m), m, 2026);
    assert.equal(h.fatal, null, `${m.kunci}: ${h.fatal}`);
    assert.equal(h.jumlahBaris, 0);
  }
});

test('ekspor Sinkarkes .xls berisi HTML dibaca (judul laporan dilewati, colspan, entitas)', async () => {
  const html = `<table border='1'><tr><td colspan='12' align='center'><h2>Rekapitulasi Penerbitan Pengawasan P3K Kapal<h2></td></tr>
<tr><td colspan='12'>Balai Karkes : Samarinda </td></tr><tr><td colspan='12'></td></tr>
<tr><td>No</td><td>Nama Balai Karkes</td><td>Nama Kapal</td><td>Berat</td><td>Diterbitkan Tanggal</td><td>Tanggal Published</td><td>NIP</td><td>QR Code</td><td>Kode Billing</td><td>Jumlah Bayar</td></tr>
<tr><td>1</td><td>Samarinda</td><td>KM Uji &amp; Co</td><td>135</td><td>2026-10-27</td><td>2026-10-27 11:13:43</td><td>198001012005011001</td><td>QRX1</td><td>'820260000000001</td><td>10000</td></tr>
<tr><td>2</td><td>Pelabuhan Laut Sangkulirang</td><td>TB Uji&nbsp;2</td><td>138</td><td>2026-10-27</td><td></td><td></td><td>QRX2</td><td>'820260000000002</td><td>35000</td></tr></table>`;
  const h = await bacaExcel(Buffer.from(html, 'utf8'), MODUL.p3k, 2026);
  assert.equal(h.fatal, null);
  assert.equal(h.sah.length, 2, JSON.stringify(h.galat));
  assert.deepEqual(h.sah.map((s) => s.nilai.wilayah_kerja), ['Samarinda', 'Sangkulirang']);
  assert.equal(h.sah[0].nilai.nama_kapal, 'KM Uji & Co');
  assert.equal(h.sah[1].nilai.nama_kapal, 'TB Uji 2');
  assert.equal(h.sah[0].nilai.jumlah_bayar, 10000);
  assert.equal(h.sah[0].nilai.tgl_published, '2026-10-27 11:13:43');
});

// ---------------------------------------------------------------- Bagian 2: database

after(async () => { await tutupDb(); });

async function bersihkan(m: ModulInput) {
  const k = kolomNama(m);
  await getDbClient().execute({ sql: `DELETE FROM \`${m.tabel}\` WHERE ${k} LIKE ? OR ${k} LIKE ?`, args: ['UJI-%', 'PT UJI-%'] });
  await getDbClient().execute({ sql: 'DELETE FROM upload_riwayat WHERE modul = ?', args: [m.kunci] });
}

for (const m of BARU) {
  test(`${m.kunci}: unggah ekspor Sinkarkes -> pratinjau, simpan, filter wilayah+bulan, unggah ulang, hari lain, barcode berbeda, batalkan`, async () => {
    await bersihkan(m);
    const tabelHitung = async () => Number((await getDbClient().execute({ sql: `SELECT COUNT(*) n FROM \`${m.tabel}\` WHERE ${kolomNama(m)} LIKE ?`, args: [m.kunci === 'air' ? 'PT UJI-%' : 'UJI-%'] })).rows[0].n);
    const unggah = async (rows: Record<string, unknown>[], nama: string) => {
      const h = await bacaExcel(await xlsxSinkarkes(m.kunci, rows), m, 2026);
      assert.equal(h.fatal, null);
      assert.equal(h.galat.length, 0, JSON.stringify(h.galat));
      const brs = h.sah.map((s) => s.nilai);
      const rencana = await hitungRencana(m, 2026, brs);
      const r = await simpanUnggahan({ modul: m, tahun: 2026, namaFile: nama, baris: brs, kolomAda: h.kolomAda, jumlahBaris: brs.length, jumlahDitolak: 0, pengguna: 'uji' });
      assert.equal(r.baru, rencana.baru, 'pratinjau = hasil simpan (baru)');
      assert.equal(r.diperbarui, rencana.diperbarui, 'pratinjau = hasil simpan (diperbarui)');
      return r;
    };

    const hari1 = [baris(m.kunci, 'Samarinda', 'a', '2026-10-05'), baris(m.kunci, 'Pelabuhan Laut Sangkulirang', 'b', '2026-10-06'), baris(m.kunci, 'Pelabuhan Laut Sangatta', 'c', '2026-11-10')];
    const r1 = await unggah(hari1, 'hari1.xlsx');
    assert.deepEqual([r1.baru, r1.diperbarui], [3, 0]);
    assert.equal(await tabelHitung(), 3);

    // filter seperti yang dikirim UI: nama pendek wilayah + bulan + tahun
    const okt = await daftarData(m, { tahun: 2026, bulan: 10, wilayah: 'Samarinda', ukuran: 200 });
    assert.equal(okt.baris.filter((b) => String(b[kolomNama(m)]).includes('UJI-')).length, 1);
    const sk = await daftarData(m, { tahun: 2026, bulan: 10, wilayah: 'Sangkulirang', ukuran: 200 });
    assert.equal(sk.baris.filter((b) => String(b[kolomNama(m)]).includes('UJI-')).length, 1);
    const nov = await daftarData(m, { tahun: 2026, bulan: 11, wilayah: 'Sangatta', ukuran: 200 });
    assert.equal(nov.baris.filter((b) => String(b[kolomNama(m)]).includes('UJI-')).length, 1);
    assert.equal(nov.baris.find((b) => String(b[kolomNama(m)]).includes('UJI-'))?.wilayah_kerja, 'Sangatta');

    // unggah ulang berkas yang sama: tidak menggandakan
    const r2 = await unggah(hari1, 'hari1-ulang.xlsx');
    assert.deepEqual([r2.baru, r2.diperbarui], [0, 3]);
    assert.equal(await tabelHitung(), 3);

    // berkas hari lain: menambah, tidak menyentuh data lama
    const r3 = await unggah([baris(m.kunci, 'Samarinda', 'd', '2026-10-07')], 'hari7.xlsx');
    assert.deepEqual([r3.baru, r3.diperbarui], [1, 0]);
    assert.equal(await tabelHitung(), 4);

    // kapal/wilayah/tanggal sama tetapi barcode/QR (atau sample+sebagai) berbeda = dokumen lain, bukan timpaan
    const lain = baris(m.kunci, 'Samarinda', 'd', '2026-10-07', 'QR-lain');
    if (m.kunci === 'air') { lain['Sebagai'] = 'AIR BERSIH'; }
    const r4 = await unggah([lain], 'dokumen-lain.xlsx');
    assert.deepEqual([r4.baru, r4.diperbarui], [1, 0]);
    assert.equal(await tabelHitung(), 5);

    // batalkan unggahan terakhir: hanya baris barunya yang hilang
    assert.equal(await hapusBatch(m, r4.batchId), 1);
    assert.equal(await tabelHitung(), 4);
    await bersihkan(m);
  });

  test(`${m.kunci}: form tambah satu baris; duplikat ditolak; wilayah wajib`, async () => {
    await bersihkan(m);
    const k = kolomNama(m);
    const mentah: Record<string, unknown> = { wilayah_kerja: 'Lhoktuan', tgl_terbit: '2026-09-15', [k]: m.kunci === 'air' ? 'PT UJI-form' : 'UJI-form', ...(m.kunci === 'air' ? { sample_id: 'UJI-form', sebagai: 'AIR MINUM' } : {}) };
    const h = validasiBaris(m, mentah);
    assert.deepEqual(h.galat, []);
    assert.equal(await tambahSatu(m, h.nilai!), 'ok');
    assert.equal(await tambahSatu(m, h.nilai!), 'duplikat');
    const d = await daftarData(m, { tahun: 2026, bulan: 9, wilayah: 'Lhoktuan', sumber: 'input', ukuran: 200 });
    assert.ok(d.baris.some((b) => b.wilayah_kerja === 'Lhoktuan' && b.sumber === 'input'));
    assert.equal(validasiBaris(m, { ...mentah, wilayah_kerja: '' }).nilai, null);
    await bersihkan(m);
  });
}
