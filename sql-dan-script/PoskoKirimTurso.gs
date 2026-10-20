/**
 * POSKO NATARU / POSKO IDUL FITRI — kirim data Google Sheets ke Turso
 * ---------------------------------------------------------------------
 * Satu spreadsheet = satu posko. Untuk posko lain, buat salinan spreadsheet
 * lalu ubah POSKO dan TAHUN di bawah.
 *
 * SETUP (sekali saja):
 *  1. Extensions > Apps Script, tempel seluruh kode ini, simpan.
 *  2. Project Settings > Script Properties, tambahkan:
 *       TURSO_URL   = libsql://nama-db-anda.turso.io
 *       TURSO_TOKEN = token database Turso
 *  3. Muat ulang spreadsheet. Muncul menu "Posko". Jalankan "Siapkan lembar".
 *
 * ISI DATA: tiap baris = 1 tanggal x 1 wilayah x 1 jenis. Gunakan menu
 * "Tambah blok harian" supaya daftar jenis penyakit/PTM terisi otomatis.
 * Sel angka KOSONG = belum diinput (baris dilewati). Isi 0 bila memang nol kasus.
 * Mengirim ulang aman (data tanggal+wilayah+jenis yang sama ditimpa, tidak dobel).
 * Catatan: menghapus baris di sheet TIDAK menghapus data di Turso.
 */

// ===================== KONFIGURASI =====================
const POSKO = 'nataru'; // 'nataru' atau 'idul_fitri'
const TAHUN = 2026;     // tahun posko (Nataru 2026/2027 => 2026)

const TAB_PENYAKIT = 'PENYAKIT';
const TAB_KLB = 'KLB';
const TAB_PTM = 'PTM';
const ZONA_WAKTU = 'Asia/Makassar';
const UKURAN_BATCH = 40;

const WILAYAH_POSKO = ['Samarinda', 'APT Pranoto', 'Lhoktuan'];

const DAFTAR_PENYAKIT = [
  'DIARE AKUT',
  'MALARIA KONFIRMASI',
  'SUSPEK DENGUE',
  'PNEUMONIA',
  'DIARE BERDARAH/DISENTRI',
  'SUSPEK DEMAM TIFOID',
  'SINDROM JAUNDICE AKUT',
  'SUSPEK CHIKUNGUNYA',
  'SUSPEK FLU BURUNG PADA MANUSIA',
  'SUSPEK CAMPAK',
  'SUSPEK DIFTERI',
  'PERTUSIS',
  'ACUTE FLACID PARALYSIS (AFP)',
  'GIGITAN HEWAN PENULAR RABIES (GHPR)',
  'SUSPEK ANTRAX',
  'SUSPEK LEPTOSPIROSIS',
  'SUSPEK KOLERA',
  'SUSPEK MENINGITIS/ENCEPHALITIS',
  'SUSPEK TETANUS NEONATORUM',
  'SUSPEK TETANUS',
  'ILI (PENYAKIT SERUPA INFLUENZA)',
  'SUSPEK HFMD',
  'COVID-19 KONFIRMASI',
  'ISPA',
  'KERACUNAN PANGAN',
];

const DAFTAR_PTM = [
  'DIABETES',
  'HYPERTENSI',
  'GASTRITIS',
  'PENYAKIT KULIT (GATAL-GATAL; KUDIS)',
  'SAKIT MATA',
  'PENYAKIT JANTUNG',
  'HEAT STROKE',
];

// Judul kolom (dibaca BERDASARKAN URUTAN KOLOM, bukan nama)
const HEADER_PENYAKIT = [
  'Tanggal', 'Wilayah Kerja', 'Jenis Penyakit',
  'Kasus L <5 th', 'Kasus L ≥5 th', 'Kasus P <5 th', 'Kasus P ≥5 th',
  'Meninggal L <5 th', 'Meninggal L ≥5 th', 'Meninggal P <5 th', 'Meninggal P ≥5 th',
];
const HEADER_KLB = ['Tanggal', 'Wilayah Kerja', 'Jumlah Kejadian KLB', 'Keterangan'];
const HEADER_PTM = ['Tanggal', 'Wilayah Kerja', 'Jenis PTM', 'Laki-laki', 'Perempuan'];

// ===================== MENU =====================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Posko')
    .addItem('Siapkan lembar', 'siapkanLembar')
    .addItem('Tambah blok harian (Penyakit / PTM)', 'tambahBlokHarian')
    .addSeparator()
    .addItem('Kirim SEMUA ke Turso', 'kirimSemua')
    .addItem('Kirim tab PENYAKIT saja', 'kirimPenyakit')
    .addItem('Kirim tab KLB saja', 'kirimKlb')
    .addItem('Kirim tab PTM saja', 'kirimPtm')
    .addToUi();
}

function siapkanLembar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [[TAB_PENYAKIT, HEADER_PENYAKIT], [TAB_KLB, HEADER_KLB], [TAB_PTM, HEADER_PTM]].forEach(function (par) {
    let sheet = ss.getSheetByName(par[0]);
    if (!sheet) sheet = ss.insertSheet(par[0]);
    sheet.getRange(1, 1, 1, par[1].length).setValues([par[1]]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  tampilkan_('Lembar PENYAKIT, KLB, dan PTM sudah siap.');
}

/** Menambah baris kosong untuk SEMUA jenis penyakit/PTM pada 1 tanggal + 1 wilayah. */
function tambahBlokHarian() {
  const ui = SpreadsheetApp.getUi();
  const jawab = ui.prompt(
    'Tambah blok harian',
    'Isi: tanggal (YYYY-MM-DD) ; wilayah ; tab (PENYAKIT atau PTM)\nContoh: 2026-12-24 ; Samarinda ; PENYAKIT',
    ui.ButtonSet.OK_CANCEL
  );
  if (jawab.getSelectedButton() !== ui.Button.OK) return;

  const bagian = jawab.getResponseText().split(';').map(function (s) { return s.trim(); });
  const tanggal = tanggalKeIso_(bagian[0]);
  const wilayah = PETA_WILAYAH[kunci_(bagian[1])];
  const tab = kunci_(bagian[2]);
  if (!tanggal || !wilayah || (tab !== TAB_PENYAKIT && tab !== TAB_PTM)) {
    ui.alert('Format salah. Contoh: 2026-12-24 ; Samarinda ; PENYAKIT\nWilayah: ' + WILAYAH_POSKO.join(', '));
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
  if (!sheet) { ui.alert('Tab ' + tab + ' belum ada. Jalankan "Siapkan lembar" dulu.'); return; }

  const daftar = tab === TAB_PENYAKIT ? DAFTAR_PENYAKIT : DAFTAR_PTM;
  const lebar = tab === TAB_PENYAKIT ? HEADER_PENYAKIT.length : HEADER_PTM.length;
  const baris = daftar.map(function (jenis) {
    const r = [tanggal, wilayah, jenis];
    while (r.length < lebar) r.push('');
    return r;
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, baris.length, lebar).setValues(baris);
  tampilkan_(baris.length + ' baris ditambahkan. Isi angkanya, lalu kirim ke Turso.');
}

// ===================== KIRIM =====================
function kirimPenyakit() { kirimTab_(TAB_PENYAKIT, prosesPenyakit_); }
function kirimKlb()      { kirimTab_(TAB_KLB, prosesKlb_); }
function kirimPtm()      { kirimTab_(TAB_PTM, prosesPtm_); }

/** Bisa juga dipasang sebagai trigger berkala (Triggers > Add trigger > kirimSemua). */
function kirimSemua() {
  const ringkasan = [
    kirimTab_(TAB_PENYAKIT, prosesPenyakit_, true),
    kirimTab_(TAB_KLB, prosesKlb_, true),
    kirimTab_(TAB_PTM, prosesPtm_, true),
  ];
  tampilkan_(ringkasan.join('\n\n'));
}

function kirimTab_(namaTab, prosesFn, tanpaPesan) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(namaTab);
  if (!sheet) {
    const pesan = 'Tab ' + namaTab + ' belum ada. Jalankan "Siapkan lembar".';
    if (!tanpaPesan) tampilkan_(pesan);
    return pesan;
  }
  const hasil = prosesFn(sheet.getDataRange().getValues());
  let ringkas = namaTab + ': ';
  if (hasil.stmts.length > 0) {
    const kirim = kirimKeTurso_(hasil.stmts);
    ringkas += kirim.sukses + ' baris terkirim';
    if (kirim.galat.length) ringkas += ', ' + kirim.galat.length + ' gagal di Turso:\n' + kirim.galat.slice(0, 5).join('\n');
  } else {
    ringkas += 'tidak ada baris terisi untuk dikirim';
  }
  if (hasil.galat.length) {
    ringkas += '\n' + hasil.galat.length + ' baris dilewati karena salah isi:\n' + hasil.galat.slice(0, 10).join('\n');
  }
  if (!tanpaPesan) tampilkan_(ringkas);
  return ringkas;
}

function tampilkan_(teks) {
  try { SpreadsheetApp.getUi().alert(teks); } catch (e) { Logger.log(teks); } // trigger tidak punya UI
}

// ===================== PEMROSESAN BARIS (fungsi murni, mudah diuji) =====================
function kunci_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase();
}
function bangunPeta_(daftar) {
  const peta = {};
  daftar.forEach(function (nama) { peta[kunci_(nama)] = nama; });
  return peta;
}
const PETA_WILAYAH = bangunPeta_(WILAYAH_POSKO);
const PETA_PENYAKIT = bangunPeta_(DAFTAR_PENYAKIT);
const PETA_PTM = bangunPeta_(DAFTAR_PTM);

function gabungTanggal_(y, mo, d) {
  const tahun = Number(y), bulan = Number(mo), hari = Number(d);
  const uji = new Date(Date.UTC(tahun, bulan - 1, hari));
  if (uji.getUTCFullYear() !== tahun || uji.getUTCMonth() !== bulan - 1 || uji.getUTCDate() !== hari) return null;
  return tahun + '-' + ('0' + bulan).slice(-2) + '-' + ('0' + hari).slice(-2);
}

/** Terima Date (dari sel tanggal), "YYYY-MM-DD", atau "DD/MM/YYYY" -> "YYYY-MM-DD" (atau null). */
function tanggalKeIso_(nilai) {
  if (nilai instanceof Date) {
    return isNaN(nilai.getTime()) ? null : Utilities.formatDate(nilai, ZONA_WAKTU, 'yyyy-MM-dd');
  }
  const teks = String(nilai === null || nilai === undefined ? '' : nilai).trim();
  let m = teks.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return gabungTanggal_(m[1], m[2], m[3]);
  m = teks.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return gabungTanggal_(m[3], m[2], m[1]);
  return null;
}

/** null = sel kosong, NaN = bukan bilangan bulat >= 0, selain itu angkanya. */
function angka_(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return isFinite(n) && n >= 0 && Math.floor(n) === n ? n : NaN;
}

function semuaKosong_(arr) { return arr.every(function (a) { return a === null; }); }

const SQL_PENYAKIT =
  'INSERT INTO posko_penyakit_harian (posko, tahun, tanggal, wilayah_kerja, jenis_penyakit, ' +
  'kasus_lk_lt5, kasus_lk_ge5, kasus_pr_lt5, kasus_pr_ge5, mati_lk_lt5, mati_lk_ge5, mati_pr_lt5, mati_pr_ge5) ' +
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
  'ON CONFLICT (posko, tahun, tanggal, wilayah_kerja, jenis_penyakit) DO UPDATE SET ' +
  'kasus_lk_lt5 = excluded.kasus_lk_lt5, kasus_lk_ge5 = excluded.kasus_lk_ge5, ' +
  'kasus_pr_lt5 = excluded.kasus_pr_lt5, kasus_pr_ge5 = excluded.kasus_pr_ge5, ' +
  'mati_lk_lt5 = excluded.mati_lk_lt5, mati_lk_ge5 = excluded.mati_lk_ge5, ' +
  'mati_pr_lt5 = excluded.mati_pr_lt5, mati_pr_ge5 = excluded.mati_pr_ge5, diperbarui = datetime(\'now\')';

const SQL_KLB =
  'INSERT INTO posko_klb_harian (posko, tahun, tanggal, wilayah_kerja, jumlah_klb, keterangan) ' +
  'VALUES (?, ?, ?, ?, ?, ?) ' +
  'ON CONFLICT (posko, tahun, tanggal, wilayah_kerja) DO UPDATE SET ' +
  'jumlah_klb = excluded.jumlah_klb, keterangan = excluded.keterangan, diperbarui = datetime(\'now\')';

const SQL_PTM =
  'INSERT INTO posko_ptm_harian (posko, tahun, tanggal, wilayah_kerja, jenis_ptm, jumlah_kasus, jumlah_lk, jumlah_pr) ' +
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
  'ON CONFLICT (posko, tahun, tanggal, wilayah_kerja, jenis_ptm) DO UPDATE SET ' +
  'jumlah_kasus = excluded.jumlah_kasus, jumlah_lk = excluded.jumlah_lk, jumlah_pr = excluded.jumlah_pr, ' +
  'diperbarui = datetime(\'now\')';

/** Validasi tanggal + wilayah (dipakai ketiga tab). Mengembalikan {tgl, wil} atau {galat}. */
function validasiKunci_(baris, noBaris) {
  const tgl = tanggalKeIso_(baris[0]);
  if (!tgl) return { galat: 'Baris ' + noBaris + ': tanggal tidak valid (' + baris[0] + ')' };
  const wil = PETA_WILAYAH[kunci_(baris[1])];
  if (!wil) return { galat: 'Baris ' + noBaris + ': wilayah "' + baris[1] + '" tidak dikenal (' + WILAYAH_POSKO.join(' / ') + ')' };
  return { tgl: tgl, wil: wil };
}

function prosesPenyakit_(nilai) {
  const stmts = [], galat = [];
  for (let i = 1; i < nilai.length; i++) {
    const baris = nilai[i], no = i + 1;
    const nums = baris.slice(3, 11).map(angka_);
    if (semuaKosong_(nums)) continue; // baris blok yang belum diisi
    const k = validasiKunci_(baris, no);
    if (k.galat) { galat.push(k.galat); continue; }
    const jenis = PETA_PENYAKIT[kunci_(baris[2])];
    if (!jenis) { galat.push('Baris ' + no + ': jenis penyakit "' + baris[2] + '" tidak ada di daftar'); continue; }
    if (nums.some(function (n) { return n !== null && isNaN(n); })) {
      galat.push('Baris ' + no + ': angka harus bilangan bulat >= 0'); continue;
    }
    stmts.push({
      sql: SQL_PENYAKIT,
      args: [POSKO, TAHUN, k.tgl, k.wil, jenis].concat(nums.map(function (n) { return n === null ? 0 : n; })),
    });
  }
  return { stmts: stmts, galat: galat };
}

function prosesKlb_(nilai) {
  const stmts = [], galat = [];
  for (let i = 1; i < nilai.length; i++) {
    const baris = nilai[i], no = i + 1;
    const jumlah = angka_(baris[2]);
    if (jumlah === null) continue;
    const k = validasiKunci_(baris, no);
    if (k.galat) { galat.push(k.galat); continue; }
    if (isNaN(jumlah)) { galat.push('Baris ' + no + ': jumlah KLB harus bilangan bulat >= 0'); continue; }
    const ket = String(baris[3] === undefined || baris[3] === null ? '' : baris[3]).trim();
    stmts.push({ sql: SQL_KLB, args: [POSKO, TAHUN, k.tgl, k.wil, jumlah, ket === '' ? null : ket] });
  }
  return { stmts: stmts, galat: galat };
}

function prosesPtm_(nilai) {
  const stmts = [], galat = [];
  for (let i = 1; i < nilai.length; i++) {
    const baris = nilai[i], no = i + 1;
    const lk = angka_(baris[3]);
    const pr = angka_(baris[4]);
    if (lk === null && pr === null) continue; // baris blok yang belum diisi
    const k = validasiKunci_(baris, no);
    if (k.galat) { galat.push(k.galat); continue; }
    const jenis = PETA_PTM[kunci_(baris[2])];
    if (!jenis) { galat.push('Baris ' + no + ': jenis PTM "' + baris[2] + '" tidak ada di daftar'); continue; }
    if ((lk !== null && isNaN(lk)) || (pr !== null && isNaN(pr))) {
      galat.push('Baris ' + no + ': jumlah laki-laki/perempuan harus bilangan bulat >= 0'); continue;
    }
    const l = lk === null ? 0 : lk, p = pr === null ? 0 : pr;
    stmts.push({ sql: SQL_PTM, args: [POSKO, TAHUN, k.tgl, k.wil, jenis, l + p, l, p] });
  }
  return { stmts: stmts, galat: galat };
}

// ===================== TURSO (HTTP pipeline) =====================
function keArgTurso_(v) {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'number') return { type: 'integer', value: String(v) };
  return { type: 'text', value: String(v) };
}

function kirimKeTurso_(stmts) {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('TURSO_URL');
  const token = props.getProperty('TURSO_TOKEN');
  if (!url || !token) {
    throw new Error('Isi TURSO_URL dan TURSO_TOKEN di Project Settings > Script Properties.');
  }
  const endpoint = url.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '') + '/v2/pipeline';

  let sukses = 0;
  const galat = [];
  for (let i = 0; i < stmts.length; i += UKURAN_BATCH) {
    const potongan = stmts.slice(i, i + UKURAN_BATCH);
    const requests = potongan.map(function (s) {
      return { type: 'execute', stmt: { sql: s.sql, args: s.args.map(keArgTurso_) } };
    });
    requests.push({ type: 'close' });

    const res = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ requests: requests }),
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      throw new Error('Turso HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
    }
    const hasil = JSON.parse(res.getContentText()).results;
    potongan.forEach(function (s, j) {
      const r = hasil[j];
      if (r && r.type === 'ok') sukses++;
      else galat.push((r && r.error && r.error.message) || 'gagal');
    });
  }
  return { sukses: sukses, galat: galat };
}
