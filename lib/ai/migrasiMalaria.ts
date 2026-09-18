import {
  getRingkasanUtamaMigrasi,
  getBreakdownKategoriMigrasi,
  getBreakdownMultiSelectMigrasi,
  getDistribusiUsiaMigrasi,
  getRuteMigrasiTeratas,
  getTrenBulananRdtGender,
  getBreakdownKapalPesawat,
  type BreakdownItem,
  type BreakdownMultiSelect,
} from '@/lib/turso/queriesMigrasiMalaria';

/**
 * Persona epidemiolog untuk prompt modul ini. Sengaja dibuat sendiri (tidak
 * bergantung ke PERSONA_EPIDEMIOLOG di modul lain yang belum saya lihat
 * isinya) supaya file ini berdiri sendiri.
 */
const PERSONA_EPIDEMIOLOG_MALARIA = `Anda adalah epidemiolog kesehatan ahli madya yang berpengalaman dalam surveilans malaria impor dan kekarantinaan kesehatan di pelabuhan/bandara Indonesia. Jawab dalam Bahasa Indonesia formal, ringkas, dan berbasis data yang diberikan saja.`;

export type DataAnalisisMigrasiMalaria = {
  labelWilayah: string;
  labelPeriode: string;
  ringkasan: {
    totalResponden: number;
    totalDiperiksaRdt: number;
    totalPositifRdt: number;
    angkaPositivitas: number;
    jumlahWilkerAktif: number;
  };
  jenisKelamin: BreakdownItem[];
  usia: BreakdownItem[];
  pendidikan: BreakdownItem[];
  pekerjaan: BreakdownItem[];
  kapPernahSakit: BreakdownItem[];
  kapTahuPenyakit: BreakdownItem[];
  kapTahuGejala: BreakdownItem[];
  kapPakaiBaju: BreakdownItem[];
  kapPakaiTidur: BreakdownMultiSelect[];
  kapTempatBerobat: BreakdownMultiSelect[];
  kapFaktorRisikoLingkungan: BreakdownMultiSelect[];
  rute: { rute: string; jumlah: number }[];
  trenBulanan: { bulanLabel: string; diperiksa: number; positif_rdt: number }[];
  kapalPesawat: BreakdownItem[];
};

/**
 * Ambil & rangkum SEMUA data yang tampil di halaman Surveilans Migrasi
 * Malaria untuk satu wilker+tahun, siap dijadikan konteks prompt AI.
 * Tren bulanan diambil untuk satu tahun penuh (Jan–Des) sebagai representasi
 * umum — tidak mengikuti picker rentang mingguan/bulanan per-chart di
 * halaman (biar tombolnya tetap sederhana: cuma tahun + wilker).
 */
export async function ambilDataAnalisisMigrasiMalaria(
  tahun: number,
  kodeWilker: string | undefined,
  labelWilayah: string
): Promise<DataAnalisisMigrasiMalaria> {
  const [
    ringkasan,
    jenisKelamin,
    usia,
    pendidikan,
    pekerjaan,
    kapPernahSakit,
    kapTahuPenyakit,
    kapTahuGejala,
    kapPakaiBaju,
    kapPakaiTidur,
    kapTempatBerobat,
    kapFaktorRisikoLingkungan,
    rute,
    trenBulanan,
    kapalPesawat,
  ] = await Promise.all([
    getRingkasanUtamaMigrasi({ tahun, kodeWilker }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'jenis_kelamin' }),
    getDistribusiUsiaMigrasi({ tahun, kodeWilker }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'pendidikan_terakhir' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'pekerjaan' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'pernah_sakit_malaria' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'tahu_penyakit_malaria' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'tahu_gejala_malaria' }),
    getBreakdownKategoriMigrasi({ tahun, kodeWilker, kolom: 'pakai_baju_panjang_repellent' }),
    getBreakdownMultiSelectMigrasi({ tahun, kodeWilker, kolom: 'pakai_saat_tidur' }),
    getBreakdownMultiSelectMigrasi({ tahun, kodeWilker, kolom: 'tempat_berobat' }),
    getBreakdownMultiSelectMigrasi({ tahun, kodeWilker, kolom: 'sekitar_dekat_dengan' }),
    getRuteMigrasiTeratas({ tahun, kodeWilker, limit: 5 }),
    getTrenBulananRdtGender({ tahun, bulanDari: 1, bulanSampai: 12, kodeWilker }),
    getBreakdownKapalPesawat({ tahun, bulanDari: 1, bulanSampai: 12, kodeWilker, limit: 5 }),
  ]);

  return {
    labelWilayah,
    labelPeriode: `Tahun ${tahun}`,
    ringkasan,
    jenisKelamin,
    usia,
    pendidikan,
    pekerjaan,
    kapPernahSakit,
    kapTahuPenyakit,
    kapTahuGejala,
    kapPakaiBaju,
    kapPakaiTidur,
    kapTempatBerobat,
    kapFaktorRisikoLingkungan,
    rute: rute.map((r) => ({ rute: r.rute, jumlah: r.jumlah })),
    trenBulanan: trenBulanan.map((t) => ({
      bulanLabel: t.bulanLabel,
      diperiksa: t.diperiksa,
      positif_rdt: t.positif_rdt,
    })),
    kapalPesawat,
  };
}

function formatBreakdown(items: BreakdownItem[]): string {
  if (items.length === 0) return '(tidak ada data)';
  return items.map((d) => `${d.kategori}: ${d.jumlah}`).join(', ');
}

function formatBreakdownMulti(items: BreakdownMultiSelect[]): string {
  if (items.length === 0) return '(tidak ada data)';
  return items.map((d) => `${d.kategori}: ${d.jumlah} (${d.persenDariResponden}% responden)`).join(', ');
}

/**
 * Susun SATU prompt gabungan (analisis situasi terkini + prediksi ke depan)
 * berdasarkan seluruh data di halaman. Output tetap dipaksa 3 field
 * {ringkasan, anomali, rekomendasi} — "ringkasan" & "anomali" memuat analisis
 * kondisi saat ini, "rekomendasi" memuat proyeksi/prediksi dan langkah
 * tindak lanjut, supaya satu tombol bisa mencakup analisis DAN prediksi.
 */
export function susunPromptAnalisisMigrasiMalaria(data: DataAnalisisMigrasiMalaria): string {
  const trenTeksBulanan = data.trenBulanan
    .filter((t) => t.diperiksa > 0)
    .map((t) => `${t.bulanLabel}: diperiksa ${t.diperiksa}, positif RDT ${t.positif_rdt}`)
    .join('; ') || '(belum ada kegiatan tercatat)';

  return `${PERSONA_EPIDEMIOLOG_MALARIA}

Data Surveilans Migrasi Malaria — ${data.labelWilayah}, ${data.labelPeriode}.

RINGKASAN UTAMA:
Total responden diskrining: ${data.ringkasan.totalResponden}
Diperiksa RDT: ${data.ringkasan.totalDiperiksaRdt}
Positif RDT: ${data.ringkasan.totalPositifRdt}
Angka positivitas: ${data.ringkasan.angkaPositivitas}%
Jumlah wilker aktif melapor: ${data.ringkasan.jumlahWilkerAktif}

DEMOGRAFI RESPONDEN:
Jenis kelamin: ${formatBreakdown(data.jenisKelamin)}
Kelompok usia: ${formatBreakdown(data.usia)}
Pendidikan terakhir: ${formatBreakdown(data.pendidikan)}
Pekerjaan: ${formatBreakdown(data.pekerjaan)}

PENGETAHUAN & PERILAKU BERISIKO (KAP):
Riwayat pernah sakit malaria: ${formatBreakdown(data.kapPernahSakit)}
Tahu tentang penyakit malaria: ${formatBreakdown(data.kapTahuPenyakit)}
Tahu gejala malaria: ${formatBreakdown(data.kapTahuGejala)}
Pakai baju panjang/repellent malam hari: ${formatBreakdown(data.kapPakaiBaju)}
Perlindungan saat tidur malam (bisa lebih dari satu): ${formatBreakdownMulti(data.kapPakaiTidur)}
Tempat berobat saat sakit (bisa lebih dari satu): ${formatBreakdownMulti(data.kapTempatBerobat)}
Kedekatan dengan faktor risiko lingkungan (bisa lebih dari satu): ${formatBreakdownMulti(data.kapFaktorRisikoLingkungan)}

RUTE MIGRASI TERBANYAK (asal → tujuan):
${data.rute.length > 0 ? data.rute.map((r) => `${r.rute}: ${r.jumlah}`).join('; ') : '(tidak ada data)'}

NAMA KAPAL/PESAWAT DENGAN RESPONDEN TERBANYAK:
${formatBreakdown(data.kapalPesawat)}

TREN BULANAN (diperiksa vs positif RDT) SEPANJANG TAHUN ${data.labelPeriode.replace('Tahun ', '')}:
${trenTeksBulanan}

TUGAS ANDA:
1. Analisis situasi saat ini: apakah ada pola yang perlu diwaspadai pada demografi, KAP, atau tren RDT.
2. Deteksi anomali: kelompok/wilayah/perilaku dengan risiko lebih tinggi dari yang lain, atau ketimpangan pengetahuan-perilaku yang mencolok.
3. Prediksi & rekomendasi: proyeksikan arah tren ke depan berdasarkan pola bulanan di atas, dan berikan rekomendasi tindak lanjut kekarantinaan kesehatan (mis. penguatan KIE, penajaman sasaran skrining RDT, kolaborasi wilker) yang konkret dan dapat ditindaklanjuti.

Jangan mengarang angka di luar yang diberikan. Jawab HANYA dalam format JSON dengan persis 3 field: ringkasan, anomali, rekomendasi (rekomendasi memuat proyeksi/prediksi ke depan beserta langkah tindak lanjutnya). Jangan tambahkan teks lain di luar JSON.`;
}

/**
 * Parser hasil mentah AI → {ringkasan, anomali, rekomendasi}. Dibuat sendiri
 * (tidak bergantung ke parseHasilAi di modul lain yang belum saya lihat)
 * supaya file ini berdiri sendiri — menangani kasus AI membungkus JSON
 * dengan ```json ... ``` atau menambah teks di luar JSON.
 */
export function parseHasilAiMigrasiMalaria(teksMentah: string): {
  ringkasan: string;
  anomali: string;
  rekomendasi: string;
} {
  let teks = teksMentah.trim();

  // Buang pembungkus ```json ... ``` atau ``` ... ``` kalau ada.
  const cocokFence = teks.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cocokFence) {
    teks = cocokFence[1].trim();
  }

  // Kalau masih ada teks lain sebelum/sesudah objek JSON, ambil dari '{' pertama sampai '}' terakhir.
  const awal = teks.indexOf('{');
  const akhir = teks.lastIndexOf('}');
  if (awal !== -1 && akhir !== -1 && akhir > awal) {
    teks = teks.slice(awal, akhir + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(teks);
  } catch {
    throw new Error('Respons AI bukan JSON yang valid.');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as any).ringkasan !== 'string' ||
    typeof (parsed as any).anomali !== 'string' ||
    typeof (parsed as any).rekomendasi !== 'string'
  ) {
    throw new Error('Respons AI tidak memuat field ringkasan/anomali/rekomendasi yang valid.');
  }

  const hasil = parsed as { ringkasan: string; anomali: string; rekomendasi: string };
  return {
    ringkasan: hasil.ringkasan,
    anomali: hasil.anomali,
    rekomendasi: hasil.rekomendasi,
  };
}