import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import {
  ambilDataAnalisis,
  ambilDataBreakdownAnalisis,
  ambilDataAnalisisSanitasi,
  isKonteksValid,
  isKonteksBreakdown,
  isKonteksVektor,
  isKonteksPrediksiNonVektorValid,
  isKonteksSanitasi,
  ambilDataAnalisisCop,
  ambilDataAnalisisPhqc,
  ambilDataAnalisisPenumpang,
  ambilDataAnalisisRatGuard,
} from '@/lib/ai/data';
import {
  susunPrompt,
  susunPromptRba,
  susunPromptPrediksiRba,
  susunPromptNegaraAsal,
  susunPromptPrediksiNegaraAsal,
  susunPromptFaktorRisiko,
  susunPromptPhqcDaerahAsal,
  susunPromptPrediksiPhqcDaerahAsal,
  susunPromptPelabuhanPhqc,
  susunPromptPenumpang,
  susunPromptPrediksiPenumpang,
  susunPromptPesawatTren,
  susunPromptPrediksiPesawatTren,
  susunPromptVektor,
  susunPromptPrediksiVektor,
  susunPromptLabTikus,
  susunPromptPrediksiLabTikus,
  parseHasilAi,
  susunPromptAnopheles,
  susunPromptPrediksiAnopheles,
  susunPromptTpp,
  susunPromptPrediksiTpp,
  susunPromptTtu,
  susunPromptPrediksiTtu,
  susunPromptPab,
  susunPromptPrediksiPab,
  susunPromptPerWilker,
  susunPromptPrediksiPerWilker,
  susunPromptNegaraTren,
  susunPromptPrediksiNegaraTren,
  susunPromptVektorTikus,
  susunPromptPrediksiVektorTikus,
  susunPromptVektorDiare,
  susunPromptPrediksiVektorDiare,
  susunPromptRatGuard,
  susunPromptPrediksiRatGuard,
} from '@/lib/ai/prompt';
import { ambilDataAnalisisPesawat, type MetrikPesawat } from '@/lib/ai/dataPesawat';
import { panggilAI } from '@/lib/ai';
import { rentangHariIniWita } from '@/lib/ai/periode';
import type { Wilayah } from '@/types/database.types';
import { type MetrikVektor } from '@/lib/ai/dataVektor';


export const maxDuration = 60;

const DAFTAR_WILAYAH: readonly Wilayah[] = [
  'Samarinda', 'TanjungSantan', 'TanjungLaut', 'Lhoktuan', 'Sangatta', 'Sangkulirang',
];

function isWilayahValid(nilai: unknown): nilai is Wilayah {
  return typeof nilai === 'string' && (DAFTAR_WILAYAH as readonly string[]).includes(nilai);
}

function isKodeWilkerValid(nilai: unknown): nilai is string {
  return typeof nilai === 'string' && /^WK\d{2}$/.test(nilai);
}

const METRIK_VEKTOR_VALID: readonly MetrikVektor[] = [
  'hi-ci-abj', 'rumah-diperiksa', 'container-diperiksa',
  'rumah-container-positif', 'larvasida', 'luas-insektisida',
];

function isMetrikValid(nilai: unknown): nilai is MetrikVektor {
  return typeof nilai === 'string' && (METRIK_VEKTOR_VALID as readonly string[]).includes(nilai);
}

type TipeAnalisis = 'analisis' | 'prediksi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const konteks = searchParams.get('konteks');
  const periodeKey = searchParams.get('periode_key');
  const wilayahKerja = searchParams.get('wilayah_kerja');
  const tipeParam = searchParams.get('tipe');
  const metrik = searchParams.get('metrik');

  if (!konteks || !isKonteksValid(konteks)) {
    return NextResponse.json({ error: 'konteks tidak dikenal.' }, { status: 400 });
  }
  if (!periodeKey) {
    return NextResponse.json({ error: 'periode_key wajib diisi.' }, { status: 400 });
  }

  const tipe: TipeAnalisis = tipeParam === 'prediksi' ? 'prediksi' : 'analisis';

  const supabase = await createClient();

  let query = supabase
    .from('riwayat_analisis_ai')
    .select('*')
    .eq('konteks', konteks)
    .eq('periode_key', periodeKey)
    .eq('tipe', tipe)
    .order('dibuat_pada', { ascending: false })
    .limit(1);

  query = wilayahKerja ? query.eq('wilayah_kerja', wilayahKerja) : query.is('wilayah_kerja', null);
  query = metrik ? query.eq('metrik', metrik) : query.is('metrik', null);

  const { data, error } = await query;

  if (error) {
    console.error('Gagal membaca riwayat_analisis_ai:', error.message);
    return NextResponse.json({ error: 'Gagal memuat hasil Analisis AI.' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ ada: false });
  }

  const cache = data[0];
  return NextResponse.json({
    ada: true,
    ringkasan: cache.ringkasan,
    anomali: cache.anomali,
    rekomendasi: cache.rekomendasi,
    providerDipakai: cache.provider_dipakai,
    dibuatPada: cache.dibuat_pada,
  });
}

export async function POST(request: Request) {
  const { role } = await getStatusAkses();
  if (role !== 'admin' && role !== 'petugas') {
    return NextResponse.json(
      { error: 'Menjalankan Analisis/Prediksi AI hanya untuk Petugas/Admin yang sudah login.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body request harus JSON.' }, { status: 400 });
  }

  const {
    konteks,
    periode_key: periodeKey,
    wilayah_kerja,
    paksaPerbarui,
    tipe: tipeMentah,
    metrik: metrikMentah,
  } = (body ?? {}) as {
    konteks?: string;
    periode_key?: string;
    wilayah_kerja?: string | null;
    paksaPerbarui?: boolean;
    tipe?: string;
    metrik?: string;
  };

  if (!konteks || !isKonteksValid(konteks)) {
    return NextResponse.json(
      {
        error:
  'Prediksi AI belum tersedia untuk konteks ini. Saat ini Prediksi AI mendukung: data vektor (HI/CI/BI/ABJ/Curah Hujan), cop-rba, cop-negara-asal, cop-negara-tren, cop-per-wilker, phqc-daerah-asal, phqc-rba-mingguan, phqc-rba-bulanan, penumpang-mingguan, penumpang-bulanan, pesawat-mingguan, pesawat-bulanan, tikus-lab-mingguan, tikus-lab-bulanan, vektor-tikus-mingguan, vektor-tikus-bulanan, anopheles-dewasa-mingguan, anopheles-dewasa-bulanan, anopheles-larva-mingguan, anopheles-larva-bulanan, tpp-bulanan, ttu-bulanan, pab-bulanan.',
      },
      { status: 400 }
    );
  }

  if (!periodeKey || typeof periodeKey !== 'string') {
    return NextResponse.json({ error: 'periode_key wajib diisi.' }, { status: 400 });
  }

  const tipe: TipeAnalisis = tipeMentah === 'prediksi' ? 'prediksi' : 'analisis';
  const konteksVektor = 
  isKonteksVektor(konteks) || 
  konteks.startsWith('anopheles-');
  const konteksPesawat = konteks === 'pesawat-mingguan' || konteks === 'pesawat-bulanan';
  const konteksTikusLab =
  konteks === 'tikus-lab-mingguan' ||
  konteks === 'tikus-lab-bulanan' ||
  konteks === 'vektor-tikus-mingguan' ||
  konteks === 'vektor-tikus-bulanan';
  const konteksVektorDiare =
  konteks === 'vektor-diare-lalat-mingguan' ||
  konteks === 'vektor-diare-kecoa-mingguan' ||
  konteks === 'vektor-diare-lalat-bulanan' ||
  konteks === 'vektor-diare-kecoa-bulanan';
  const konteksSanitasi = isKonteksSanitasi(konteks);
  const metrikVektor: MetrikVektor = isMetrikValid(metrikMentah) ? metrikMentah : 'hi-ci-abj';
  const metrikPesawat: string = typeof metrikMentah === 'string' && metrikMentah ? metrikMentah : 'crew-penumpang';
  const metrikUntukCache: string | null = konteksVektor
    ? metrikVektor
    : konteksPesawat
    ? metrikPesawat
    : typeof metrikMentah === 'string' && metrikMentah.trim() !== ''
      ? metrikMentah.trim()
      : null;

  if (tipe === 'prediksi' && !konteksVektor && !isKonteksPrediksiNonVektorValid(konteks)) {
    return NextResponse.json(
      {
        error:
          'Prediksi AI belum tersedia untuk konteks ini. Saat ini Prediksi AI mendukung: data vektor (HI/CI/BI/ABJ/Curah Hujan), cop-rba, cop-negara-asal, phqc-daerah-asal, phqc-rba-mingguan, phqc-rba-bulanan, penumpang-mingguan, penumpang-bulanan, pesawat-mingguan, pesawat-bulanan.',
      },
      { status: 400 }
    );
  }

  let wilayahKerja: string | undefined;

  if (konteksVektor) {
    if (!isKodeWilkerValid(wilayah_kerja)) {
      return NextResponse.json(
        {
          error:
            'Analisis/Prediksi AI untuk data vektor wajib memilih satu Wilayah Kerja tertentu (format kode: WK01-WK07), tidak berlaku untuk "Semua Wilayah Kerja".',
        },
        { status: 400 }
      );
    }
    wilayahKerja = wilayah_kerja;
  } else if (konteksPesawat) {
    if (wilayah_kerja !== undefined && wilayah_kerja !== null && !isKodeWilkerValid(wilayah_kerja)) {
      return NextResponse.json(
        { error: `wilayah_kerja "${wilayah_kerja}" tidak valid untuk konteks pesawat (format kode: WK01-WK07).` },
        { status: 400 }
      );
    }
    wilayahKerja = isKodeWilkerValid(wilayah_kerja) ? wilayah_kerja : undefined;
  } else if (konteksTikusLab) {
    if (wilayah_kerja !== undefined && wilayah_kerja !== null && !isKodeWilkerValid(wilayah_kerja)) {
      return NextResponse.json(
        { error: `wilayah_kerja "${wilayah_kerja}" tidak valid untuk konteks vektor tikus (format kode: WK01-WK07).` },
        { status: 400 }
      );
    }
    wilayahKerja = isKodeWilkerValid(wilayah_kerja) ? wilayah_kerja : undefined;
  } else if (konteksVektorDiare) {
    if (wilayah_kerja !== undefined && wilayah_kerja !== null && !isKodeWilkerValid(wilayah_kerja)) {
      return NextResponse.json(
        { error: `wilayah_kerja "${wilayah_kerja}" tidak valid untuk konteks vektor diare (format kode: WK01-WK09).` },
        { status: 400 }
      );
    }
    wilayahKerja = isKodeWilkerValid(wilayah_kerja) ? wilayah_kerja : undefined;
  } else if (konteksSanitasi) {
    wilayahKerja =
      typeof wilayah_kerja === 'string' && wilayah_kerja.trim().length > 0
        ? wilayah_kerja
        : undefined;
  } else {
    if (wilayah_kerja !== undefined && wilayah_kerja !== null && !isWilayahValid(wilayah_kerja)) {
      return NextResponse.json({ error: `wilayah_kerja "${wilayah_kerja}" tidak dikenal.` }, { status: 400 });
    }
    wilayahKerja = isWilayahValid(wilayah_kerja) ? wilayah_kerja : undefined;
  }

  const supabase = await createClient();

  if (!paksaPerbarui) {
    const { mulaiUtc, akhirUtc } = rentangHariIniWita();

    let queryCache = supabase
      .from('riwayat_analisis_ai')
      .select('*')
      .eq('konteks', konteks)
      .eq('periode_key', periodeKey)
      .eq('tipe', tipe)
      .gte('dibuat_pada', mulaiUtc.toISOString())
      .lt('dibuat_pada', akhirUtc.toISOString())
      .order('dibuat_pada', { ascending: false })
      .limit(1);

    queryCache = wilayahKerja
      ? queryCache.eq('wilayah_kerja', wilayahKerja)
      : queryCache.is('wilayah_kerja', null);

    queryCache = metrikUntukCache
      ? queryCache.eq('metrik', metrikUntukCache)
      : queryCache.is('metrik', null);
        const { data: cacheRows, error: cacheError } = await queryCache;

    if (cacheError) {
      console.error('Gagal cek cache riwayat_analisis_ai:', cacheError.message);
    } else if (cacheRows && cacheRows.length > 0) {
      const cache = cacheRows[0];
      return NextResponse.json({
        ringkasan: cache.ringkasan,
        anomali: cache.anomali,
        rekomendasi: cache.rekomendasi,
        providerDipakai: cache.provider_dipakai,
        dibuatPada: cache.dibuat_pada,
        dariCache: true,
      });
    }
  }

  const supabaseServiceRole = createServiceRoleClient();
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
  let labelPeriodeSaatIni: string | undefined;
  let labelPeriodeSebelumnya: string | undefined;
  try {
    if (konteksVektor) {
      const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja, metrikVektor);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiVektor(data) : susunPromptVektor(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    } else if (konteksPesawat) {
      const data = await ambilDataAnalisisPesawat(periodeKey, wilayahKerja, metrikPesawat as MetrikPesawat, tipe);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiPesawatTren(data) : susunPromptPesawatTren(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    } else if (isKonteksBreakdown(konteks)) {
      const data = await ambilDataBreakdownAnalisis(konteks, periodeKey, wilayahKerja);
      labelPeriodeSaatIni = data.labelPeriode;
      if (konteks === 'cop-rba') {
        promptTeks = tipe === 'prediksi' ? susunPromptPrediksiRba(data) : susunPromptRba(data);
      } else if (konteks === 'cop-negara-asal') {
        promptTeks = tipe === 'prediksi' ? susunPromptPrediksiNegaraAsal(data) : susunPromptNegaraAsal(data);
      } else if (konteks === 'phqc-daerah-asal') {
        promptTeks = tipe === 'prediksi' ? susunPromptPrediksiPhqcDaerahAsal(data) : susunPromptPhqcDaerahAsal(data);
      } else if (konteks === 'phqc-rba-mingguan' || konteks === 'phqc-rba-bulanan') {
        promptTeks = tipe === 'prediksi' ? susunPromptPrediksiRba(data) : susunPromptRba(data);
      } else if (konteks === 'phqc-pelabuhan-mingguan' || konteks === 'phqc-pelabuhan-bulanan') {
        promptTeks = susunPromptPelabuhanPhqc(data);
      } else if (konteks === 'cop-per-wilker') {
        promptTeks = tipe === 'prediksi' ? susunPromptPrediksiPerWilker(data) : susunPromptPerWilker(data);
      } else if (konteks === 'cop-faktor-risiko') {
        promptTeks = susunPromptFaktorRisiko(data);
      } else {
        throw new Error(`Konteks breakdown "${konteks}" belum punya fungsi susunPrompt yang dipasang di route.ts.`);
      }

      
     } else if ((konteks as any) === 'global-emerging-mingguan' || (konteks as any) === 'global-emerging-bulanan') {
        const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja);
        
        const pembuatPromptPrediksi = (globalThis as any)['susunPromptPrediksiGlobalEmerging'];
        const pembuatPromptGlobal = (globalThis as any)['susunPromptGlobalEmerging'];

        if (tipe === 'prediksi') {
          promptTeks = typeof pembuatPromptPrediksi === 'function'
            ? pembuatPromptPrediksi(data)
            : `Analisis prediksi data global emerging berikut: ${JSON.stringify(data)}`;
        } else {
          promptTeks = typeof pembuatPromptGlobal === 'function'
            ? pembuatPromptGlobal(data)
            : `Analisis data global emerging berikut: ${JSON.stringify(data)}`;
        }

        labelPeriodeSaatIni = data.labelPeriodeSaatIni;
        labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;

    } else if (konteks === 'cop-negara-tren') {
    const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja);
    promptTeks = tipe === 'prediksi' ? susunPromptPrediksiNegaraTren(data) : susunPromptNegaraTren(data);
    labelPeriodeSaatIni = data.labelPeriodeSaatIni;
    labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;

    } else if (konteks === 'penumpang-mingguan' || konteks === 'penumpang-bulanan') {
      const data = await ambilDataAnalisisPenumpang(konteks, periodeKey, wilayahKerja, tipe);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiPenumpang(data) : susunPromptPenumpang(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    
    } else if (konteks === 'vektor-tikus-mingguan' || konteks === 'vektor-tikus-bulanan') {
      const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiVektorTikus(data) : susunPromptVektorTikus(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    } else if (konteks === 'tikus-lab-mingguan' || konteks === 'tikus-lab-bulanan') {
      const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiLabTikus(data) : susunPromptLabTikus(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    } else if (konteks === 'tpp-bulanan' || konteks === 'tpp-mingguan') {
      // FIX: pakai ambilDataAnalisisSanitasi (kumulatif untuk
      // tipe="analisis", periode tunggal untuk tipe="prediksi" --
      // tidak lagi ambilDataAnalisis() generik.
      const data = await ambilDataAnalisisSanitasi(konteks, periodeKey, wilayahKerja, tipe);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiTpp(data) : susunPromptTpp(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    } else if (konteks === 'ttu-bulanan' || konteks === 'ttu-mingguan') {
      // FIX: sama seperti TPP di atas.
      const data = await ambilDataAnalisisSanitasi(konteks, periodeKey, wilayahKerja, tipe);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiTtu(data) : susunPromptTtu(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    } else if (konteks === 'pab-bulanan' || konteks === 'pab-mingguan') {
      const data = await ambilDataAnalisisSanitasi(konteks, periodeKey, wilayahKerja, tipe);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiPab(data) : susunPromptPab(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    } else if (konteks === 'rat-guard-bulanan' || konteks === 'rat-guard-mingguan') {
      // pakai ambilDataAnalisisRatGuard sendiri, BUKAN ambilDataAnalisisSanitasi
      // (yang else-fallback-nya jatuh ke PAB kalau dipakai untuk rat-guard).
      const data = await ambilDataAnalisisRatGuard(konteks, periodeKey, wilayahKerja, tipe);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiRatGuard(data) : susunPromptRatGuard(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    
    } else if (
      konteks === 'vektor-diare-lalat-mingguan' ||
      konteks === 'vektor-diare-kecoa-mingguan' ||
      konteks === 'vektor-diare-lalat-bulanan' ||
      konteks === 'vektor-diare-kecoa-bulanan'
    ) {
      const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiVektorDiare(data) : susunPromptVektorDiare(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    
    } else if (
      konteks === 'anopheles-dewasa-mingguan' ||
      konteks === 'anopheles-dewasa-bulanan' ||
      konteks === 'anopheles-larva-mingguan' ||
      konteks === 'anopheles-larva-bulanan'
    ) {
      const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja);
      
      try {
        promptTeks = tipe === 'prediksi' ? susunPromptPrediksiAnopheles(data) : susunPromptAnopheles(data);
      } catch (e) {
        console.error("Gagal menyusun prompt karena data kosong:", e);
        return NextResponse.json({ 
          ada: false, 
          pesan: 'Data surveilans Anopheles belum tersedia untuk periode dan wilayah ini.' 
        });
      }

      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    } else if (konteks === 'cop-mingguan' || konteks === 'cop-bulanan') {
      const data = await ambilDataAnalisisCop(konteks, periodeKey, wilayahKerja, tipe);
      promptTeks = susunPrompt(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
    } else if (konteks === 'phqc-mingguan' || konteks === 'phqc-bulanan') {
      const data = await ambilDataAnalisisPhqc(konteks, periodeKey, wilayahKerja, tipe);
      promptTeks = susunPrompt(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    } else {
      const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja);
      promptTeks = susunPrompt(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal mengambil data untuk dianalisis.';
    return NextResponse.json({ error: pesan }, { status: 400 });
  }

  let hasil: ReturnType<typeof parseHasilAi> | undefined;
  let pengaturanTerpakai: (typeof daftarProviderAktif)[number] | null = null;
  const pesanErrorPerProvider: string[] = [];

  for (const provider of daftarProviderAktif) {
    try {
      const teksMentah = await panggilAI(provider, promptTeks);
      console.log(`TEKS MENTAH DARI AI (${provider.nama_tampilan}):`, teksMentah);
      hasil = parseHasilAi(teksMentah);
      pengaturanTerpakai = provider;
      break;
    } catch (err) {
      const pesan = err instanceof Error ? err.message : 'Gagal tanpa pesan.';
      console.error(`Provider "${provider.nama_tampilan}" gagal:`, pesan);
      pesanErrorPerProvider.push(`${provider.nama_tampilan}: ${pesan}`);
    }
  }

  if (!hasil || !pengaturanTerpakai) {
    return NextResponse.json(
      {
        error: `Semua provider AI gagal dijalankan. Detail: ${pesanErrorPerProvider.join(' | ')}`,
      },
      { status: 502 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const providerDipakai = `${pengaturanTerpakai.nama_tampilan} (${pengaturanTerpakai.model})`;

  const { error: insertError } = await supabase.from('riwayat_analisis_ai').insert({
    konteks,
    periode_key: periodeKey,
    wilayah_kerja: wilayahKerja ?? null,
    tipe,
    metrik: metrikUntukCache,
    provider_dipakai: providerDipakai,
    ringkasan: hasil.ringkasan,
    anomali: hasil.anomali,
    rekomendasi: hasil.rekomendasi,
    dibuat_oleh: user?.id ?? null,
  });

  if (insertError) {
    console.error('Gagal menyimpan riwayat_analisis_ai:', insertError.message);
  }

  return NextResponse.json({
    ringkasan: hasil.ringkasan,
    anomali: hasil.anomali,
    rekomendasi: hasil.rekomendasi,
    providerDipakai,
    dibuatPada: new Date().toISOString(),
    labelPeriodeSaatIni,
    labelPeriodeSebelumnya,
    dariCache: false,
  });
}