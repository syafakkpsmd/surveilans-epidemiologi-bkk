// API input stok ICV/e-ICV dan vaksin per klinik (form + unggah Excel). Setiap aksi memeriksa login DAN hak atas klinik
// (admin/petugas: semua klinik; petugas_klinik: hanya klinik yang ditautkan di klinik_akses).
//   GET    /api/klinik/stok/input/jenis                              -> daftar jenis stok
//   GET    /api/klinik/stok/input/saldo?klinik=ID                    -> sisa terkini per jenis (buku aplikasi)
//   GET    /api/klinik/stok/input/daftar?klinik=ID&jenis=K&halaman=  -> riwayat harian satu jenis
//   GET    /api/klinik/stok/input/riwayat?klinik=ID                  -> riwayat unggahan
//   GET    /api/klinik/stok/input/template                           -> berkas .xlsx kosong
//   POST   /api/klinik/stok/input/baris   {klinikId, nilai, ganti?}  -> tambah/ganti satu hari
//   POST   /api/klinik/stok/input/unggah  multipart: file, klinikId, mode=pratinjau|simpan, [jenisBawaan]
//   DELETE /api/klinik/stok/input/baris?klinik=ID&jenis=K&tanggal=YYYY-MM-DD
//   DELETE /api/klinik/stok/input/batch?klinik=ID&id=UUID
import { NextResponse, type NextRequest } from 'next/server';
import { getPengguna } from '@/lib/auth/session';
import { klinikBolehDiakses, type KlinikRingkas } from '@/lib/klinik/akses';
import { JENIS_STOK_INPUT, kunciJenisValid, validasiStok } from '@/lib/klinik/stok-input';
import { bacaExcelStok, buatTemplateStok } from '@/lib/klinik/stok-excel';
import { GalatStok, daftarStokApp, hapusBatchStok, hapusEntriStok, hitungRencanaStok, riwayatStok, saldoStokApp, simpanEntriStok, simpanUnggahanStok } from '@/lib/klinik/stok-simpan';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ aksi: string }> };
const MAKS_BYTE = 10 * 1024 * 1024;

const galat = (pesan: string, status: number, ekstra: object = {}) => NextResponse.json({ error: pesan, ...ekstra }, { status });

async function izin(klinikId: string | null): Promise<{ klinik: KlinikRingkas; pengguna: string } | NextResponse> {
  const p = await getPengguna();
  if (!p) return galat('Silakan login', 401);
  if (!klinikId) return galat('Klinik belum dipilih', 400);
  const klinik = await klinikBolehDiakses(p, klinikId);
  if (!klinik) return galat('Anda tidak memiliki akses ke klinik ini', 403);
  return { klinik, pengguna: p.email ?? p.namaLengkap ?? p.id };
}

function tangani(e: unknown, label: string) {
  if (e instanceof GalatStok) return galat(e.message, 422);
  console.error('[klinik/stok/input]', label, (e as Error).message);
  return galat('Terjadi kesalahan pada server', 500);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { aksi } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  try {
    if (aksi === 'jenis') return NextResponse.json({ jenis: JENIS_STOK_INPUT });
    if (aksi === 'template') {
      if (!(await getPengguna())) return galat('Silakan login', 401);
      return new NextResponse(new Uint8Array(await buatTemplateStok()), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="template-stok.xlsx"',
        },
      });
    }
    if (aksi === 'saldo' || aksi === 'daftar' || aksi === 'riwayat') {
      const a = await izin(sp.get('klinik'));
      if (a instanceof NextResponse) return a;
      if (aksi === 'saldo') return NextResponse.json({ saldo: await saldoStokApp(a.klinik.id) });
      if (aksi === 'riwayat') return NextResponse.json({ riwayat: await riwayatStok(a.klinik.id) });
      const jenis = sp.get('jenis') ?? '';
      if (!kunciJenisValid(jenis)) return galat('Jenis stok tidak valid', 400);
      return NextResponse.json(await daftarStokApp(a.klinik.id, jenis, { halaman: Number(sp.get('halaman')) || undefined }));
    }
  } catch (e) {
    return tangani(e, 'GET ' + aksi);
  }
  return galat('Aksi tidak dikenal', 404);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { aksi } = await ctx.params;
  try {
    if (aksi === 'baris') {
      const b = (await req.json().catch(() => null)) as { klinikId?: string; nilai?: Record<string, unknown>; ganti?: boolean } | null;
      const a = await izin(b?.klinikId ?? null);
      if (a instanceof NextResponse) return a;
      if (!b?.nilai || typeof b.nilai !== 'object') return galat('Data kosong', 400);
      const h = validasiStok(b.nilai);
      if (!h.nilai) return galat('Data belum valid', 422, { galat: h.galat });
      const r = await simpanEntriStok(a.klinik, h.nilai, { ganti: b.ganti === true });
      if (r === 'ada') return galat('Tanggal ini sudah terisi untuk jenis stok tersebut', 409, { sudahAda: true });
      return NextResponse.json({ ok: true, peringatan: h.peringatan });
    }
    if (aksi === 'unggah') {
      const form = await req.formData();
      const a = await izin(String(form.get('klinikId') ?? '') || null);
      if (a instanceof NextResponse) return a;
      const berkas = form.get('file');
      if (!(berkas instanceof File)) return galat('Berkas belum dipilih', 400);
      if (berkas.size > MAKS_BYTE) return galat('Berkas lebih dari 10 MB', 413);
      const mode = form.get('mode') === 'simpan' ? 'simpan' : 'pratinjau';
      const jenisBawaan = String(form.get('jenisBawaan') ?? '');
      if (jenisBawaan && !kunciJenisValid(jenisBawaan)) return galat('Jenis stok tidak valid', 400);

      const h = await bacaExcelStok(Buffer.from(await berkas.arrayBuffer()), { jenisBawaan: jenisBawaan || undefined });
      if (h.fatal) return galat(h.fatal, 422);
      const entri = h.sah.map((s) => s.nilai);
      if (mode === 'pratinjau') {
        const rencana = await hitungRencanaStok(a.klinik, entri);
        return NextResponse.json({
          mode, jumlahBaris: h.jumlahBaris, sah: h.sah.length, ditolak: h.galat.length, akanBaru: rencana.baru, akanDiganti: rencana.diganti,
          galat: h.galat.slice(0, 50), galatTerpotong: h.galat.length > 50,
          peringatan: h.sah.filter((s) => s.peringatan.length).slice(0, 20).map((s) => ({ baris: s.baris, pesan: s.peringatan })),
        });
      }
      const r = await simpanUnggahanStok({ klinik: a.klinik, namaFile: berkas.name, entri, jumlahBaris: h.jumlahBaris, jumlahDitolak: h.galat.length, pengguna: a.pengguna });
      return NextResponse.json({ mode, ...r, ditolak: h.galat.length });
    }
  } catch (e) {
    return tangani(e, 'POST ' + aksi);
  }
  return galat('Aksi tidak dikenal', 404);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { aksi } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  try {
    const a = await izin(sp.get('klinik'));
    if (a instanceof NextResponse) return a;
    if (aksi === 'baris') {
      const jenis = sp.get('jenis') ?? '';
      const tanggal = sp.get('tanggal') ?? '';
      if (!kunciJenisValid(jenis) || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return galat('Parameter tidak valid', 400);
      return NextResponse.json({ dihapus: await hapusEntriStok(a.klinik, jenis, tanggal) });
    }
    if (aksi === 'batch') {
      const id = sp.get('id') ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return galat('id tidak valid', 400);
      return NextResponse.json({ dihapus: await hapusBatchStok(a.klinik, id) });
    }
  } catch (e) {
    return tangani(e, 'DELETE ' + aksi);
  }
  return galat('Aksi tidak dikenal', 404);
}
