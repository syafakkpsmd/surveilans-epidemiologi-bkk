import bcrypt from "bcryptjs"; // npm i bcryptjs (JS murni, tanpa build native)

// Hash bcrypt Supabase ($2a$10$...) bisa diverifikasi langsung oleh bcryptjs.
// Hash palsu dipakai agar waktu respons sama ketika email tidak ditemukan.
const HASH_PALSU = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8y0n5G3b1pZ4c4Zk4o8bX0yQe5y3Ma";

export async function verifikasiPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  const ok = await bcrypt.compare(password, hash || HASH_PALSU);
  return !!hash && ok;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}