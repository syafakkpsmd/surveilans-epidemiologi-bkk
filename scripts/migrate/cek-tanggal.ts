import mysql from 'mysql2/promise';

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await c.query(`
    SELECT 'tb_data' t, MAX(tanggal_pelaksanaan) terakhir FROM tb_data
    UNION ALL SELECT 'hiv_data', MAX(tanggal_kegiatan) FROM hiv_data
    UNION ALL SELECT 'kunjungan_poliklinik', MAX(tanggal_pemeriksaan) FROM kunjungan_poliklinik
    UNION ALL SELECT 'kier_kesehatan', MAX(tanggal_pemeriksaan) FROM kier_kesehatan
    UNION ALL SELECT 'siaos', MAX(tanggal) FROM siaos;
  `);

  console.table(rows);
  await c.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('Gagal:', err);
  process.exit(1);
});