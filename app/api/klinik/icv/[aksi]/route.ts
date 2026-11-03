// API input ICV / e-ICV per klinik (form + unggah Excel). Setiap aksi memeriksa login DAN hak atas klinik
// (admin/petugas: semua klinik; petugas_klinik: hanya klinik yang ditautkan di klinik_akses).
//   GET    /api/klinik/icv/klinik                          -> klinik yang boleh diisi orang ini
//   GET    /api/klinik/icv/template                        -> berkas .xlsx kosong
//   GET    /api/klinik/icv/daftar?klinik=ID&q=&halaman=    -> baris terbaru klinik (dari aplikasi dan Sheets)
//   GET    /api/klinik/icv/riwayat?klinik=ID               -> riwayat unggahan
//   POST   /api/klinik/icv/baris    {klinikId, nilai}      -> tambah satu (form)
//   POST   /api/klinik/icv/unggah   multipart: file, klinikId, mode=pratinjau|simpan
//   DELETE /api/klinik/icv/baris?klinik=ID&id=N            -> hapus satu baris yang berasal dari aplikasi
//   DELETE /api/klinik/icv/batch?klinik=ID&id=UUID         -> batalkan satu unggahan
import { NextResponse, type NextRequest } from 'next/server';
import { getPengguna } from '@/lib/auth/session';
import { daftarKlinikDiizinkan, klinikBolehDiakses, kunciSumberApp, type KlinikRingkas } from '@/lib/klinik/akses';
import { validasiIcv } from '@/lib/klinik/icv-input';
import { bacaExcelIcv, buatTemplateIcv } from '@/lib/klinik/icv-excel';
import { daftarIcvTerbaru, hapusBarisIcv, hapusBatchIcv, noDokumenSudahAda, riwayatIcv, simpanUnggahanIcv, tambahIcv } from '@/lib/klinik/icv-simpan';
import { kunciDokumen } from '@/lib/klinik/icv-input';

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

export async function GET(req: NextRequest, ctx: Ctx) {
  const { aksi } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  try {
    if (aksi === 'klinik') {
      const p = await getPengguna();
      if (!p) return galat('Silakan login', 401);
      const daftar = await daftarKlinikDiizinkan(p);
      return NextResponse.json({ klinik: daftar.map((k) => ({ id: k.id, nama_klinik: k.nama_klinik })) });
    }
    if (aksi === 'template') {
      if (!(await getPengguna())) return galat('Silakan login', 401);
      return new NextResponse(new Uint8Array(await buatTemplateIcv()), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="template-icv.xlsx"',
        },
      });
    }
    if (aksi === 'daftar' || aksi === 'riwayat') {
      const a = await izin(sp.get('klinik'));
      if (a instanceof NextResponse) return a;
      if (aksi === 'riwayat') return NextResponse.json({ riwayat: await riwayatIcv(a.klinik.id) });
      return NextResponse.json(await daftarIcvTerbaru(kunciSumberApp(a.klinik.id), {
        q: sp.get('q') ?? undefined, halaman: Number(sp.get('halaman')) || undefined,
      }));
    }
  } catch (e) {
    console.error('[klinik/icv] GET', aksi, (e as Error).message);
    return galat('Terjadi kesalahan pada server', 500);
  }
  return galat('Aksi tidak dikenal', 404);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { aksi } = await ctx.params;
  try {
    if (aksi === 'baris') {
      const b = (await req.json().catch(() => null)) as { klinikId?: string; nilai?: Record<string, unknown> } | null;
      const a = await izin(b?.klinikId ?? null);
      if (a instanceof NextResponse) return a;
      if (!b?.nilai || typeof b.nilai !== 'object') return galat('Data kosong', 400);
      const h = validasiIcv(b.nilai);
      if (!h.nilai) return galat('Data belum valid', 422, { galat: h.galat });
      const r = await tambahIcv(a.klinik, h.nilai);
      if (r === 'duplikat') return galat('Nomor dokumen ini sudah ada di klinik ini', 409);
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

      const h = await bacaExcelIcv(Buffer.from(await berkas.arrayBuffer()));
      if (h.fatal) return galat(h.fatal, 422);
      const baris = h.sah.map((s) => s.nilai);
      const ada = await noDokumenSudahAda(kunciSumberApp(a.klinik.id), baris.map((x) => x['No Dokumen ICV / e-ICV']));
      const sudahAda = baris.filter((x) => ada.has(kunciDokumen(x['No Dokumen ICV / e-ICV']))).length;

      if (mode === 'pratinjau') {
        return NextResponse.json({
          mode, jumlahBaris: h.jumlahBaris, sah: h.sah.length, ditolak: h.galat.length,
          akanDilewati: sudahAda, akanMasuk: h.sah.length - sudahAda,
          galat: h.galat.slice(0, 50), galatTerpotong: h.galat.length > 50,
          peringatan: h.sah.filter((s) => s.peringatan.length).slice(0, 20).map((s) => ({ baris: s.baris, pesan: s.peringatan })),
          urutan: h.urutan,
        });
      }
      const r = await simpanUnggahanIcv({ klinik: a.klinik, namaFile: berkas.name, baris, jumlahBaris: h.jumlahBaris, jumlahDitolak: h.galat.length, pengguna: a.pengguna });
      return NextResponse.json({ mode, ...r, ditolak: h.galat.length });
    }
  } catch (e) {
    console.error('[klinik/icv] POST', aksi, (e as Error).message);
    return galat('Terjadi kesalahan pada server', 500);
  }
  return galat('Aksi tidak dikenal', 404);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { aksi } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  try {
    const a = await izin(sp.get('klinik'));
    if (a instanceof NextResponse) return a;
    const id = sp.get('id') ?? '';
    if (aksi === 'baris') {
      const n = Number(id);
      if (!Number.isInteger(n)) return galat('id tidak valid', 400);
      return NextResponse.json({ dihapus: await hapusBarisIcv(kunciSumberApp(a.klinik.id), n) });
    }
    if (aksi === 'batch') {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return galat('id tidak valid', 400);
      return NextResponse.json({ dihapus: await hapusBatchIcv(a.klinik.id, kunciSumberApp(a.klinik.id), id) });
    }
  } catch (e) {
    console.error('[klinik/icv] DELETE', aksi, (e as Error).message);
    return galat('Terjadi kesalahan pada server', 500);
  }
  return galat('Aksi tidak dikenal', 404);
}
