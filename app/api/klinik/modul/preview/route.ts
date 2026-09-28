// app/api/klinik/modul/preview/route.ts
//
// GET /api/klinik/modul/preview?modul=poliklinik|kier|siaos&tahun=2026&bulan=7|semua&wilker=Samarinda|semua

import { NextRequest, NextResponse } from "next/server";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehAksesTabelKlinik } from "@/lib/auth/aksesKlinik";
import { bacaFilterModul, getBarisModul } from "@/lib/turso/queriesModulKlinik";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !bolehAksesTabelKlinik(role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const parsed = bacaFilterModul(req.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const baris = await getBarisModul(parsed.modul, parsed.filter);
  return NextResponse.json({ baris, total: baris.length });
}