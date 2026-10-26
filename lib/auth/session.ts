import { cookies } from "next/headers";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "./db";
import { verifikasiPassword } from "./password";

export const NAMA_COOKIE = "epic_sesi";
export const STATUS_AKTIF = "approved"; // terkonfirmasi: ke-14 profil berstatus approved
const PERAN_DIKENAL = ["admin", "petugas", "petugas_klinik"];
const UMUR_SESI_HARI = 14;
const BATAS_TIDAK_AKTIF_MENIT = 25; // sama dengan BATAS_INAKTIVITAS_MS di lib/supabase/middleware.ts
const MAKS_PERCOBAAN = 5;
const JENDELA_MENIT = 15;

export type Peran = "admin" | "petugas" | "petugas_klinik";
export interface Pengguna {
  id: string;
  email: string | null;
  role: Peran | string;
  status: string;
  namaLengkap: string | null;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Pengguna dari cookie sesi, atau null. Di-cache per request. */
export const getPengguna = cache(async (): Promise<Pengguna | null> => {
  const jar = await cookies();
  const token = jar.get(NAMA_COOKIE)?.value;
  console.log('[auth] getPengguna dipanggil | cookie ada:', !!token);
  if (!token) return null;
  const rows = await sql<any>(
    `SELECT p.id, p.role, p.status, p.nama_lengkap, k.email
       FROM auth_sesi s
       JOIN profiles p ON p.id = s.user_id
       LEFT JOIN auth_kredensial k ON k.user_id = s.user_id
      WHERE s.token_hash = ? AND s.berakhir_pada > NOW(3)
        AND p.status = '${STATUS_AKTIF}'
        AND s.terakhir_aktif > NOW(3) - INTERVAL ${BATAS_TIDAK_AKTIF_MENIT} MINUTE
      LIMIT 1`,
    [sha256(token)],
  );
  const r = rows[0];
  if (!r) return null;
  // perpanjang masa aktif (maks. 1x per menit agar tidak menulis di setiap request)
  await sql(`UPDATE auth_sesi SET terakhir_aktif = NOW(3) WHERE token_hash = ? AND terakhir_aktif < NOW(3) - INTERVAL 1 MINUTE`, [sha256(token)]);
  return { id: r.id, email: r.email ?? null, role: r.role, status: r.status, namaLengkap: r.nama_lengkap ?? null };
});

/** Hanya untuk Route Handler / Server Action (cookie hanya boleh ditulis di sana). */
export type HasilMasuk =
  | { ok: true; userId: string; role: string }
  | { ok: false; alasan: "salah" | "terkunci" | "belum_disetujui" | "role_tidak_dikenal" };

export async function masuk(email: string, password: string, ip = ""): Promise<HasilMasuk> {
  const em = email.trim().toLowerCase();
  const kunci = `${em}|${ip}`.slice(0, 320);

  const [p] = await sql<{ jumlah: number }>(
    `SELECT jumlah FROM auth_percobaan WHERE kunci = ? AND jendela_mulai > NOW(3) - INTERVAL ${JENDELA_MENIT} MINUTE`,
    [kunci],
  );
  if (p && p.jumlah >= MAKS_PERCOBAAN) return { ok: false, alasan: "terkunci" };

  const [k] = await sql<{ user_id: string; password_hash: string | null }>(
    `SELECT user_id, password_hash FROM auth_kredensial WHERE email = ? LIMIT 1`, [em]);
  const benar = await verifikasiPassword(password, k?.password_hash);

  if (!benar || !k) {
    await sql(
      `INSERT INTO auth_percobaan (kunci, jumlah, jendela_mulai) VALUES (?, 1, NOW(3))
       ON DUPLICATE KEY UPDATE
         jumlah = IF(jendela_mulai > NOW(3) - INTERVAL ${JENDELA_MENIT} MINUTE, jumlah + 1, 1),
         jendela_mulai = IF(jendela_mulai > NOW(3) - INTERVAL ${JENDELA_MENIT} MINUTE, jendela_mulai, NOW(3))`,
      [kunci],
    );
    return { ok: false, alasan: "salah" };
  }

  await sql(`DELETE FROM auth_percobaan WHERE kunci = ?`, [kunci]);

  // Sama seperti login lama: password benar, tapi akun harus approved dan role dikenal.
  const [pf] = await sql<{ role: string; status: string }>(`SELECT role, status FROM profiles WHERE id = ? LIMIT 1`, [k.user_id]);
  if (!pf || pf.status !== STATUS_AKTIF) return { ok: false, alasan: "belum_disetujui" };
  if (!PERAN_DIKENAL.includes(pf.role)) return { ok: false, alasan: "role_tidak_dikenal" };

  const token = randomBytes(32).toString("base64url");
  await sql(
    `INSERT INTO auth_sesi (token_hash, user_id, berakhir_pada) VALUES (?, ?, NOW(3) + INTERVAL ${UMUR_SESI_HARI} DAY)`,
    [sha256(token), k.user_id],
  );
  (await cookies()).set(NAMA_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: UMUR_SESI_HARI * 86400,
  });
  return { ok: true, userId: k.user_id, role: pf.role };
}

/** Putuskan semua sesi satu pengguna (hapus/atur ulang password, dsb.). */
export async function hapusSesiPengguna(userId: string): Promise<void> {
  await sql(`DELETE FROM auth_sesi WHERE user_id = ?`, [userId]);
}

export async function keluar(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(NAMA_COOKIE)?.value;
  if (token) await sql(`DELETE FROM auth_sesi WHERE token_hash = ?`, [sha256(token)]);
  jar.delete(NAMA_COOKIE);
}