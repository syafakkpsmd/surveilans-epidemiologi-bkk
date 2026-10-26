// Menyalin kredensial dari auth.users (Supabase) ke auth_kredensial (MariaDB).
// Hash bcrypt disalin apa adanya (pengguna tidak perlu reset password).
// Tidak mencetak email/hash; hanya hitungan. Aman diulang (upsert). Opsi: --dry-run
// Env: SUPABASE_DB_URL (postgres://...), MARIADB_URL (mysql://user:pass@host:3306/db)
// Perlu: npm i -D pg mysql2
import pg from "pg";
import mysql from "mysql2/promise";

const { SUPABASE_DB_URL, MARIADB_URL } = process.env;
if (!SUPABASE_DB_URL || !MARIADB_URL) { console.error("Set SUPABASE_DB_URL dan MARIADB_URL."); process.exit(1); }
const dryRun = process.argv.includes("--dry-run");

const src = new pg.Client({ connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await src.connect();
await src.query("BEGIN READ ONLY");
const { rows } = await src.query(
  `SELECT id::text AS id, lower(email) AS email, encrypted_password AS ph, email_confirmed_at
     FROM auth.users WHERE deleted_at IS NULL`);
await src.query("ROLLBACK"); await src.end();

const dst = await mysql.createConnection({ uri: MARIADB_URL, charset: "utf8mb4" });
const [prof] = await dst.query("SELECT id FROM profiles");
const adaProfil = new Set(prof.map((r) => String(r.id).toLowerCase()));

let diproses = 0, tanpaProfil = 0, tanpaPassword = 0, tanpaEmail = 0;
for (const u of rows) {
  if (!u.email) { tanpaEmail++; continue; }
  if (!adaProfil.has(u.id.toLowerCase())) { tanpaProfil++; continue; }
  if (!u.ph) tanpaPassword++;
  if (!dryRun) {
    await dst.query(
      `INSERT INTO auth_kredensial (user_id, email, password_hash, email_terverifikasi_pada)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), password_hash = VALUES(password_hash),
                               email_terverifikasi_pada = VALUES(email_terverifikasi_pada)`,
      [u.id, u.email, u.ph || null, u.email_confirmed_at ? new Date(u.email_confirmed_at) : null]);
  }
  diproses++;
}
const [[{ n }]] = await dst.query("SELECT COUNT(*) AS n FROM auth_kredensial");
await dst.end();
console.log(JSON.stringify({ dryRun, di_supabase: rows.length, diproses, tanpa_profil: tanpaProfil,
  tanpa_password_hash: tanpaPassword, tanpa_email: tanpaEmail, baris_di_mariadb: n }, null, 2));
