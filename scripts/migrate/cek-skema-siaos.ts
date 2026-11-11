// scripts/migrate/cek-skema-siaos.ts
// Membandingkan modul input SIAOS (lib/input-data/modul-siaos.ts) dengan tabel `siaos` di database YANG SEDANG DIPAKAI.
// HANYA MEMBACA. Tidak mencetak nama pasien, diagnosa, atau isi bebas lain: hanya struktur kolom, jumlah baris,
// dan sebaran nilai kategori (Ya/Tidak, satuan usia, dst.).
//   npx tsx --env-file=.env.local scripts/migrate/cek-skema-siaos.ts
// Keluar dengan kode 1 bila ada yang GAGAL (kolom hilang / tipe tidak cocok / panjang kolom kurang).
import { getDbClient } from '@/lib/db/client';
import { dapatkanModul } from '@/lib/input-data/modul';

type Baris = Record<string, unknown>;
const db = getDbClient();
const q = async (sql: string, args: (string | number)[] = []): Promise<Baris[]> => (await db.execute({ sql, args })).rows as Baris[];

let gagal = 0;
let cek = 0;
const ok = (t: string) => console.log(`  [OK]     ${t}`);
const peringatan = (t: string) => { cek++; console.log(`  [CEK]    ${t}`); };
const tidak = (t: string) => { gagal++; console.log(`  [GAGAL]  ${t}`); };

async function main() {
  const modul = dapatkanModul('siaos');
  if (!modul) throw new Error('Modul siaos belum terdaftar. Terapkan patch dulu.');

  console.log('\n== 1. Kolom tabel siaos ==');
  const kol = await q(
    `SELECT column_name, data_type, character_maximum_length AS panjang, is_nullable, column_default, is_identity
       FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'siaos' ORDER BY ordinal_position`);
  if (!kol.length) { tidak('tabel siaos tidak ditemukan di skema aktif'); return; }
  const peta = new Map(kol.map((k) => [String(k.column_name), k]));
  for (const k of kol) console.log(`  ${String(k.column_name).padEnd(34)} ${String(k.data_type).padEnd(18)} ${k.panjang ?? ''}`.trimEnd());

  console.log('\n== 2. Kecocokan dengan modul input ==');
  for (const k of modul.kolom) {
    const d = peta.get(k.nama);
    if (!d) { tidak(`${k.nama}: kolom tidak ada di tabel`); continue; }
    const tipe = String(d.data_type), panjang = d.panjang == null ? null : Number(d.panjang);
    if (k.tipe === 'bilangan') {
      /integer|smallint|bigint|numeric/.test(tipe) ? ok(`${k.nama}: ${tipe}`) : tidak(`${k.nama}: modul bilangan, tabel ${tipe}`);
    } else if (k.tipe === 'tanggal') {
      if (tipe === 'date') ok(`${k.nama}: date`);
      else if (/char|text/.test(tipe)) peringatan(`${k.nama}: bertipe ${tipe} (teks). Dipakai apa adanya sebagai 'YYYY-MM-DD'; pertimbangkan diubah ke date.`);
      else tidak(`${k.nama}: modul tanggal, tabel ${tipe}`);
    } else if (/char|text/.test(tipe)) {
      const butuh = k.tipe === 'wilker' ? 100 : (k.maks ?? 255);
      if (panjang !== null && panjang < butuh) tidak(`${k.nama}: kolom varchar(${panjang}) lebih pendek dari batas modul ${butuh}. Perkecil "maks" di modul-siaos.ts atau perlebar kolom`);
      else ok(`${k.nama}: ${tipe}${panjang ? `(${panjang})` : ''}`);
    } else tidak(`${k.nama}: tipe modul ${k.tipe} vs tabel ${tipe}`);
  }
  const id = peta.get('id');
  id?.column_default || id?.is_identity === 'YES' ? ok('id: terisi otomatis') : tidak('id: tidak punya nilai bawaan (serial/identity); insert dari modul akan gagal. Jalankan scripts/migrate/30_siaos_input.sql');
  for (const c of ['sumber', 'batch_id']) {
    peta.has(c) ? ok(`${c}: ada`) : tidak(`${c}: belum ada. Jalankan scripts/migrate/30_siaos_input.sql`);
  }

  console.log('\n== 3. Isi tabel (hanya jumlah dan sebaran kategori) ==');
  const ringkas = (await q(`SELECT COUNT(*) AS n, MIN(tanggal)::text AS awal, MAX(tanggal)::text AS akhir FROM siaos`))[0];
  console.log(`  baris: ${ringkas.n}   tanggal: ${ringkas.awal ?? '-'} s.d. ${ringkas.akhir ?? '-'}`);
  const tg = peta.get('tanggal');
  if (tg && /char|text/.test(String(tg.data_type))) {
    const buruk = Number((await q(`SELECT COUNT(*) AS n FROM siaos WHERE tanggal IS NOT NULL AND tanggal !~ '^\\d{4}-\\d{2}-\\d{2}$'`))[0].n);
    buruk ? tidak(`${buruk} baris bertanggal bukan YYYY-MM-DD (daftar tahun di halaman input akan galat)`) : ok('semua tanggal berformat YYYY-MM-DD');
  }
  for (const c of ['satuan_usia', 'jenis_kelamin', 'kondisi_lanjut_perjalanan', 'perlu_kursi_dorong', 'butuh_bantuan_medis', 'ambulance', 'perlu_bantuan_makanan_medikasi', 'wilayah_kerja']) {
    if (!peta.has(c)) continue;
    const r = await q(`SELECT COALESCE(NULLIF(TRIM(${c}::text), ''), '(kosong)') AS v, COUNT(*) AS n FROM siaos GROUP BY 1 ORDER BY n DESC LIMIT 9`);
    console.log(`  ${c}: ${r.map((x) => `${x.v}=${x.n}`).join('  |  ')}`);
  }

  if (peta.has('no_surat')) {
    const bentuk = await q(`SELECT regexp_replace(regexp_replace(no_surat, '[0-9]+', '9', 'g'), '[A-Za-z]+', 'A', 'g') AS b, COUNT(*) AS n, COUNT(*) FILTER (WHERE no_surat ~ '\\s') AS berspasi FROM siaos WHERE no_surat IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT 6`);
    console.log(`  bentuk no_surat (angka=9, huruf=A): ${bentuk.map((x) => `${x.b} x${x.n}${Number(x.berspasi) ? ` (${x.berspasi} berspasi)` : ''}`).join('  |  ')}`);
  }
  if (peta.has('kode_wilker')) {
    const kw = Number((await q(`SELECT COUNT(*) AS n FROM siaos WHERE kode_wilker IS NULL`))[0].n);
    console.log(`  baris tanpa kode_wilker: ${kw}`);
  }

  console.log('\n== 4. Indeks unik pada siaos (bisa menolak baris unggahan) ==');
  const idx = await q(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'siaos' ORDER BY indexname`);
  for (const i of idx) console.log(`  ${/UNIQUE/i.test(String(i.indexdef)) ? '[UNIK] ' : '       '}${String(i.indexdef).replace(/^CREATE (UNIQUE )?INDEX /i, '')}`);
  for (const i of idx) {
    if (/UNIQUE/i.test(String(i.indexdef)) && /\(wilayah_kerja, no_surat\)/.test(String(i.indexdef)))
      peringatan(`${i.indexname}: satu surat hanya boleh satu pasien. Ekspor Sinkarkes bisa memuat beberapa pasien pada satu surat, dan itu membatalkan SELURUH unggahan. Jalankan scripts/migrate/31_siaos_surat_banyak_pasien.sql`);
  }
  const trg = await q(`SELECT tgname FROM pg_trigger WHERE tgrelid = 'siaos'::regclass AND NOT tgisinternal ORDER BY tgname`);
  console.log(`  trigger pada siaos: ${trg.length ? trg.map((x) => x.tgname).join(', ') : '(tidak ada)'}`);

  console.log('\n== 5. Tabel riwayat unggahan ==');
  const rw = await q(`SELECT 1 AS x FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'upload_riwayat'`);
  rw.length ? ok('upload_riwayat ada') : tidak('upload_riwayat tidak ada (dipakai semua modul unggah Excel)');
}

main()
  .then(() => { console.log(gagal ? `\nHASIL: ${gagal} hal perlu diperbaiki.` : cek ? `\nHASIL: tidak ada yang GAGAL, tetapi ${cek} butir [CEK] perlu keputusan Anda.` : '\nHASIL: semua cocok.'); process.exit(gagal ? 1 : 0); })
  .catch((e) => { console.error('\nGALAT:', e instanceof Error ? e.message : e); process.exit(2); });