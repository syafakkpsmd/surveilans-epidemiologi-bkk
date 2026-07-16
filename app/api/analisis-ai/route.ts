import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import {
  ambilDataAnalisis,
  ambilDataBreakdownAnalisis,
  isKonteksValid,
  isKonteksBreakdown,
  isKonteksVektor,
  isKonteksPrediksiNonVektorValid,
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
  parseHasilAi,
  susunPromptGlobalEmerging,
  susunPromptPrediksiGlobalEmerging,
} from '@/lib/ai/prompt';
import { ambilDataAnalisisPesawat, type MetrikPesawat } from '@/lib/ai/dataPesawat';
import { panggilAI } from '@/lib/ai';
import { rentangHariIniWita } from '@/lib/ai/periode';
import type { Wilayah } from '@/types/database.types';
import { type MetrikVektor } from '@/lib/ai/dataVektor';

const DAFTAR_WILAYAH: readonly Wilayah[] = [
  'Samarinda', 'TanjungSantan', 'TanjungLaut', 'Lhoktuan', 'Sangatta', 'Sangkulirang',
];

function isWilayahValid(nilai: unknown): nilai is Wilayah {
  return typeof nilai === 'string' && (DAFTAR_WILAYAH as readonly string[]).includes(nilai);
}

/** kode_wilker vektor formatnya "WK01".."WK07". */
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

export async function POST(request: Request) {
  // ---------- 1. VERIFIKASI ROLE DI SERVER ----------
  const { sudahLogin } = await getStatusAkses();
  if (!sudahLogin) {
    return NextResponse.json(
      { error: 'Analisis AI hanya untuk Petugas/Admin yang sudah login.' },
      { status: 403 }
    );
  }

  // ---------- 2. VALIDASI INPUT ----------
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
          'konteks tidak dikenal. Nilai yang valid: dashboard-utama, alat-angkut-ringkasan, cop-mingguan, cop-bulanan, phqc-mingguan, phqc-bulanan, penumpang-mingguan, penumpang-bulanan, pesawat-mingguan, pesawat-bulanan, cop-rba, cop-negara-asal, cop-faktor-risiko, phqc-daerah-asal, phqc-rba-mingguan, phqc-rba-bulanan, phqc-pelabuhan-mingguan, phqc-pelabuhan-bulanan, vektor-dbd-mingguan, vektor-dbd-bulanan.',
      },
      { status: 400 }
    );
  }

  if (!periodeKey || typeof periodeKey !== 'string') {
    return NextResponse.json({ error: 'periode_key wajib diisi.' }, { status: 400 });
  }

  const tipe: TipeAnalisis = tipeMentah === 'prediksi' ? 'prediksi' : 'analisis';
  const konteksVektor = isKonteksVektor(konteks);
  const konteksPesawat = konteks === 'pesawat-mingguan' || konteks === 'pesawat-bulanan';
  const metrikVektor: MetrikVektor = isMetrikValid(metrikMentah) ? metrikMentah : 'hi-ci-abj';
  // Metrik pesawat divalidasi lebih lanjut di ambilDataAnalisisPesawat()
  // (menolak kota-asal/kota-tujuan/maskapai-* yang belum siap) -- di sini
  // cukup pastikan ada nilai default yang konsisten untuk key cache.
  const metrikPesawat: string = typeof metrikMentah === 'string' && metrikMentah ? metrikMentah : 'crew-penumpang';
  const pakaiMetrik = konteksVektor || konteksPesawat;
  const metrikUntukCache: string | null = konteksVektor ? metrikVektor : konteksPesawat ? metrikPesawat : null;

  if (tipe === 'prediksi' && !konteksVektor && !isKonteksPrediksiNonVektorValid(konteks)) {
    return NextResponse.json(
      {
        error:
          'Prediksi AI belum tersedia untuk konteks ini. Saat ini Prediksi AI mendukung: data vektor (HI/CI/BI/ABJ/Curah Hujan), cop-rba, cop-negara-asal, phqc-daerah-asal, phqc-rba-mingguan, phqc-rba-bulanan, penumpang-mingguan, penumpang-bulanan, pesawat-mingguan, pesawat-bulanan.',
      },
      { status: 400 }
    );
  }

  // ---------- Validasi wilayah_kerja sesuai kelompok konteks ----------
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
    // Beda dari vektor: "Semua Bandara" tetap valid untuk pesawat, jadi
    // wilayah_kerja OPSIONAL -- tapi kalau diisi, formatnya tetap harus
    // kode_wilker (WK0X), sama seperti vektor, BUKAN enum Wilayah.
    if (wilayah_kerja !== undefined && wilayah_kerja !== null && !isKodeWilkerValid(wilayah_kerja)) {
      return NextResponse.json(
        { error: `wilayah_kerja "${wilayah_kerja}" tidak valid untuk konteks pesawat (format kode: WK01-WK07).` },
        { status: 400 }
      );
    }
    wilayahKerja = isKodeWilkerValid(wilayah_kerja) ? wilayah_kerja : undefined;
  } else {
    if (wilayah_kerja !== undefined && wilayah_kerja !== null && !isWilayahValid(wilayah_kerja)) {
      return NextResponse.json({ error: `wilayah_kerja "${wilayah_kerja}" tidak dikenal.` }, { status: 400 });
    }
    wilayahKerja = isWilayahValid(wilayah_kerja) ? wilayah_kerja : undefined;
  }

  const supabase = await createClient();

  // ---------- 3. CEK CACHE HARIAN (WITA), KECUALI paksaPerbarui ----------
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

    queryCache = pakaiMetrik ? queryCache.eq('metrik', metrikUntukCache) : queryCache.is('metrik', null);

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

  // ---------- 4. AMBIL PROVIDER AKTIF ----------
  const supabaseServiceRole = createServiceRoleClient();
  const { data: pengaturanAktif, error: pengaturanError } = await supabaseServiceRole
    .from('pengaturan_ai')
    .select('*')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pengaturanError) {
    console.error('Gagal mengambil pengaturan_ai:', pengaturanError.message);
    return NextResponse.json(
      { error: 'Gagal memuat konfigurasi Analisis AI. Coba lagi sebentar lagi.' },
      { status: 503 }
    );
  }

  if (!pengaturanAktif) {
    return NextResponse.json(
      { error: 'Analisis AI belum dikonfigurasi. Hubungi Admin.' },
      { status: 503 }
    );
  }

  // ---------- 5. AMBIL DATA + SUSUN PROMPT ----------
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
      const data = await ambilDataAnalisisPesawat(periodeKey, wilayahKerja, metrikPesawat as MetrikPesawat);
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
        // Definisi RBA sama persis antara COP & PHQC -- pakai ulang prompt yang sama.
        promptTeks = tipe === 'prediksi' ? susunPromptPrediksiRba(data) : susunPromptRba(data);
      } else if (konteks === 'phqc-pelabuhan-mingguan' || konteks === 'phqc-pelabuhan-bulanan') {
        // Belum ada prompt Prediksi untuk ini -- gerbang di atas sudah
        // menolak tipe="prediksi" untuk konteks ini sebelum sampai sini.
        promptTeks = susunPromptPelabuhanPhqc(data);
      } else {
        // cop-faktor-risiko: belum ada prompt Prediksi -- gerbang di atas
        // sudah menolak tipe="prediksi" untuk konteks ini sebelum sampai sini.
        promptTeks = susunPromptFaktorRisiko(data);
      }

      } else if (konteks === 'global-emerging-mingguan' || konteks === 'global-emerging-bulanan') {
      const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiGlobalEmerging(data) : susunPromptGlobalEmerging(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
      labelPeriodeSebelumnya = data.labelPeriodeSebelumnya;
      
    } else if (konteks === 'penumpang-mingguan' || konteks === 'penumpang-bulanan') {
      const data = await ambilDataAnalisis(konteks, periodeKey, wilayahKerja);
      promptTeks = tipe === 'prediksi' ? susunPromptPrediksiPenumpang(data) : susunPromptPenumpang(data);
      labelPeriodeSaatIni = data.labelPeriodeSaatIni;
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

  // ---------- 6. PANGGIL PROVIDER AI ----------
  let hasil;
  try {
    const teksMentah = await panggilAI(pengaturanAktif, promptTeks);
    hasil = parseHasilAi(teksMentah);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Analisis AI gagal dijalankan.';
    console.error('Panggilan AI gagal:', pesan);
    return NextResponse.json({ error: `Analisis AI gagal dijalankan: ${pesan}` }, { status: 502 });
  }

  // ---------- 7. SIMPAN KE riwayat_analisis_ai ----------
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const providerDipakai = `${pengaturanAktif.nama_tampilan} (${pengaturanAktif.model})`;

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