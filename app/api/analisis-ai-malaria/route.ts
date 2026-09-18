import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
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

/**
 * Client Supabase pakai service-role key (bypass RLS), dibuat lokal di sini
 * karena saya tidak tahu path export createServiceRoleClient yang sebenarnya
 * di repo kamu. Ganti dengan import dari lib/supabase kamu kalau ada versi
 * bersama yang sudah teruji — cukup ganti nama env var di bawah kalau beda.
 */
function buatServiceRoleClientLokal() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset di environment variables.'
    );
  }
  return createSupabaseClient(url, serviceKey);
}

// GET -- baca hasil terakhir yang tersimpan (siapa saja boleh, tidak menjalankan AI baru).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tahun = searchParams.get('tahun');
  const kodeWilker = searchParams.get('wilayah_kerja');

  if (!tahun) {
    return NextResponse.json({ error: 'Parameter tahun wajib diisi.' }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase
    .from('riwayat_analisis_ai')
    .select('*')
    .eq('konteks', KONTEKS)
    .eq('periode_key', tahun)
    .order('dibuat_pada', { ascending: false })
    .limit(1);

  query = kodeWilker ? query.eq('wilayah_kerja', kodeWilker) : query.is('wilayah_kerja', null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Gagal membaca riwayat_analisis_ai (migrasi-malaria):', error.message);
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
    dibuatPada: data.dibuat_pada,
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

  const supabaseServiceRole = buatServiceRoleClientLokal();
  const { data: daftarProviderAktif, error: pengaturanError } = await supabaseServiceRole
    .from('pengaturan_ai')
    .select('*')
    .eq('aktif', true)
    .order('urutan_prioritas', { ascending: true });

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const providerDipakai = `${pengaturanTerpakai.nama_tampilan} (${pengaturanTerpakai.model})`;

  // Simpan sebagai cache/riwayat — kalau gagal (mis. constraint kolom konteks belum
  // mengenal 'migrasi-malaria' di database), JANGAN gagalkan response, cukup log.
  const { error: insertError } = await supabase.from('riwayat_analisis_ai').insert({
    konteks: KONTEKS,
    periode_key: String(tahun),
    wilayah_kerja: kodeWilker ?? null,
    tipe: 'analisis',
    metrik: null,
    provider_dipakai: providerDipakai,
    ringkasan: hasil.ringkasan,
    anomali: hasil.anomali,
    rekomendasi: hasil.rekomendasi,
    dibuat_oleh: user?.id ?? null,
  });

  if (insertError) {
    console.error('Gagal menyimpan riwayat_analisis_ai (migrasi-malaria):', insertError.message);
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