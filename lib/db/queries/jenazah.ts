import "server-only";
import { bolehLihatJenazah } from "@/lib/auth/aksesJenazah";

export async function ambilDaftarIjinJenazah(role: string | null | undefined) {
  // Penjaga kedua: kalau ada yang memanggil fungsi ini tanpa hak, tidak ada data keluar
  if (!bolehLihatJenazah(role)) throw new Error("Tidak berwenang");
  // ... query ke tabel ijin_angkut_jenazah
}