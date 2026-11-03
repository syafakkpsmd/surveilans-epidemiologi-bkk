import { NextResponse } from 'next/server';
import { getPengguna } from '@/lib/auth/session';
import { getDbClient } from '@/lib/db/client';
import { keIsoUtc } from '@/lib/db/json';
import { getUserRole } from '@/lib/auth/get-user-role';
import { panggilAI } from '@/lib/ai';
import {
  ambilDataAnalisisMigrasiMalaria,
  susunPromptAnalisisMigrasiMalaria,
  parseHasilAiMigrasiMalaria,
} from '@/lib/ai/migrasiMalaria';

const KONTEKS = 'migrasi-malaria';

function perananBolehGenerate(role: string | null) {
  return role === 'admin' || role === 'petugas';
}

function labelWilayahDariKode(kodeWilker: string | null | undefined): string {
  if (!kodeWilker) return 'Semua Wilayah Kerja';
  return kodeWilker; // fallback sederhana; frontend yang tahu label lengkapnya bisa mengirim labelnya sendiri kalau perlu lebih rapi
}

// GET -- baca hasil terakhir yang tersimpan (siapa saja boleh, tidak menjalankan AI baru).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tahun = searchParams.get('tahun');
  const kodeWilker = searchParams.get('wilayah_kerja');

  if (!tahun) {
    return NextResponse.json({ error: 'Parameter tahun wajib diisi.' }, { status: 400 });
  }

  let data: Record<string, any> | undefined;
  try {
    const kondisi = ['konteks = ?', 'periode_key = ?'];
    const args: string[] = [KONTEKS, tahun];
    if (kodeWilker) { kondisi.push('wilayah_kerja = ?'); args.push(kodeWilker); } else { kondisi.push('wilayah_kerja IS NULL'); }

    const { rows } = await getDbClient().execute({
      sql: `SELECT * FROM riwayat_analisis_ai WHERE ${kondisi.join(' AND ')} ORDER BY dibuat_pada DESC LIMIT 1`,
      args,
    });
    data = rows[0];
  } catch (error: any) {
    console.error('Gagal membaca riwayat_analisis_ai (migrasi-malaria):', error?.message);
    return NextResponse.json({ error: 'Gagal memuat hasil Analisis AI.' }, { status: 503 });
  }

  if (!data) {
    return NextResponse.json({ ada: false });
  }

  return NextResponse.json({
    ada: true,
    ringkasan: data.ringkasan,
    anomali: data.anomali,
    rekomendasi: data.rekomendasi,
    providerDipakai: data.provider_dipakai,
    dibuatPada: keIsoUtc(data.dibuat_pada),
  });
}

// POST -- jalankan Analisis & Prediksi AI baru (khusus admin/petugas).
export async function POST(req: Request) {
  let body: { tahun?: number; wilayah_kerja?: string | null; label_wilayah?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 });
  }

  const tahun = body.tahun;
  const kodeWilker = body.wilayah_kerja ?? undefined;

  if (!tahun) {
    return NextResponse.json({ error: 'Parameter tahun wajib diisi.' }, { status: 400 });
  }

  const role = await getUserRole();
  if (!perananBolehGenerate(role)) {
    return NextResponse.json(
      { error: 'Hanya Petugas/Admin yang dapat menjalankan Analisis & Prediksi AI.' },
      { status: 403 }
    );
  }

  let daftarProviderAktif: any[] = [];
  let pengaturanError: { message: string } | null = null;
  try {
    ({ rows: daftarProviderAktif } = await getDbClient().execute(
      'SELECT * FROM pengaturan_ai WHERE aktif = 1 ORDER BY urutan_prioritas ASC'
    ));
  } catch (e: any) {
    pengaturanError = { message: e?.message ?? String(e) };
  }

  if (pengaturanError) {
    console.error('Gagal mengambil pengaturan_ai:', pengaturanError.message);
    return NextResponse.json(
      { error: 'Gagal memuat konfigurasi Analisis AI. Coba lagi sebentar lagi.' },
      { status: 503 }
    );
  }

  if (!daftarProviderAktif || daftarProviderAktif.length === 0) {
    return NextResponse.json(
      { error: 'Analisis AI belum dikonfigurasi. Hubungi Admin.' },
      { status: 503 }
    );
  }

  let promptTeks: string;
  try {
    const data = await ambilDataAnalisisMigrasiMalaria(
      tahun,
      kodeWilker,
      labelWilayahDariKode(body.label_wilayah ?? kodeWilker)
    );
    promptTeks = susunPromptAnalisisMigrasiMalaria(data);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal mengambil data untuk dianalisis.';
    return NextResponse.json({ error: pesan }, { status: 400 });
  }

  let hasil: ReturnType<typeof parseHasilAiMigrasiMalaria> | undefined;
  let pengaturanTerpakai: (typeof daftarProviderAktif)[number] | null = null;
  const pesanErrorPerProvider: string[] = [];

  for (const provider of daftarProviderAktif) {
    try {
      const teksMentah = await panggilAI(provider, promptTeks);
      hasil = parseHasilAiMigrasiMalaria(teksMentah);
      pengaturanTerpakai = provider;
      break;
    } catch (err) {
      const pesan = err instanceof Error ? err.message : 'Gagal tanpa pesan.';
      console.error(`Provider "${provider.nama_tampilan}" gagal (migrasi-malaria):`, pesan);
      pesanErrorPerProvider.push(`${provider.nama_tampilan}: ${pesan}`);
    }
  }

  if (!hasil || !pengaturanTerpakai) {
    return NextResponse.json(
      { error: `Semua provider AI gagal dijalankan. Detail: ${pesanErrorPerProvider.join(' | ')}` },
      { status: 502 }
    );
  }

  const user = await getPengguna();

  const providerDipakai = `${pengaturanTerpakai.nama_tampilan} (${pengaturanTerpakai.model})`;

  // Simpan sebagai cache/riwayat -- kalau gagal (mis. constraint kolom konteks), JANGAN gagalkan
  // response, cukup log.
  try {
    await getDbClient().execute({
      sql: `INSERT INTO riwayat_analisis_ai
              (konteks, periode_key, wilayah_kerja, tipe, metrik, provider_dipakai, ringkasan, anomali, rekomendasi, dibuat_oleh)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        KONTEKS,
        String(tahun),
        kodeWilker ?? null,
        'analisis',
        null,
        providerDipakai,
        hasil.ringkasan,
        hasil.anomali ?? null,
        hasil.rekomendasi ?? null,
        user?.id ?? null,
      ],
    });
  } catch (insertError: any) {
    console.error('Gagal menyimpan riwayat_analisis_ai (migrasi-malaria):', insertError?.message);
  }

  return NextResponse.json({
    ringkasan: hasil.ringkasan,
    anomali: hasil.anomali,
    rekomendasi: hasil.rekomendasi,
    providerDipakai,
    dibuatPada: new Date().toISOString(),
    dariCache: false,
  });
}