// app/api/klinik/tb/preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehAksesTabelKlinik } from "@/lib/auth/aksesKlinik";
import { getBarisTb } from "@/lib/turso/queriesTb";

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
  const kabKotaParam = params.get("kabupatenKota");
  const kabupatenKota = kabKotaParam && kabKotaParam !== "semua" ? kabKotaParam : undefined;

  const baris = await getBarisTb({ tahun, bulan, kabupatenKota });

  return NextResponse.json({ baris, total: baris.length });
}