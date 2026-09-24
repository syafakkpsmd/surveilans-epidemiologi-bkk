// app/api/klinik/hiv/preview/route.ts
//
// Dipakai untuk tabel preview di halaman, BUKAN untuk file unduhan.
// Parameter sama dengan route export: tahun, bulan ("semua" atau 1-12), wilker ("semua" atau nama wilker)

import { NextRequest, NextResponse } from "next/server";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehAksesTabelKlinik } from "@/lib/auth/aksesKlinik";
import { getBarisHivVct } from "@/lib/turso/queriesHivVct";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !bolehAksesTabelKlinik(role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const tahun = Number(params.get("tahun"));
  if (!tahun) {
    return NextResponse.json({ error: "Parameter tahun wajib diisi" }, { status: 400 });
  }
  const bulanParam = params.get("bulan");
  const bulan = bulanParam && bulanParam !== "semua" ? Number(bulanParam) : undefined;
  const wilkerParam = params.get("wilker");
  const wilker = wilkerParam && wilkerParam !== "semua" ? wilkerParam : undefined;

  const baris = await getBarisHivVct({ tahun, bulan, wilker });

  return NextResponse.json({ baris, total: baris.length });
}