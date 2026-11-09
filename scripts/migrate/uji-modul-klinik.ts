// scripts/migrate/uji-modul-klinik.ts
// Uji modul input HIV (VCT), TB (skrining), dan Migrasi Malaria. Murni: tanpa database.
//   1. Struktur modul cocok dengan skema PostgreSQL (nama kolom, tipe, panjang), kunci/alias tidak bentrok.
//   2. Unggah Excel nyata (dibuat di memori) dengan berbagai model tanggal lewat bacaExcel().
//
//   npx tsx --test scripts/migrate/uji-modul-klinik.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { MODUL, kunciJudul, dapatkanModul } from '@/lib/input-data/modul';
import { bacaExcel, buatTemplate } from '@/lib/input-data/parse-excel';
import { buatKamus, type Wilayah } from '@/lib/wilayah-kerja';

// ---- Cuplikan skema PostgreSQL (information_schema), diambil 8 Nov 2026. Perbarui bila tabel berubah. ----
type Kol = { t: 'integer' | 'date' | 'varchar' | 'text'; len?: number };
const v = (len: number): Kol => ({ t: 'varchar', len });
const TEKS: Kol = { t: 'text' };
const TGL: Kol = { t: 'date' };
const SKEMA: Record<string, Record<string, Kol>> = {
  hiv_data: {
    wilayah_kerja: v(100), tanggal_kegiatan: TGL, nik: v(32), nama: v(255), sex: v(20), tanggal_lahir: v(32), alamat: TEKS,
    status_perkawinan: v(100), kunjungan: v(100), hasil: v(100), jenis_reagen: v(255), hubungan_berisiko: TEKS,
  },
  tb_data: {
    wilayah_kerja: v(100), tanggal_pelaksanaan: TGL, nama_peserta: v(255), provinsi: v(100), kabupaten_kota: v(100), nik: v(32),
    pekerjaan: v(255), tanggal_lahir: v(32), jenis_kelamin: v(20), no_hp: v(50), riwayat_kontak_tbc: v(100), jenis_kontak_tbc: v(255),
    pernah_terdiagnosa_tbc: v(100), keterangan_riwayat_tbc: TEKS, kekurangan_gizi: v(100), merokok: v(100), perokok_pasif: v(100),
    riwayat_dm: v(100), odhiv: v(100), lansia: v(100), ibu_hamil: v(100), hasil_skrining_gejala: TEKS, terduga_tbc: v(100),
    tindak_lanjut_pemeriksaan: TEKS, fasyankes_pemeriksaan: v(255), nomor_register_sitb: v(100), tanggal_hasil_diagnosis: TGL,
    hasil_pemeriksaan_diagnosis: TEKS, jenis_pemeriksaan_diagnosis: v(255), terkonfirmasi_tbc: v(100),
  },
  migrasi_malaria: {
    wilayah_kerja: v(100), nama_kapal_pesawat: v(255), tanggal_kegiatan: TGL, nama_lengkap: v(255), tanggal_lahir: v(32),
    jenis_kelamin: v(20), umur: { t: 'integer' }, pekerjaan: v(255), pendidikan_terakhir: v(255), alamat_asal: TEKS, alamat_tujuan: TEKS,
    pernah_sakit_malaria: v(255), tahu_penyakit_malaria: v(255), tahu_gejala_malaria: v(255), sekitar_pernah_sakit_malaria: v(255),
    pernah_dapat_informasi_malaria: v(255), sekitar_dekat_dengan: v(255), punya_ternak: v(255), tempat_buang_hajat: v(255),
    pakai_baju_panjang_repellent: v(255), pakai_saat_tidur: v(255), tempat_berobat: v(255), hasil_rdt: v(255),
  },
};
const KUNCI = ['hiv', 'tb', 'migrasi_malaria'] as const;

test('struktur modul cocok dengan skema database', () => {
  for (const kunci of KUNCI) {
    const m = dapatkanModul(kunci);
    assert.ok(m, `modul ${kunci} terdaftar`);
    const db = SKEMA[m.tabel];
    assert.ok(db, `skema tabel ${m.tabel} ada di uji`);
    const nama = new Set<string>();
    for (const k of m.kolom) {
      assert.ok(!nama.has(k.nama), `${kunci}: kolom ganda ${k.nama}`);
      nama.add(k.nama);
      const d = db[k.nama];
      assert.ok(d, `${kunci}.${k.nama}: tidak ada di tabel ${m.tabel}`);
      if (k.tipe === 'wilker' || k.tipe === 'teks') {
        assert.ok(d.t === 'varchar' || d.t === 'text', `${kunci}.${k.nama}: tipe teks vs ${d.t}`);
        if (d.t === 'varchar') {
          // wilker disimpan sebagai nama pendek (<= 100); teks memakai `maks` (bawaan kerangka 255)
          const maks = k.tipe === 'wilker' ? 100 : (k.maks ?? 255);
          assert.ok(maks <= d.len!, `${kunci}.${k.nama}: maks ${maks} melebihi varchar(${d.len})`);
        }
      } else if (k.tipe === 'tanggal') {
        // tanggal lahir disimpan sebagai teks ISO (kolom varchar(32)); tanggal lain harus kolom date
        assert.ok(d.t === 'date' || (k.tanggalLahir && d.t === 'varchar' && d.len! >= 10), `${kunci}.${k.nama}: tanggal vs ${d.t}`);
      } else if (k.tipe === 'bilangan') {
        assert.equal(d.t, 'integer', `${kunci}.${k.nama}: bilangan vs ${d.t}`);
      } else {
        assert.fail(`${kunci}.${k.nama}: tipe ${k.tipe} tidak dipakai modul ini`);
      }
    }
    for (const c of [m.kolomTanggal, m.kolomWilayah, m.kolomKunci]) assert.ok(nama.has(c), `${kunci}: kolom kunci ${c} tidak ada`);
    for (const c of m.kolomDaftar) assert.ok(nama.has(c), `${kunci}: kolomDaftar ${c} tidak ada`);
    assert.equal(m.kolom.find((k) => k.nama === m.kolomTanggal)?.tipe, 'tanggal');
    assert.ok(m.kolom.find((k) => k.nama === m.kolomKunci)?.wajib, `${kunci}: kolom kunci harus wajib`);
  }
});

test('judul kolom Excel (label, nama kolom, alias) tidak bentrok antar kolom', () => {
  for (const kunci of KUNCI) {
    const m = MODUL[kunci];
    const peta = new Map<string, string>();
    for (const k of m.kolom) {
      for (const j of [k.label, k.nama, ...(k.alias ?? [])]) {
        const kj = kunciJudul(j);
        const sudah = peta.get(kj);
        assert.ok(!sudah || sudah === k.nama, `${kunci}: judul "${j}" dipakai ${sudah} dan ${k.nama}`);
        peta.set(kj, k.nama);
      }
    }
    assert.ok(!peta.has('no'), `${kunci}: judul "No" dipakai sebagai nomor baris dan diabaikan pembaca`);
  }
});

// ---- Excel nyata ----
const wil = (kode: string, nama: string, jenis: Wilayah['jenis'], urutan: number): Wilayah => ({
  kode, nama: `${jenis} ${nama}`, namaPendek: nama, namaPeta: nama, jenis, urutan, aktif: true,
  lat: null, lng: null, petaLat: null, petaLng: null, zoom: 13, subLokasi: [], unitSkdr: [], warna: null, catatan: null, alias: [],
});
const kamus = buatKamus([
  wil('WK01', 'Samarinda', 'Pelabuhan', 1), wil('WK02', 'APT Pranoto', 'Bandara', 2), wil('WK03', 'Tanjung Santan', 'Pelabuhan', 3),
  wil('WK04', 'Tanjung Laut', 'Pelabuhan', 4), wil('WK05', 'Lhoktuan', 'Pelabuhan', 5), wil('WK06', 'Sangatta', 'Pelabuhan', 6),
  wil('WK07', 'Sangkulirang', 'Pelabuhan', 7),
]);
const serial = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
const sel = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

async function baca(kunci: string, judul: string[], baris: unknown[][], tahun = 2026) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  ws.addRow(judul);
  for (const b of baris) ws.addRow(b);
  return bacaExcel(Buffer.from(await wb.xlsx.writeBuffer()), MODUL[kunci], tahun, kamus);
}

test('HIV: berbagai model tanggal kegiatan dan tanggal lahir dalam satu berkas', async () => {
  const judul = ['Wilayah Kerja', 'Tanggal Kegiatan', 'Nama', 'NIK', 'Jenis Kelamin', 'Tanggal Lahir', 'Kunjungan', 'Hasil'];
  const h = await baca('hiv', judul, [
    ['Samarinda',                   '2026-03-25',          'Klien 1', '6472000000000001', 'L', '04/03/1985',   'Baru',  'Non Reaktif'],
    ['Pelabuhan Laut Sangatta',     '25/03/2026',          'Klien 2', '',                 'P', '1990-07-15',   'Ulang', 'Non Reaktif'],
    ['APT Pranoto',                 '25 Maret 2026',       'Klien 3', '',                 'L', '4 Maret 1985', 'Baru',  'Reaktif'],
    ['Tanjung Santan',              serial(2026, 3, 25),   'Klien 4', '',                 'L', serial(1985, 3, 4), 'Baru', 'Non Reaktif'],
    ['Lhoktuan',                    sel(2026, 3, 25),      'Klien 5', '',                 'P', sel(1985, 3, 4),    'Baru', 'Non Reaktif'],
    ['Sangkulirang',                'Mar 25, 2026',        'Klien 6', '',                 'P', '15/08/05',     'Baru',  'Non Reaktif'],
    ['Tanjung Laut',                '25.03.26',            'Klien 7', '',                 'L', '1/1/1930',     'Baru',  'Non Reaktif'],
  ]);
  assert.equal(h.fatal, null);
  assert.deepEqual(h.galat, []);
  assert.equal(h.sah.length, 7);
  assert.deepEqual(h.sah.map((s) => s.nilai.tanggal_kegiatan), Array(7).fill('2026-03-25'));
  assert.deepEqual(h.sah.map((s) => s.nilai.tanggal_lahir), ['1985-03-04', '1990-07-15', '1985-03-04', '1985-03-04', '1985-03-04', '2005-08-15', '1930-01-01']);
  assert.deepEqual(h.sah.map((s) => s.nilai.wilayah_kerja), ['Samarinda', 'Sangatta', 'APT Pranoto', 'Tanjung Santan', 'Lhoktuan', 'Sangkulirang', 'Tanjung Laut']);
});

test('HIV: baris ganda di berkas yang sama ditolak dengan sebutan "nama klien"', async () => {
  const judul = ['Wilayah Kerja', 'Tanggal Kegiatan', 'Nama', 'Hasil'];
  const h = await baca('hiv', judul, [
    ['Samarinda', '2026-03-25', 'Budi Santoso', 'Non Reaktif'],
    ['samarinda', '25/03/2026', 'budi  santoso', 'Non Reaktif'],
  ]);
  assert.equal(h.sah.length, 1);
  assert.equal(h.galat.length, 1);
  assert.match(h.galat[0].pesan.join(' '), /nama klien/);
});

test('TB: tanggal pelaksanaan, tanggal lahir, dan tanggal hasil diagnosis dengan gaya berbeda; alias judul lama', async () => {
  const judul = ['Wilker', 'Tgl Pelaksanaan', 'Nama', 'Kab/Kota', 'No. HP', 'Tgl Lahir', 'Jenis Kelamin', 'Terduga TB', 'Tanggal Diagnosis', 'Terkonfirmasi TB'];
  const h = await baca('tb', judul, [
    ['Samarinda', '2026-02-10', 'Peserta A', 'Samarinda', '0812', '12/10/1972', 'L', 'Ya', '2026-02-20', 'Ya'],
    ['Sangatta',  '10 Februari 2026', 'Peserta B', 'Kutai Timur', '', '12 Oktober 1972', 'P', 'Tidak', '', ''],
    ['Samarinda', '10/02/2026', 'Peserta C', 'Samarinda', '', '03/05/66', 'P', 'Tidak', '20/02/2026', ''],
  ]);
  assert.equal(h.fatal, null);
  assert.deepEqual(h.galat, []);
  assert.deepEqual(h.sah.map((s) => s.nilai.tanggal_pelaksanaan), Array(3).fill('2026-02-10'));
  assert.deepEqual(h.sah.map((s) => s.nilai.tanggal_lahir), ['1972-10-12', '1972-10-12', '1966-05-03']);
  assert.deepEqual(h.sah.map((s) => s.nilai.tanggal_hasil_diagnosis), ['2026-02-20', null, '2026-02-20']);
  assert.equal(h.sah[0].nilai.terduga_tbc, 'Ya');
});

test('Migrasi Malaria: umur dibatasi 0-120, tanggal lahir lama terbaca, nama wajib', async () => {
  const judul = ['Wilayah Kerja', 'Tanggal Kegiatan', 'Nama Lengkap', 'Tanggal Lahir', 'Umur', 'Hasil RDT'];
  const h = await baca('migrasi_malaria', judul, [
    ['Samarinda', '2026-04-02', 'Responden 1', '1980-01-31', 46, 'Negatif'],
    ['Samarinda', '02/04/2026', 'Responden 2', '31 Januari 1980', 130, 'Negatif'],  // umur di luar rentang
    ['Samarinda', '02-04-2026', '',            '1980-01-31', 46, 'Negatif'],        // nama kosong
    ['Samarinda', 'bukan tanggal', 'Responden 4', '1980-01-31', 46, 'Negatif'],     // tanggal rusak
  ]);
  assert.equal(h.sah.length, 1);
  assert.equal(h.galat.length, 3);
  assert.equal(h.sah[0].nilai.umur, 46);
  assert.equal(h.sah[0].nilai.tanggal_lahir, '1980-01-31');
});

test('template Excel memuat judul kolom (kolom wajib bertanda *) dan petunjuk wilayah dari database', async () => {
  for (const kunci of KUNCI) {
    const buf = await buatTemplate(MODUL[kunci], ['Samarinda', 'Sangatta']);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    const judul = (wb.getWorksheet('Data')!.getRow(1).values as unknown[]).filter(Boolean).map(String);
    assert.ok(judul.some((j) => j.endsWith('*')), `${kunci}: ada kolom wajib bertanda *`);
    assert.equal(judul.filter((j) => j.endsWith('*')).length, MODUL[kunci].kolom.filter((k) => k.wajib).length);
    const petunjuk = (wb.getWorksheet('Petunjuk')!.getColumn(1).values as unknown[]).filter(Boolean).map(String).join('\n');
    assert.match(petunjuk, /Samarinda, Sangatta/);
  }
});
