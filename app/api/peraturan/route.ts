import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";


export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const kategori = searchParams.get("kategori");
  const cari = searchParams.get("cari");

  let query = (supabase.from("peraturan" as any) as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (kategori) query = query.eq("kategori", kategori);
  if (cari) query = query.ilike("judul", `%${cari}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { role } = await getStatusAkses();
  if (role !== "admin" && role !== "petugas") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      judul,
      deskripsi,
      kategori,
      nomor_peraturan,
      tahun,
      file_url,
      file_type,
      nama_file_asli,
    } = body;

    if (!file_url || !judul || !kategori) {
      return NextResponse.json({ error: "Judul, kategori, dan file wajib diisi" }, { status: 400 });
    }

    if (!["pdf", "docx", "xlsx"].includes(file_type)) {
      return NextResponse.json({ error: "Format file harus PDF, DOCX, atau XLSX" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await (supabase.from("peraturan" as any) as any)
      .insert({
        judul,
        deskripsi: deskripsi || null,
        kategori,
        nomor_peraturan: nomor_peraturan || null,
        tahun: tahun ? Number(tahun) : null,
        file_url,
        file_type,
        nama_file_asli,
        diunggah_oleh: user?.id ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Simpan peraturan error:", err);
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { role } = await getStatusAkses();
  if (role !== "admin" && role !== "petugas") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await req.json();
  const { id, judul, deskripsi, kategori, nomor_peraturan, tahun } = body;
  if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await (supabase.from("peraturan" as any) as any)
    .update({ judul, deskripsi, kategori, nomor_peraturan, tahun, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const { role } = await getStatusAkses();
  if (role !== "admin" && role !== "petugas") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await (supabase.from("peraturan" as any) as any).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}