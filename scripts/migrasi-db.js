const mysql = require('mysql2/promise');
const { Pool: PgPool } = require('pg');

// 1. Konfigurasi Database MariaDB (Sumber)
const mariadb = mysql.createPool({
  host: 'cp.bkksamarinda.or.id', // atau IP Public Server Kantor Anda
  port: 3306,
  user: 'bkksamarinda',
  password: 'Earlene174@',
  database: 'bkksamarinda_surveilans',
});

// 2. Konfigurasi Database PostgreSQL cPanel (Tujuan)
const postgres = new PgPool({
  host: 'localhost',
  port: 5432,
  user: 'bkksamarinda_surveilansdb',
  password: 'Earlene174@',
  database: 'bkksamarinda_surveilans',
});

async function jalankanMigrasi() {
  console.log('🚀 Memulai proses migrasi data dari MariaDB ke PostgreSQL...');

  try {
    // Ambil daftar semua tabel dari MariaDB
    const [tables] = await mariadb.query("SHOW TABLES");
    
    if (!tables || tables.length === 0) {
      console.log('⚠️ Tidak ada tabel yang ditemukan di database MariaDB.');
      return;
    }

    const tableKey = Object.keys(tables[0])[0];

    for (const row of tables) {
      const tableName = row[tableKey];
      console.log(`\n📦 Memproses tabel: ${tableName}`);

      // Ambil data dari MariaDB
      const [rows] = await mariadb.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length === 0) {
        console.log(`⚠️ Tabel "${tableName}" kosong, melewati...`);
        continue;
      }

      // Ambil struktur kolom
      const columns = Object.keys(rows[0]);
      const colNames = columns.map(c => `"${c}"`).join(', ');
      const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      // Salin data ke PostgreSQL
      let totalInserted = 0;
      for (const dataRow of rows) {
        const values = columns.map(col => dataRow[col]);
        const insertQuery = `INSERT INTO "${tableName}" (${colNames}) VALUES (${valuePlaceholders}) ON CONFLICT DO NOTHING;`;

        try {
          await postgres.query(insertQuery, values);
          totalInserted++;
        } catch (err) {
          console.error(`❌ Gagal menyisipkan baris pada tabel "${tableName}":`, err.message);
        }
      }

      console.log(`✅ Berhasil memindahkan ${totalInserted}/${rows.length} baris untuk tabel "${tableName}".`);
    }

    console.log('\n🎉 Migrasi data selesai dengan sukses!');
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat migrasi:', error);
  } finally {
    await mariadb.end();
    await postgres.end();
  }
}

jalankanMigrasi();