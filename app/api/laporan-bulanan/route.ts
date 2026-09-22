import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth/get-user-role";
import { DAFTAR_MODUL } from "@/lib/laporan-bulanan/modul";
import { hariIniWita } from "@/lib/laporan-bulanan/periode";
import { jalankanModul } from "@/lib/laporan-bulanan/registri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/laporan-bulanan?tahun=2026&bulanAkhir=9
 * Membaca semua modul (data Januari sampai bulanAkhir) dan mengembalikan hasilnya sebagai JSON.
 * Hanya untuk pengguna yang sudah masuk (admin atau petugas).
 */
export async function GET(req: Request) {
  const role = await getUserRole();
  if (role !== "admin" && role !== "petugas") {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu untuk membuat laporan." }, { status: 401 });
  }

  const p = new URL(req.url).searchParams;
  const tahun = Number(p.get("tahun"));
  const bulanAkhir = Number(p.get("bulanAkhir"));
  if (!Number.isInteger(tahun) || tahun < 2020 || tahun > 2100) return NextResponse.json({ error: "Parameter tahun tidak valid." }, { status: 400 });
  if (!Number.isInteger(bulanAkhir) || bulanAkhir < 1 || bulanAkhir > 12) return NextResponse.json({ error: "Parameter bulanAkhir harus 1 sampai 12." }, { status: 400 });

  const [tSekarang, bSekarang] = hariIniWita().split("-").map(Number);
  if (tahun > tSekarang || (tahun === tSekarang && bulanAkhir > bSekarang)) {
    return NextResponse.json({ error: "Periode belum berjalan, pilih bulan yang sudah ada datanya." }, { status: 400 });
  }

  // Batas 25 detik per modul (bawaan 15): modul Klinik membaca ribuan baris ICV, SKDR membaca banyak halaman.
  const hasil = await jalankanModul(DAFTAR_MODUL, { tahun, bulanAkhir }, { batasMs: 25_000 });
  return NextResponse.json({ tahun, bulanAkhir, dibuat: new Date().toISOString(), hasil }, { headers: { "Cache-Control": "no-store" } });
}
