import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth/get-user-role";
import { labelRentang } from "@/lib/laporan-bulanan/periode";
import { rakitPptx } from "@/lib/laporan-bulanan/ppt";
import { buildSlides } from "@/lib/laporan-bulanan/slides";
import type { HasilModul } from "@/lib/laporan-bulanan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Badan {
  tahun?: unknown;
  bulanAkhir?: unknown;
  hasil?: unknown;
  opsi?: { modulDikecualikan?: unknown; catatan?: unknown; penutup?: unknown; judulRapat?: unknown };
}

/**
 * POST /api/laporan-bulanan/pptx
 * Body: { tahun, bulanAkhir, hasil (dari GET /api/laporan-bulanan), opsi }
 * Mengembalikan berkas .pptx. Dibuat di server (Node) karena pptxgenjs stabil di sini.
 */
export async function POST(req: Request) {
  const role = await getUserRole();
  if (role !== "admin" && role !== "petugas") {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  let b: Badan;
  try {
    b = (await req.json()) as Badan;
  } catch {
    return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 });
  }

  const tahun = Number(b.tahun);
  const bulanAkhir = Number(b.bulanAkhir);
  if (!Number.isInteger(tahun) || tahun < 2020 || tahun > 2100 || !Number.isInteger(bulanAkhir) || bulanAkhir < 1 || bulanAkhir > 12) {
    return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
  }
  if (!Array.isArray(b.hasil) || b.hasil.length === 0 || b.hasil.length > 80) {
    return NextResponse.json({ error: "Data laporan tidak valid." }, { status: 400 });
  }

  const o = b.opsi ?? {};
  const modulDikecualikan = Array.isArray(o.modulDikecualikan) ? o.modulDikecualikan.filter((x): x is string => typeof x === "string").slice(0, 80) : [];
  const catatan = typeof o.catatan === "string" ? o.catatan.slice(0, 3000) : "";
  const judulRapat = typeof o.judulRapat === "string" && o.judulRapat.trim() ? o.judulRapat.trim().slice(0, 120) : "Rapat Bulanan Kinerja Surveilans";
  const penutup = o.penutup !== false;

  try {
    const slides = buildSlides({ tahun, bulanAkhir, hasil: b.hasil as HasilModul[] }, { modulDikecualikan, catatan, penutup }, [], judulRapat);
    const bytes = await rakitPptx(slides, { periode: labelRentang(tahun, bulanAkhir), judul: judulRapat });
    const nama = `Rapat-Bulanan-Surveilans-${tahun}-${String(bulanAkhir).padStart(2, "0")}.pptx`;
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${nama}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[laporan-bulanan/pptx]", e);
    return NextResponse.json({ error: "Gagal membuat berkas PowerPoint." }, { status: 500 });
  }
}
