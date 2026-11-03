// app/api/input-data/[modul]/[aksi]/route.ts
//
//   GET    /api/input-data/{modul}/template           -> berkas .xlsx kosong
//   GET    /api/input-data/{modul}/data?tahun&bulan&wilayah&sumber&belum=1&halaman
//   GET    /api/input-data/{modul}/pilihan            -> pilihan dropdown kolom isian manual
//   POST   /api/input-data/{modul}/ubah               -> JSON {id, nilai:{kolom manual}} isi RBA dst.
//   GET    /api/input-data/{modul}/tahun              -> daftar tahun yang ada datanya
//   GET    /api/input-data/{modul}/riwayat            -> riwayat unggahan modul
//   POST   /api/input-data/{modul}/unggah             -> multipart: file, tahun, mode=pratinjau|simpan, wilayah (opsional)
//   POST   /api/input-data/{modul}/baris              -> JSON {nilai:{...}} tambah satu baris (form)
//   DELETE /api/input-data/{modul}/baris?id=          -> hapus satu baris (admin)
//   DELETE /api/input-data/{modul}/batch?id=          -> batalkan satu unggahan (admin)
//
// Akses: lihat/tambah/unggah = peran di MODUL[x].peranBoleh (admin selalu boleh); hapus = admin.
// Rute ini memakai MariaDB langsung (tanpa RLS), jadi pemeriksaan peran DI SINI adalah satu-satunya pagar.
import { NextRequest, NextResponse } from 'next/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul, type ModulInput } from '@/lib/input-data/modul';
import { validasiBaris } from '@/lib/input-data/validasi';
import { bacaExcel, buatTemplate, MAKS_BYTE, MAKS_GALAT_DITAMPILKAN } from '@/lib/input-data/parse-excel';
import { kodeDariTeks } from '@/lib/wilayah-kerja';
import { isiNegara } from '@/lib/input-data/master';
import {
  daftarData, daftarPilihan, daftarRiwayat, daftarTahun, hapusBaris, hapusBatch, hitungRencana,
  simpanUnggahan, tambahSatu, ubahManual, wilayahDalam,
} from '@/lib/input-data/simpan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ modul: string; aksi: string }> };

const galat = (pesan: string, status: number) => NextResponse.json({ error: pesan }, { status });

async function izin(kunci: string): Promise<{ modul: ModulInput; role: string } | NextResponse> {
  const modul = dapatkanModul(kunci);
  if (!modul) return galat('Modul tidak dikenal', 404);
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !role) return galat('Harus login', 401);
  if (role !== 'admin' && !(modul.peranBoleh as string[]).includes(role)) return galat('Tidak diizinkan', 403);
  return { modul, role };
}

function bilanganAtauUndef(s: string | null): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { modul: kunci, aksi } = await ctx.params;
  const a = await izin(kunci);
  if (a instanceof NextResponse) return a;
  const { modul } = a;
  const sp = req.nextUrl.searchParams;
  try {
    if (aksi === 'template') {
      const buf = await buatTemplate(modul);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="template-${modul.kunci}.xlsx"`,
        },
      });
    }
    if (aksi === 'data') {
      return NextResponse.json(await daftarData(modul, {
        tahun: bilanganAtauUndef(sp.get('tahun')),
        bulan: bilanganAtauUndef(sp.get('bulan')),
        belumLengkap: sp.get('belum') === '1',
        wilayah: sp.get('wilayah') || undefined,
        sumber: sp.get('sumber') || undefined,
        halaman: bilanganAtauUndef(sp.get('halaman')),
      }));
    }
    if (aksi === 'pilihan') return NextResponse.json({ pilihan: await daftarPilihan(modul) });
    if (aksi === 'tahun') return NextResponse.json({ tahun: await daftarTahun(modul) });
    if (aksi === 'riwayat') return NextResponse.json({ riwayat: await daftarRiwayat(modul.kunci) });
  } catch (e) {
    console.error('[input-data] GET', aksi, (e as Error).message);
    return galat('Terjadi kesalahan pada server', 500);
  }
  return galat('Aksi tidak dikenal', 404);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { modul: kunci, aksi } = await ctx.params;
  const a = await izin(kunci);
  if (a instanceof NextResponse) return a;
  const { modul } = a;
  // const { user } = await getAuthUser();
  // const pengguna = user?.email ?? 'tidak diketahui';

  try {
    if (aksi === 'unggah') {
      const form = await req.formData();
      const berkas = form.get('file');
      const tahun = Number(form.get('tahun'));
      const mode = form.get('mode') === 'simpan' ? 'simpan' : 'pratinjau';
      if (!(berkas instanceof File)) return galat('Berkas belum dipilih', 400);
      if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) return galat('Tahun tidak valid', 400);
      if (berkas.size > MAKS_BYTE) return galat(`Berkas lebih dari ${MAKS_BYTE / 1024 / 1024} MB`, 413);

      const wilayahDefault = kodeDariTeks(String(form.get('wilayah') ?? '')) ?? null;
      const h = await bacaExcel(Buffer.from(await berkas.arrayBuffer()), modul, tahun, { wilayahDefault });
      if (h.fatal) return NextResponse.json({ error: h.fatal, perluWilayah: h.perluWilayah }, { status: 400 });

      const baris = h.sah.map((s) => s.nilai);
      let tidakCocok: string[] = [];
      let negaraTerisi = 0;
      if (modul.negaraDariMaster) {
        const n = await isiNegara(baris);
        tidakCocok = n.tidakCocok; negaraTerisi = n.terisi;
      }
      const rencana = await hitungRencana(modul, tahun, baris);
      const ringkas = {
        jumlahBaris: h.jumlahBaris, sah: baris.length, ditolak: h.galat.length, baru: rencana.baru, diperbarui: rencana.diperbarui,
        wilayah: wilayahDalam(modul, baris), kolomDiabaikan: h.kolomDiabaikan,
        negaraTerisi, pelabuhanTanpaMaster: tidakCocok.slice(0, 100),
        galat: h.galat.slice(0, MAKS_GALAT_DITAMPILKAN), galatTerpotong: h.galat.length > MAKS_GALAT_DITAMPILKAN,
      };
      if (mode === 'pratinjau') return NextResponse.json({ mode, ...ringkas });

      if (!baris.length) return galat('Tidak ada baris yang sah untuk disimpan', 400);
      const kolomAda = modul.negaraDariMaster ? [...h.kolomAda, 'negara_kedatangan'] : h.kolomAda;
      const r = await simpanUnggahan({
        modul, tahun, namaFile: berkas.name, baris, kolomAda, jumlahBaris: h.jumlahBaris, jumlahDitolak: h.galat.length, pengguna: 'tidak diketahui',
      });
      return NextResponse.json({ mode, ...ringkas, baru: r.baru, diperbarui: r.diperbarui, batchId: r.batchId });
    }

    if (aksi === 'ubah') {
      const body = (await req.json().catch(() => null)) as { id?: string; nilai?: Record<string, unknown> } | null;
      if (!body?.id || !/^[0-9a-fA-F-]{1,36}$/.test(body.id) || !body.nilai || typeof body.nilai !== 'object') return galat('Permintaan tidak valid', 400);
      const r = await ubahManual(modul, body.id, body.nilai);
      if (!r.ok) return NextResponse.json({ error: r.galat.join('; ') }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (aksi === 'baris') {
      const body = (await req.json().catch(() => null)) as { nilai?: Record<string, unknown> } | null;
      if (!body?.nilai || typeof body.nilai !== 'object') return galat('Isian tidak valid', 400);
      const h = validasiBaris(modul, body.nilai);
      if (!h.nilai) return NextResponse.json({ error: 'Isian belum benar', galat: h.galat }, { status: 400 });
      if (modul.negaraDariMaster) await isiNegara([h.nilai]);
      const r = await tambahSatu(modul, h.nilai);
      if (r === 'duplikat') return galat('Data dengan wilayah, nama kapal, dan tanggal yang sama sudah ada', 409);
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error('[input-data] POST', aksi, (e as Error).message);
    return galat('Terjadi kesalahan pada server', 500);
  }
  return galat('Aksi tidak dikenal', 404);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { modul: kunci, aksi } = await ctx.params;
  const a = await izin(kunci);
  if (a instanceof NextResponse) return a;
  if (a.role !== 'admin') return galat('Hanya admin yang boleh menghapus', 403);
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id || id.length > 36) return galat('id tidak valid', 400);
  try {
    if (aksi === 'baris') {
      if (!/^[0-9a-fA-F-]{1,36}$/.test(id)) return galat('id tidak valid', 400);
      return NextResponse.json({ dihapus: await hapusBaris(a.modul, id) });
    }
    if (aksi === 'batch') {
      if (!/^[0-9a-fA-F-]{36}$/.test(id)) return galat('id tidak valid', 400);
      return NextResponse.json({ dihapus: await hapusBatch(a.modul, id) });
    }
  } catch (e) {
    console.error('[input-data] DELETE', aksi, (e as Error).message);
    return galat('Terjadi kesalahan pada server', 500);
  }
  return galat('Aksi tidak dikenal', 404);
}
