import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { createClient } from "@/lib/supabase/server";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";

// TODO: hapus semua "as any" di file ini setelah types/generated.types.ts
// di-regenerate ulang (tabel "peraturan" belum ada saat types terakhir
// di-generate, jadi TypeScript menganggap tabel ini tidak ada).

const EKSTENSI_VALID: Record<string, "pdf" | "docx" | "xlsx"> = {
  pdf: "pdf",
  docx: "docx",
  doc: "docx",
  xlsx: "xlsx",
  xls: "xlsx",
};

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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const judul = formData.get("judul") as string;
    const deskripsi = formData.get("deskripsi") as string | null;
    const kategori = formData.get("kategori") as string;
    const nomorPeraturan = formData.get("nomor_peraturan") as string | null;
    const tahun = formData.get("tahun") as string | null;

    if (!file || !judul || !kategori) {
      return NextResponse.json({ error: "Judul, kategori, dan file wajib diisi" }, { status: 400 });
    }

    const ekstensi = file.name.split(".").pop()?.toLowerCase() ?? "";
    const fileType = EKSTENSI_VALID[ekstensi];
    if (!fileType) {
      return NextResponse.json({ error: "Format file harus PDF, DOCX, atau XLSX" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "epic-ai/peraturan", resource_type: "raw", public_id: file.name.replace(/\.[^/.]+$/, "") },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await (supabase.from("peraturan" as any) as any)
      .insert({
        judul,
        deskripsi: deskripsi || null,
        kategori,
        nomor_peraturan: nomorPeraturan || null,
        tahun: tahun ? Number(tahun) : null,
        file_url: result.secure_url,
        file_type: fileType,
        nama_file_asli: file.name,
        diunggah_oleh: user?.id ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Upload peraturan error:", err);
    return NextResponse.json({ error: "Upload gagal" }, { status: 500 });
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