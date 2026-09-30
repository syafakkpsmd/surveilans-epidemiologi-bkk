// app/api/lalulintas/preview/route.ts
//
// PUBLIK -- tidak ada pengecekan role/login. Dashboard Lalu Lintas Orang
// memang boleh dilihat siapa saja tanpa login (beda dari Tabel Klinik).
// Unduh Excel yang dikunci ke role Petugas+ (lihat route export).

import { NextRequest, NextResponse } from "next/server";
import { ambilTabLaluLintas } from "@/lib/lalulintas/config";
import { getPenumpangKapalMentah } from "@/lib/turso/queriesPenumpangKapal";
import { getAbkKapal, type SumberAbkKapal } from "@/lib/supabase/queriesAbkKapal";

export const dynamic = "force-dynamic";

function bacaFilter(params: URLSearchParams) {
  const tahun = Number(params.get("tahun"));
  const granularitas = params.get("granularitas") === "bulanan" ? "bulanan" : "mingguan";
  const awal = Number(params.get("awal")) || 1;
  const akhir = Number(params.get("akhir")) || (granularitas === "bulanan" ? 12 : 53);
  const wilkerParam = params.get("wilker");
  const wilker = wilkerParam && wilkerParam !== "semua" ? wilkerParam : undefined;
  return { tahun, granularitas: granularitas as "mingguan" | "bulanan", awal, akhir, wilker };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const tab = ambilTabLaluLintas(params.get("tab"));
  if (!tab) {
    return NextResponse.json({ error: "Parameter tab tidak dikenal" }, { status: 400 });
  }

  const filter = bacaFilter(params);
  if (!filter.tahun) {
    return NextResponse.json({ error: "Parameter tahun wajib diisi" }, { status: 400 });
  }

  if (tab.key === "penumpang-kapal") {
    const baris = await getPenumpangKapalMentah(filter);
    return NextResponse.json({ baris, total: baris.length });
  }

  const baris = await getAbkKapal(tab.key as SumberAbkKapal, filter);
  return NextResponse.json({ baris, total: baris.length });
}