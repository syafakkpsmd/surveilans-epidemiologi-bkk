import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDbClient } from "@/lib/db/client";
import { getPengguna } from "@/lib/auth/session";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kategori = searchParams.get("kategori");
  const cari = searchParams.get("cari");

  const kondisi: string[] = [];
  const args: (string | number)[] = [];
  if (kategori) { kondisi.push("kategori = ?"); args.push(kategori); }
  if (cari) { kondisi.push("judul LIKE ?"); args.push(`%${cari}%`); }

  try {
    const { rows } = await getDbClient().execute({
      sql: `SELECT * FROM peraturan ${kondisi.length ? "WHERE " + kondisi.join(" AND ") : ""} ORDER BY created_at DESC`,
      args,
    });
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Gagal membaca data" }, { status: 500 });
  }
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

    const user = await getPengguna();
    const db = getDbClient();
    const id = randomUUID();

    await db.execute({
      sql: `INSERT INTO peraturan
              (id, judul, deskripsi, kategori, nomor_peraturan, tahun, file_url, file_type, nama_file_asli, diunggah_oleh)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        judul,
        deskripsi || null,
        kategori,
        nomor_peraturan || null,
        tahun ? Number(tahun) : null,
        file_url,
        file_type,
        nama_file_asli ?? "",
        user?.id ?? null,
      ],
    });

    const { rows } = await db.execute({ sql: "SELECT * FROM peraturan WHERE id = ?", args: [id] });
    return NextResponse.json({ data: rows[0] });
  } catch (err: any) {
    console.error("Simpan peraturan error:", err);
    // Pelanggaran CHECK (mis. kategori di luar daftar) dilaporkan jelas, bukan "Gagal menyimpan" saja
    const pesan = /CONSTRAINT|CHECK/i.test(String(err?.message)) ? "Kategori atau format file tidak valid" : "Gagal menyimpan";
    return NextResponse.json({ error: pesan }, { status: 500 });
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

  // Hanya kolom yang dikirim yang diubah (sama seperti perilaku update Supabase).
  const diubah: Record<string, unknown> = { judul, deskripsi, kategori, nomor_peraturan, tahun };
  const set: string[] = [];
  const args: unknown[] = [];
  for (const [kolom, nilai] of Object.entries(diubah)) {
    if (nilai !== undefined) { set.push(`${kolom} = ?`); args.push(nilai); }
  }
  set.push("updated_at = NOW()");
  args.push(id);

  try {
    const db = getDbClient();
    await db.execute({ sql: `UPDATE peraturan SET ${set.join(", ")} WHERE id = ?`, args: args as any });
    const { rows } = await db.execute({ sql: "SELECT * FROM peraturan WHERE id = ?", args: [id] });
    if (rows.length === 0) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Gagal memperbarui" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { role } = await getStatusAkses();
  if (role !== "admin" && role !== "petugas") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

  try {
    await getDbClient().execute({ sql: "DELETE FROM peraturan WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Gagal menghapus" }, { status: 500 });
  }
}