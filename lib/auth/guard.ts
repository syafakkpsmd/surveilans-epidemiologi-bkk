import { getPengguna, STATUS_AKTIF, type Pengguna } from "./session";
import { AKSES, type Level, type Op } from "./akses";

export { STATUS_AKTIF };

export class AksesDitolak extends Error {
  constructor(public status: 401 | 403, pesan: string) { super(pesan); }
}

export function memenuhi(u: Pengguna | null, level: Level): boolean {
  if (level === "publik") return true;
  if (level === "server") return false;
  if (!u || u.status !== STATUS_AKTIF) return false;
  if (level === "login") return true;
  if (level === "staf") return u.role === "admin" || u.role === "petugas" || u.role === "petugas_klinik";
  if (level === "klinik") return u.role === "admin" || u.role === "petugas_klinik";
  if (level === "petugas") return u.role === "admin" || u.role === "petugas";
  return u.role === "admin";
}

export async function requireLevel(level: Level): Promise<Pengguna | null> {
  const u = await getPengguna();
  if (!memenuhi(u, level)) throw new AksesDitolak(u ? 403 : 401, u ? "Tidak berhak" : "Perlu login");
  return u;
}
export const requireUser = () => requireLevel("login") as Promise<Pengguna>;
export const requirePetugas = () => requireLevel("petugas") as Promise<Pengguna>;
export const requireAdmin = () => requireLevel("admin") as Promise<Pengguna>;
export async function isAdmin(): Promise<boolean> { return memenuhi(await getPengguna(), "admin"); }

/** Gerbang untuk route API/Server Action yang meneruskan query ke tabel. */
export async function assertAkses(tabel: string, op: Op): Promise<Pengguna | null> {
  return requireLevel(AKSES[tabel]?.[op] ?? "server");
}

/** Bungkus Route Handler: ubah AksesDitolak menjadi respons 401/403. */
export function denganGuard<A extends unknown[]>(h: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try { return await h(...a); }
    catch (e) {
      if (e instanceof AksesDitolak) return Response.json({ error: e.message }, { status: e.status });
      throw e;
    }
  };
}