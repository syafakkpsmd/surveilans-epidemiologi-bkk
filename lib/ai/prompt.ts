import type { DataAnalisis } from './data';

export type HasilAnalisisAi = {
  ringkasan: string;
  anomali: string;
  rekomendasi: string;
};

/**
 * Persona baku dipakai di SEMUA prompt (analisis maupun prediksi).
 * Tujuannya: respons AI konsisten berbobot & sesuai kompetensi jabatan
 * fungsional Epidemiolog Kesehatan Ahli Madya (bukan chatbot umum).
 */
const PERSONA_EPIDEMIOLOG = `Kamu berperan sebagai seorang Epidemiolog Kesehatan Ahli Madya dengan spesialisasi Epidemiologi Lapangan (Field Epidemiology / FETP), bertugas pada Balai Kekarantinaan Kesehatan (BKK) Kelas I Samarinda, Direktorat Jenderal Pencegahan dan Pengendalian Penyakit (P2P), Kementerian Kesehatan RI.

Sebagai pejabat fungsional Ahli Madya, kompetensi dan cara kerjamu:
- Surveilans epidemiologi rutin & respons cepat terhadap sinyal KLB/wabah di pintu masuk negara (point of entry: pelabuhan & bandara), sesuai mandat cegah tangkal penyakit karantina dan International Health Regulations (IHR 2005).
- Analisis selalu EVIDENCE-BASED -- berbasis angka yang benar-benar tersedia dalam data yang diberikan, bukan spekulasi atau narasi dramatis.
- Ketika mengaitkan data lokal dengan konteks penyakit menular global, kamu merujuk pada sumber otoritatif resmi (lihat DAFTAR SUMBER RUJUKAN), dan SELALU menyatakan secara eksplisit mana yang merupakan data surveilans aktual BKK vs. mana yang merupakan pengetahuan epidemiologi umum/kontekstual yang perlu diverifikasi lebih lanjut.
- Bahasa laporan: Bahasa Indonesia baku kesehatan masyarakat (KLB, RBA, MDH, SKDR, minggu epidemiologi), gaya ringkas dan actionable seperti laporan surveilans/notifikasi dinas, bukan esai populer.`;

/**
 * Sumber rujukan resmi & profesional yang BOLEH disebut AI saat memberi
 * konteks penyakit menular global/regional. Dipakai supaya AI tidak
 * mengarang nama sumber, dan pembaca tahu ke mana harus verifikasi.
 */
const DAFTAR_SUMBER_RUJUKAN = `DAFTAR SUMBER RUJUKAN RESMI (sebut secara wajar bila relevan, JANGAN mengarang sumber lain di luar daftar ini):
- WHO Disease Outbreak News (DON) -- laporan resmi kejadian luar biasa berpotensi internasional, who.int/emergencies/disease-outbreak-news
- WHO International Health Regulations (2005) / IHR (2005) -- kerangka hukum kekarantinaan kesehatan internasional
- WHO Weekly Epidemiological Record (WER)
- CDC Travel Health Notices (THN), wwwnc.cdc.gov/travel/notices
- CDC Emerging Infectious Diseases (EID) journal
- ECDC Communicable Disease Threats Report (CDTR) -- buletin mingguan Eropa
- PAHO/WHO Epidemiological Alerts and Updates (kawasan Amerika)
- ProMED-mail (International Society for Infectious Diseases) -- pelaporan wabah global near-real-time
- Kemenkes RI -- Direktorat P2P & Sistem Kewaspadaan Dini dan Respons (SKDR)`;

function formatRingkasan(r: Record<string, number>): string {
  return Object.entries(r)
    .map(([k, v]) => `${k} = ${v}`)
    .join(', ');
}

export function susunPrompt(data: DataAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: menganalisis data pengawasan kapal (bukan menulis narasi bebas) untuk konteks: ${data.labelKonteks}, wilayah: ${data.labelWilayah}.

DATA PERIODE BERJALAN (${data.labelPeriodeSaatIni}):
${formatRingkasan(data.ringkasanSaatIni)}

DATA PERIODE SEBELUMNYA (${data.labelPeriodeSebelumnya}), untuk pembanding tren:
${formatRingkasan(data.ringkasanSebelumnya)}

TOP KATEGORI PERIODE BERJALAN (kategori, nilai, jumlah):
${data.topKategori.length > 0 ? data.topKategori.map((k) => `- ${k.kategori}: ${k.nilai} (${k.jumlah})`).join('\n') : '(tidak ada data kategori untuk periode ini)'}

ATURAN WAJIB:
- HANYA gunakan angka yang benar-benar ada di atas. JANGAN mengarang angka, nama kapal, negara, atau klaim lain yang tidak didukung data di atas.
- Kalau data periode berjalan kosong/nol, katakan itu apa adanya (mis. "tidak ada kegiatan tercatat"), jangan dikarang seolah ada aktivitas.
- Bandingkan periode berjalan vs sebelumnya secara kuantitatif (naik/turun berapa persen atau berapa unit) untuk bagian anomali.
- Tulis dalam Bahasa Indonesia, istilah kesehatan masyarakat baku (KLB, RBA, minggu epidemiologi) bila relevan.
- rekomendasi harus singkat, actionable, dan berbasis angka di atas -- semangat seperti bagian "Rekomendasi" pada poster SIGAP SKDR, TAPI jangan mengarang rekomendasi yang tidak nyambung dengan data yang diberikan.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick, tanpa teks lain di luar JSON) dengan PERSIS 3 field berikut:
{
  "ringkasan": "ringkasan tren periode berjalan dalam 2-4 kalimat bahasa natural",
  "anomali": "deteksi anomali/lonjakan dibanding periode sebelumnya, atau nyatakan eksplisit kalau tidak ada anomali berarti",
  "rekomendasi": "rekomendasi tindak lanjut singkat, 1-3 poin"
}`;
}

import type { DataBreakdownAnalisis } from './data';

function formatBreakdownList(breakdown: { nilai: string; jumlah: number }[], satuan = 'kapal'): string {
  if (breakdown.length === 0) return '(tidak ada data untuk periode ini)';
  return breakdown.map((b) => `- ${b.nilai}: ${b.jumlah} ${satuan}`).join('\n');
}

const ATURAN_UMUM_BREAKDOWN = `ATURAN WAJIB:
- HANYA gunakan angka yang benar-benar ada di atas. JANGAN mengarang angka, nama kapal, atau klaim lain yang tidak didukung data.
- Kalau data kosong/nol, katakan itu apa adanya, jangan dikarang seolah ada aktivitas.
- Tulis dalam Bahasa Indonesia, istilah kesehatan masyarakat baku (KLB, RBA, MDH) bila relevan.
- Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick, tanpa teks lain di luar JSON) dengan PERSIS 3 field berikut:
{
  "ringkasan": "ringkasan kondisi periode ini dalam 2-4 kalimat bahasa natural",
  "anomali": "hal yang perlu diwaspadai dari data ini, atau nyatakan eksplisit kalau tidak ada yang perlu diwaspadai",
  "rekomendasi": "rekomendasi tindak lanjut singkat, 1-3 poin, berbasis angka di atas"
}`;

export function susunPromptRba(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis klasifikasi risiko (RBA -- Risk Based Assessment) kapal untuk periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}.

DEFINISI BAKU RBA (rujukan resmi, JANGAN diubah/ditafsirkan lain):
- Risiko Rendah (Hijau): kapal sehat dengan jawaban "NO" pada Maritime Declaration of Health (MDH) dan masa berlaku dokumen kesehatan lebih dari 3 bulan. COP dapat diterbitkan langsung tanpa pemeriksaan fisik.
- Risiko Sedang (Kuning): kapal sehat (jawaban MDH "NO") tetapi masa berlaku dokumen kesehatan kurang dari 3 bulan. Pemeriksaan fisik WAJIB dilakukan petugas saat kapal bersandar.
- Risiko Tinggi (Merah): kapal terjangkit penyakit, memiliki faktor risiko, jawaban MDH "YES", atau dokumen tidak berlaku. Pemeriksaan lanjutan WAJIB dilakukan di zona karantina.

JUMLAH KAPAL PER KLASIFIKASI RBA (${data.labelPeriode}):
${formatBreakdownList(data.breakdown)}
Total kapal periode ini: ${data.totalKapal}

TUGAS KHUSUS untuk field "rekomendasi": sebutkan secara eksplisit jumlah kapal Risiko Tinggi (Merah) yang ada, lalu jelaskan implikasinya sesuai definisi baku di atas (pemeriksaan lanjutan di zona karantina); kemudian sebutkan jumlah kapal Risiko Sedang (Kuning), lalu implikasinya (pemeriksaan fisik wajib saat bersandar). Kalau salah satu klasifikasi jumlahnya 0, sebutkan itu juga apa adanya.

${ATURAN_UMUM_BREAKDOWN}`;
}

export function susunPromptNegaraAsal(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis asal negara kedatangan kapal untuk periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}.

${DAFTAR_SUMBER_RUJUKAN}

JUMLAH KAPAL PER NEGARA KEDATANGAN (${data.labelPeriode}):
${formatBreakdownList(data.breakdown)}
Total kapal periode ini: ${data.totalKapal}

TUGAS KHUSUS: identifikasi negara dengan jumlah kedatangan kapal TERBANYAK dari data di atas. Kaitkan dengan pengetahuan umum kesehatan masyarakat global yang sudah mapan tentang penyakit menular yang endemis/rawan/sedang berkembang di negara tersebut (mis. pola historis dengue, flu burung/avian influenza, kolera, atau penyakit menular lain yang UMUM diketahui berasosiasi dengan negara itu berdasarkan DAFTAR SUMBER RUJUKAN di atas) -- BUKAN klaim kejadian wabah spesifik terbaru yang tidak bisa kamu pastikan kebenarannya karena kamu tidak punya akses data real-time. Tegaskan secara eksplisit di bagian "anomali" bahwa ini adalah konteks pengetahuan umum epidemiologi, BUKAN data surveilans real-time, dan sarankan verifikasi ke sumber rujukan resmi (WHO DON, CDC THN, atau setara) sebelum dipakai sebagai dasar keputusan operasional.

${ATURAN_UMUM_BREAKDOWN}`;
}

export function susunPromptPrediksiRba(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: membuat PREDIKSI konsekuensi kekarantinaan kesehatan untuk klasifikasi risiko (RBA) kapal periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}, KHUSUS untuk kapal Risiko Tinggi (Merah) dan Sedang (Kuning) yang BELUM/TIDAK dilakukan pemeriksaan sesuai prosedur.

DEFINISI BAKU RBA (rujukan resmi, JANGAN diubah/ditafsirkan lain):
- Risiko Rendah (Hijau): kapal sehat, MDH "NO", dokumen kesehatan berlaku > 3 bulan. COP dapat diterbitkan langsung tanpa pemeriksaan fisik.
- Risiko Sedang (Kuning): kapal sehat (MDH "NO") tetapi dokumen kesehatan berlaku < 3 bulan. Pemeriksaan fisik WAJIB saat kapal bersandar.
- Risiko Tinggi (Merah): kapal terjangkit penyakit, ada faktor risiko, MDH "YES", atau dokumen tidak berlaku. Pemeriksaan lanjutan WAJIB di zona karantina.

${DAFTAR_SUMBER_RUJUKAN}

JUMLAH KAPAL PER KLASIFIKASI RBA (${data.labelPeriode}):
${formatBreakdownList(data.breakdown)}
Total kapal periode ini: ${data.totalKapal}

TUGAS KHUSUS untuk field "ringkasan" dan "anomali": proyeksikan KONSEKUENSI KESEHATAN MASYARAKAT jika kapal Risiko Tinggi (Merah) dan Risiko Sedang (Kuning) pada data di atas TIDAK menjalani pemeriksaan sesuai definisi baku RBA -- mis. potensi lolosnya penumpang/ABK/vektor/barang terjangkit penyakit menular ke wilayah kerja, tanpa mengarang penyakit spesifik yang tidak berdasar. Nyatakan proyeksi ini sebagai skenario risiko KUALITATIF berbasis definisi RBA & jumlah kapal, BUKAN prediksi statistik -- karena data yang tersedia hanya jumlah kapal per klasifikasi, bukan riwayat kejadian penularan.
TUGAS KHUSUS untuk field "rekomendasi": tindakan pencegahan konkret yang HARUS dilakukan sekarang terhadap kapal Merah & Kuning yang ada, berbasis definisi baku RBA di atas.

${ATURAN_UMUM_BREAKDOWN}`;
}

export function susunPromptFaktorRisiko(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis temuan faktor risiko pada kapal untuk periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}.

JUMLAH KAPAL PER STATUS FAKTOR RISIKO (${data.labelPeriode}):
${formatBreakdownList(data.breakdown)}
Total kapal periode ini: ${data.totalKapal}

TUGAS KHUSUS untuk field "rekomendasi": KALAU ada kapal dengan faktor risiko DITEMUKAN (bukan "Tidak Ditemukan"), sebutkan jumlahnya secara eksplisit lalu berikan rekomendasi tindak lanjut yang sesuai (mis. pemeriksaan lanjutan, koordinasi dengan wilayah kerja terkait, pemantauan ketat). KALAU semua kapal berstatus "Tidak Ditemukan" atau data kosong, nyatakan itu apa adanya sebagai kondisi aman, tanpa mengarang rekomendasi yang tidak perlu.

${ATURAN_UMUM_BREAKDOWN}`;
}

export function susunPromptPrediksiNegaraAsal(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: membuat PREDIKSI risiko penyebaran penyakit menular ke wilayah kerja BKK Samarinda, berdasarkan pola negara kedatangan kapal periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}, SEANDAINYA pemeriksaan kekarantinaan kesehatan (RBA, MDH, faktor risiko) TIDAK dijalankan sesuai prosedur pada kapal-kapal dari negara tersebut.

${DAFTAR_SUMBER_RUJUKAN}

JUMLAH KAPAL PER NEGARA KEDATANGAN (${data.labelPeriode}):
${formatBreakdownList(data.breakdown)}
Total kapal periode ini: ${data.totalKapal}

TUGAS KHUSUS untuk field "ringkasan": identifikasi 1-3 negara kedatangan TERBANYAK dari data di atas, lalu jelaskan penyakit menular yang UMUM diketahui endemis/berisiko di negara tersebut (rujuk DAFTAR SUMBER RUJUKAN, JANGAN mengarang wabah spesifik terbaru yang tidak bisa kamu pastikan).
TUGAS KHUSUS untuk field "anomali": proyeksikan skenario risiko KUALITATIF -- potensi jalur introduksi penyakit ke Indonesia lewat pelabuhan/wilayah kerja ini jika pemeriksaan tidak dijalankan pada kapal dari negara berisiko tersebut. Nyatakan EKSPLISIT bahwa ini adalah skenario risiko kualitatif berbasis pengetahuan epidemiologi umum & jumlah kapal, BUKAN prediksi statistik dan BUKAN klaim ada penularan aktual, karena data yang tersedia hanya jumlah kedatangan kapal, bukan hasil pemeriksaan kesehatan individual.
TUGAS KHUSUS untuk field "rekomendasi": langkah cegah tangkal konkret yang perlu diprioritaskan untuk kapal dari negara-negara berisiko tersebut (mis. pemeriksaan MDH lebih ketat, koordinasi KKP/BKK terkait, kewaspadaan petugas di titik masuk).

${ATURAN_UMUM_BREAKDOWN}`;
}

const STANDAR_VEKTOR_DBD = `STANDAR BAKU MUTU VEKTOR AEDES (rujukan resmi, JANGAN diubah/ditafsirkan lain):
- ABJ (Angka Bebas Jentik) AMAN bila >= 95% (Permenkes No. 50 Tahun 2017 tentang Standar Baku Mutu Kesehatan Lingkungan dan Persyaratan Kesehatan untuk Vektor dan Binatang Pembawa Penyakit). Di bawah 95% berarti risiko penularan DBD meningkat.
- HI (House Index) WHO: ideal < 1%, kategori AMAN < 5%. HI >= 5% menandakan kepadatan vektor tinggi.
- BI (Breteau Index) klasifikasi risiko WHO: < 5 = RENDAH, 5-50 = SEDANG, > 50 = TINGGI penularan DBD.
- CI (Container Index) tinggi menunjukkan banyak kontainer/wadah air berpotensi jadi tempat perkembangbiakan jentik.
- Untuk wilayah kerja pelabuhan/bandara, pengendalian vektor mengacu juga pada IHR (2005) Annex 1B dan WHO Guide to Vector Surveillance and Control at Ports, Airports and Ground Crossings -- kewajiban menjaga area bebas vektor penular penyakit karantina di titik masuk negara (point of entry).`;

export function susunPromptVektor(data: DataAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis khusus untuk grafik "${data.labelKonteks}" di wilayah kerja: ${data.labelWilayah}, periode: ${data.labelPeriodeSaatIni}.

${STANDAR_VEKTOR_DBD}

DATA PERIODE BERJALAN (${data.labelPeriodeSaatIni}) -- HANYA metrik yang relevan dengan grafik ini:
${formatRingkasan(data.ringkasanSaatIni)}

DATA PERIODE SEBELUMNYA (${data.labelPeriodeSebelumnya}):
${formatRingkasan(data.ringkasanSebelumnya)}

BREAKDOWN ZONA PERIODE BERJALAN (konteks tambahan, bukan fokus utama):
${data.topKategori.length > 0 ? data.topKategori.map((k) => `- ${k.nilai}: ${k.jumlah} titik survei`).join('\n') : '(tidak ada data zona untuk periode ini)'}

ATURAN WAJIB:
- FOKUS HANYA pada metrik yang ada di "DATA PERIODE BERJALAN" di atas -- JANGAN membahas indikator lain yang tidak tercantum di sana (mis. kalau data yang diberikan hanya soal Larvasida, JANGAN membahas HI/CI/ABJ).
- HANYA gunakan angka yang benar-benar ada di atas. JANGAN mengarang angka.
- Kalau metrik yang relevan menyertakan HI/CI/BI/ABJ, bandingkan dengan standar baku mutu di atas -- sebutkan AMAN/WASPADA/BAHAYA. Kalau metrik bukan HI/CI/BI/ABJ (mis. Larvasida, Rumah Diperiksa), fokus pada tren naik/turun & efektivitas cakupan kegiatan, bukan ambang batas baku mutu yang tidak relevan untuk metrik itu.
- Bandingkan periode berjalan vs sebelumnya secara kuantitatif (naik/turun berapa unit/persen).
- Tulis dalam Bahasa Indonesia, istilah baku bila relevan.
- Analisis ini KHUSUS wilayah kerja ${data.labelWilayah} -- jangan digeneralisasi ke wilker lain.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick) dengan PERSIS 3 field:
{
  "ringkasan": "ringkasan kondisi metrik grafik ini periode berjalan, 2-4 kalimat",
  "anomali": "deteksi anomali/lonjakan pada metrik ini dibanding periode sebelumnya, atau nyatakan aman",
  "rekomendasi": "rekomendasi tindak lanjut singkat khusus metrik ini, 1-3 poin, berbasis angka di atas"
}`;
}

export function susunPromptPrediksiVektor(data: DataAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: membuat PREDIKSI tren untuk grafik "${data.labelKonteks}" di wilayah kerja: ${data.labelWilayah}, untuk periode SETELAH ${data.labelPeriodeSaatIni}.

${STANDAR_VEKTOR_DBD}

DATA PERIODE BERJALAN (${data.labelPeriodeSaatIni}) -- HANYA metrik yang relevan dengan grafik ini:
${formatRingkasan(data.ringkasanSaatIni)}

DATA PERIODE SEBELUMNYA (${data.labelPeriodeSebelumnya}), untuk menghitung arah tren:
${formatRingkasan(data.ringkasanSebelumnya)}

BREAKDOWN ZONA PERIODE BERJALAN (konteks tambahan, bukan fokus utama):
${data.topKategori.length > 0 ? data.topKategori.map((k) => `- ${k.nilai}: ${k.jumlah} titik survei`).join('\n') : '(tidak ada data zona untuk periode ini)'}

ATURAN WAJIB:
- Kamu HANYA punya 2 titik data (periode berjalan & periode sebelumnya) -- JANGAN berpura-pura punya data historis panjang. Prediksi harus EKSPLISIT dinyatakan sebagai ekstrapolasi linear sederhana dari 2 titik ini, BUKAN model time-series yang canggih.
- HANYA gunakan angka yang benar-benar ada di atas untuk menghitung arah & besar perubahan (naik/turun berapa unit/persen antar 2 periode itu), lalu proyeksikan arah yang sama untuk periode berikutnya. JANGAN mengarang angka prediksi yang tidak berdasar dari 2 titik data ini.
- FOKUS HANYA pada metrik yang ada di "DATA PERIODE BERJALAN" -- jangan membahas indikator lain yang tidak tercantum di sana.
- Kalau metrik yang relevan menyertakan HI/CI/BI/ABJ, kaitkan proyeksi dengan ambang batas baku mutu di atas (apakah proyeksinya akan AMAN/WASPADA/BAHAYA kalau tren berlanjut).
- SELALU nyatakan tingkat ketidakpastian prediksi ini secara eksplisit di field "anomali" (data cuma 2 titik, bukan model statistik formal).
- Tulis dalam Bahasa Indonesia, istilah baku bila relevan.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick) dengan PERSIS 3 field:
{
  "ringkasan": "prediksi arah tren metrik ini untuk periode berikutnya berdasarkan 2 titik data di atas, 2-4 kalimat, sebutkan angka proyeksi perkiraan",
  "anomali": "batasan & tingkat ketidakpastian prediksi ini (data terbatas, bukan model formal), plus hal yang perlu diwaspadai kalau tren berlanjut",
  "rekomendasi": "rekomendasi tindak lanjut pencegahan berbasis proyeksi tren ini, 1-3 poin"
}`;
}

/* =========================================================================
 * MODUL PHQC -- DAERAH ASAL (PELABUHAN KEDATANGAN)
 * Direvisi: "daerah asal" di PHQC direpresentasikan lewat kategori
 * pelabuhan_kedatangan (BUKAN kolom negara terpisah -- kolom itu tidak
 * ada di skema). Nilainya bisa nama pelabuhan DALAM NEGERI atau LUAR
 * NEGERI, jadi prompt mengarahkan AI menilai dulu domestik/internasional
 * sebelum memutuskan sumber rujukan mana yang relevan.
 * ======================================================================= */

export function susunPromptPhqcDaerahAsal(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis daerah asal kapal berdasarkan pelabuhan kedatangan (kegiatan PHQC) untuk periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}.

${DAFTAR_SUMBER_RUJUKAN}

JUMLAH KAPAL PER PELABUHAN KEDATANGAN (${data.labelPeriode}):
${formatBreakdownList(data.breakdown, 'kapal')}
Total kapal periode ini: ${data.totalKapal}

TUGAS KHUSUS: identifikasi pelabuhan kedatangan dengan jumlah kapal TERBANYAK dari data di atas. Untuk SETIAP pelabuhan yang kamu bahas, tentukan dulu apakah itu pelabuhan DALAM NEGERI (domestik, Indonesia) atau LUAR NEGERI (internasional) berdasarkan namanya:
- Kalau DALAM NEGERI: kaitkan dengan pola penyakit menular endemis antar-wilayah di Indonesia yang sudah mapan (mis. dengue, leptospirosis, diare, penyakit yang tercakup SKDR Kemenkes) -- fokus pada risiko transmisi antar-pulau/antar-provinsi, BUKAN kerangka lintas negara.
- Kalau LUAR NEGERI: kaitkan dengan pengetahuan umum kesehatan masyarakat global tentang penyakit menular yang endemis/rawan/sedang berkembang di negara tersebut, rujuk DAFTAR SUMBER RUJUKAN di atas.
- JANGAN mengarang kejadian wabah spesifik terbaru yang tidak bisa kamu pastikan kebenarannya. Tegaskan eksplisit di "anomali" bahwa ini pengetahuan umum epidemiologi, BUKAN data surveilans real-time, dan sarankan verifikasi ke sumber rujukan resmi yang sesuai (SKDR Kemenkes untuk domestik, WHO/CDC/ECDC untuk internasional).

${ATURAN_UMUM_BREAKDOWN}`;
}

export function susunPromptPrediksiPhqcDaerahAsal(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: membuat PREDIKSI risiko penyebaran penyakit menular ke wilayah kerja BKK Samarinda, berdasarkan pola pelabuhan kedatangan kapal (PHQC) periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}, SEANDAINYA pemeriksaan kekarantinaan kesehatan TIDAK dijalankan sesuai prosedur untuk kapal dari pelabuhan-pelabuhan tersebut.

${DAFTAR_SUMBER_RUJUKAN}

JUMLAH KAPAL PER PELABUHAN KEDATANGAN (${data.labelPeriode}):
${formatBreakdownList(data.breakdown, 'kapal')}
Total kapal periode ini: ${data.totalKapal}

TUGAS KHUSUS untuk field "ringkasan": identifikasi 1-3 pelabuhan kedatangan TERBANYAK. Untuk tiap pelabuhan, tentukan dulu domestik atau luar negeri (dari namanya), lalu jelaskan penyakit menular yang relevan -- pola endemis antar-wilayah Indonesia (rujuk SKDR Kemenkes) untuk pelabuhan domestik, atau penyakit yang UMUM diketahui endemis/berkembang di negara asal (rujuk DAFTAR SUMBER RUJUKAN) untuk pelabuhan luar negeri. Jangan mengarang wabah spesifik terbaru.
TUGAS KHUSUS untuk field "anomali": proyeksikan skenario risiko KUALITATIF -- potensi jalur introduksi/penyebaran penyakit ke wilayah kerja lewat kapal dari pelabuhan tersebut jika pemeriksaan tidak dijalankan. Nyatakan EKSPLISIT ini skenario risiko kualitatif, BUKAN prediksi statistik dan BUKAN klaim penularan aktual, karena data hanya jumlah kapal per pelabuhan asal, bukan hasil pemeriksaan kesehatan individual.
TUGAS KHUSUS untuk field "rekomendasi": langkah cegah tangkal konkret untuk kapal dari pelabuhan berisiko tersebut (mis. pemeriksaan dokumen kesehatan lebih ketat, koordinasi dengan KKP/dinas kesehatan setempat untuk pelabuhan domestik, kewaspadaan petugas untuk pelabuhan luar negeri).

${ATURAN_UMUM_BREAKDOWN}`;
}

/* =========================================================================
 * MODUL PELABUHAN KEDATANGAN & TUJUAN GABUNGAN (PHQC)
 * Untuk grafik tren tahunan gabungan (bukan analisis "asal" per kapal
 * seperti di atas, tapi pola lalu lintas pelabuhan kedatangan+tujuan
 * secara keseluruhan) -- konteks phqc-pelabuhan-mingguan/bulanan yang
 * sudah dipasang di UI (PanelAnalisisAI) tapi belum ada backend-nya.
 * ======================================================================= */

export function susunPromptPelabuhanPhqc(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis pola lalu lintas pelabuhan kedatangan & tujuan kapal (kegiatan PHQC) untuk periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}.

${DAFTAR_SUMBER_RUJUKAN}

JUMLAH KAPAL PER PELABUHAN (KEDATANGAN & TUJUAN DIGABUNG, diberi label "Kedatangan: ..." / "Tujuan: ...") (${data.labelPeriode}):
${formatBreakdownList(data.breakdown, 'kapal')}
Total kapal periode ini: ${data.totalKapal}

TUGAS KHUSUS: identifikasi pelabuhan kedatangan TERSIBUK dan pelabuhan tujuan TERSIBUK secara terpisah dari data di atas (perhatikan prefiks "Kedatangan:"/"Tujuan:"). Bahas pola lalu lintas -- apakah didominasi rute domestik atau internasional (nilai dari pelabuhan luar negeri) -- dan implikasinya untuk beban kerja pemeriksaan kekarantinaan kesehatan di masing-masing titik. Kalau ada pelabuhan luar negeri dengan volume signifikan, sebutkan relevansi penyakit menular umum di sana (rujuk DAFTAR SUMBER RUJUKAN), TANPA mengarang wabah spesifik terbaru.

${ATURAN_UMUM_BREAKDOWN}`;
}

/* =========================================================================
 * MODUL JUMLAH PENUMPANG KEBERANGKATAN (PHQC)
 * CATATAN: data phqc yang ada HANYA mencatat penumpang KEBERANGKATAN
 * (PHQC diterbitkan saat kapal akan berlayar/berangkat) -- tidak ada
 * data penumpang kedatangan terpisah di sistem saat ini. Prompt & label
 * disesuaikan supaya tidak mengklaim data yang tidak ada.
 * ======================================================================= */

export function susunPromptPenumpang(data: DataAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis volume penumpang KEBERANGKATAN untuk konteks: ${data.labelKonteks}, wilayah: ${data.labelWilayah}, periode: ${data.labelPeriodeSaatIni}.

DATA PERIODE BERJALAN (${data.labelPeriodeSaatIni}):
${formatRingkasan(data.ringkasanSaatIni)}

DATA PERIODE SEBELUMNYA (${data.labelPeriodeSebelumnya}), untuk pembanding tren:
${formatRingkasan(data.ringkasanSebelumnya)}

ATURAN WAJIB:
- Data ini KHUSUS penumpang KEBERANGKATAN (PHQC diterbitkan saat kapal akan berlayar) -- JANGAN membahas atau mengasumsikan ada data penumpang kedatangan, karena itu tidak tersedia di sistem saat ini.
- HANYA gunakan angka yang benar-benar ada di atas. JANGAN mengarang angka.
- Bandingkan periode berjalan vs sebelumnya secara kuantitatif (naik/turun berapa persen atau unit), termasuk komposisi WNA vs WNI bila datanya ada.
- Kaitkan lonjakan volume penumpang (bila ada) dengan implikasi operasional kekarantinaan kesehatan: beban kerja pemeriksaan dokumen/skrining sebelum keberangkatan, risiko penumpukan/kerumunan yang mempermudah penularan penyakit menular langsung (mis. droplet), dan kebutuhan sumber daya petugas -- TANPA mengklaim ada kejadian penularan aktual yang tidak didukung data.
- Tulis dalam Bahasa Indonesia, istilah baku bila relevan.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick) dengan PERSIS 3 field:
{
  "ringkasan": "ringkasan tren volume penumpang keberangkatan periode berjalan, 2-4 kalimat",
  "anomali": "deteksi lonjakan/penurunan tidak wajar dibanding periode sebelumnya, atau nyatakan aman",
  "rekomendasi": "rekomendasi kesiapan operasional kekarantinaan kesehatan berbasis volume ini, 1-3 poin"
}`;
}

export function susunPromptPrediksiPenumpang(data: DataAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: membuat PREDIKSI tren volume penumpang KEBERANGKATAN untuk konteks: ${data.labelKonteks}, wilayah: ${data.labelWilayah}, untuk periode SETELAH ${data.labelPeriodeSaatIni}.

DATA PERIODE BERJALAN (${data.labelPeriodeSaatIni}):
${formatRingkasan(data.ringkasanSaatIni)}

DATA PERIODE SEBELUMNYA (${data.labelPeriodeSebelumnya}), untuk menghitung arah tren:
${formatRingkasan(data.ringkasanSebelumnya)}

ATURAN WAJIB:
- Data ini KHUSUS penumpang KEBERANGKATAN -- JANGAN membahas/mengasumsikan data kedatangan, karena tidak tersedia.
- Kamu HANYA punya 2 titik data -- prediksi harus EKSPLISIT dinyatakan sebagai ekstrapolasi linear sederhana, BUKAN model time-series canggih.
- Hitung arah & besar perubahan dari 2 titik itu, lalu proyeksikan volume periode berikutnya. JANGAN mengarang angka.
- Kaitkan proyeksi kenaikan volume (bila ada) dengan kebutuhan kesiapan operasional (jumlah petugas skrining sebelum keberangkatan, potensi antrean/kerumunan yang meningkatkan risiko penularan penyakit menular langsung).
- SELALU nyatakan tingkat ketidakpastian prediksi ini secara eksplisit (data cuma 2 titik).
- Tulis dalam Bahasa Indonesia, istilah baku bila relevan.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick) dengan PERSIS 3 field:
{
  "ringkasan": "prediksi arah tren volume penumpang keberangkatan periode berikutnya berdasarkan 2 titik data di atas, 2-4 kalimat, sebutkan angka proyeksi perkiraan",
  "anomali": "batasan & tingkat ketidakpastian prediksi ini, plus hal yang perlu diwaspadai kalau tren berlanjut",
  "rekomendasi": "rekomendasi kesiapan operasional berbasis proyeksi tren ini, 1-3 poin"
}`;
}

// TAMBAHKAN ke lib/ai/prompt.ts (dekat susunPromptPenumpang, gaya sama persis)

export function susunPromptGlobalEmerging(data: DataAnalisis): string {
  const topKategoriTeks = data.topKategori
    .map((k) => `- ${k.kategori === 'penyakit' ? 'Penyakit' : 'Negara'}: ${k.nilai} — ${k.jumlah} kasus`)
    .join('\n');

  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis tren penyakit infeksi emerging untuk konteks: ${data.labelKonteks}, cakupan: ${data.labelWilayah}, periode: ${data.labelPeriodeSaatIni}.

DATA PERIODE BERJALAN (${data.labelPeriodeSaatIni}):
${formatRingkasan(data.ringkasanSaatIni)}

DATA PERIODE SEBELUMNYA (${data.labelPeriodeSebelumnya}), untuk pembanding tren:
${formatRingkasan(data.ringkasanSebelumnya)}

RINCIAN PER PENYAKIT & NEGARA (periode berjalan):
${topKategoriTeks || '(tidak ada data)'}

ATURAN WAJIB:
- Data ini mencakup 12 penyakit infeksi emerging yang dipantau dari 13 negara asal kapal ke wilayah kerja BKK Kelas I Samarinda (data surveilans global sebagai early warning, BUKAN data kasus terkonfirmasi di Indonesia/Samarinda).
- HANYA gunakan angka yang benar-benar ada di atas. JANGAN mengarang angka atau nama penyakit/negara yang tidak tercantum.
- Bandingkan total kasus & kematian periode berjalan vs sebelumnya secara kuantitatif (naik/turun berapa persen atau unit).
- Soroti penyakit atau negara dengan lonjakan kasus paling signifikan, kaitkan dengan implikasi kewaspadaan kekarantinaan kesehatan terhadap kapal dari negara tersebut (skrining ABK/penumpang, kesiapan APD, koordinasi RBA kapal) -- TANPA mengklaim ada kasus terkonfirmasi di wilayah kerja Samarinda kalau datanya tidak ada.
- Tulis dalam Bahasa Indonesia, istilah epidemiologi baku bila relevan.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick) dengan PERSIS 3 field:
{
  "ringkasan": "ringkasan tren kasus & kematian penyakit infeksi emerging periode berjalan, 2-4 kalimat",
  "anomali": "deteksi lonjakan/penurunan tidak wajar dibanding periode sebelumnya per penyakit/negara, atau nyatakan aman",
  "rekomendasi": "rekomendasi kewaspadaan kekarantinaan kesehatan berbasis data ini, 1-3 poin"
}`;
}

export function susunPromptPrediksiGlobalEmerging(data: DataAnalisis): string {
  const topKategoriTeks = data.topKategori
    .map((k) => `- ${k.kategori === 'penyakit' ? 'Penyakit' : 'Negara'}: ${k.nilai} — ${k.jumlah} kasus`)
    .join('\n');

  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: proyeksi/prediksi tren penyakit infeksi emerging untuk periode BERIKUTNYA, berdasarkan data historis, untuk konteks: ${data.labelKonteks}, cakupan: ${data.labelWilayah}.

DATA PERIODE BERJALAN (${data.labelPeriodeSaatIni}):
${formatRingkasan(data.ringkasanSaatIni)}

DATA PERIODE SEBELUMNYA (${data.labelPeriodeSebelumnya}):
${formatRingkasan(data.ringkasanSebelumnya)}

RINCIAN PER PENYAKIT & NEGARA (periode berjalan):
${topKategoriTeks || '(tidak ada data)'}

ATURAN WAJIB:
- HANYA gunakan angka yang benar-benar ada di atas sebagai dasar proyeksi. JANGAN mengarang angka.
- Proyeksi harus berbasis tren dua periode ini (naik/turun/stabil) -- jangan klaim kepastian, gunakan bahasa probabilistik ("kemungkinan", "berpotensi").
- Fokuskan proyeksi pada penyakit/negara dengan tren kenaikan paling jelas.
- Sertakan tindakan antisipatif kekarantinaan kesehatan yang relevan untuk kapal dari negara berisiko tersebut.
- Tulis dalam Bahasa Indonesia.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick) dengan PERSIS 3 field:
{
  "ringkasan": "kondisi saat ini berdasarkan data, 2-3 kalimat",
  "anomali": "proyeksi/perkiraan kondisi periode berikutnya jika tren berlanjut, 2-3 kalimat",
  "rekomendasi": "tindakan antisipatif yang perlu dilakukan sekarang, 1-3 poin"
}`;
}

/* =========================================================================
 * MODUL KEGIATAN PESAWAT -- DAERAH ASAL & PENYAKIT SEDANG BERKEMBANG
 * (paralel dengan cop-negara-asal/phqc-daerah-asal, untuk grafik daerah
 * asal penerbangan pada modul Alat Angkut Pesawat.)
 * ======================================================================= */

export function susunPromptPesawatDaerahAsal(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis daerah/negara asal penerbangan (kegiatan pesawat) untuk periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}.

${DAFTAR_SUMBER_RUJUKAN}

JUMLAH PENERBANGAN PER DAERAH/NEGARA ASAL (${data.labelPeriode}):
${formatBreakdownList(data.breakdown, 'penerbangan')}
Total penerbangan periode ini: ${data.totalKapal}

TUGAS KHUSUS: identifikasi daerah/negara asal penerbangan TERBANYAK dari data di atas. Kaitkan dengan penyakit menular yang UMUM diketahui SEDANG BERKEMBANG/endemis di daerah/negara tersebut, merujuk DAFTAR SUMBER RUJUKAN di atas -- BUKAN klaim wabah spesifik terbaru yang tidak bisa kamu pastikan. Tegaskan eksplisit di "anomali" bahwa ini pengetahuan umum epidemiologi, BUKAN data surveilans real-time, dan sarankan verifikasi ke sumber rujukan resmi sebelum jadi dasar keputusan operasional.

${ATURAN_UMUM_BREAKDOWN}`;
}

export function susunPromptPrediksiPesawatDaerahAsal(data: DataBreakdownAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: membuat PREDIKSI risiko penyebaran penyakit menular ke wilayah kerja BKK Samarinda lewat jalur udara, berdasarkan pola daerah/negara asal penerbangan periode ${data.labelPeriode}, wilayah: ${data.labelWilayah}, SEANDAINYA pemeriksaan kekarantinaan kesehatan pesawat (General Declaration, Aircraft Health Part) TIDAK dijalankan sesuai prosedur untuk penerbangan dari daerah/negara tersebut.

${DAFTAR_SUMBER_RUJUKAN}

JUMLAH PENERBANGAN PER DAERAH/NEGARA ASAL (${data.labelPeriode}):
${formatBreakdownList(data.breakdown, 'penerbangan')}
Total penerbangan periode ini: ${data.totalKapal}

TUGAS KHUSUS untuk field "ringkasan": identifikasi 1-3 daerah/negara asal penerbangan TERBANYAK, lalu jelaskan penyakit menular yang UMUM diketahui sedang berkembang/endemis di sana (rujuk DAFTAR SUMBER RUJUKAN, jangan mengarang wabah spesifik terbaru).
TUGAS KHUSUS untuk field "anomali": proyeksikan skenario risiko KUALITATIF -- potensi jalur introduksi penyakit lewat penerbangan dari daerah/negara tersebut jika pemeriksaan kekarantinaan pesawat tidak dijalankan. Nyatakan EKSPLISIT ini skenario risiko kualitatif, BUKAN prediksi statistik dan BUKAN klaim penularan aktual, karena data hanya jumlah penerbangan per asal, bukan hasil pemeriksaan kesehatan individual/pesawat.
TUGAS KHUSUS untuk field "rekomendasi": langkah cegah tangkal konkret untuk penerbangan dari daerah/negara berisiko tersebut (mis. pemeriksaan General Declaration lebih ketat, koordinasi dengan otoritas bandara/maskapai, kesiapsiagaan tim gerak cepat).

${ATURAN_UMUM_BREAKDOWN}`;
}

/* =========================================================================
 * MODUL ALAT ANGKUT PESAWAT -- TREN CREW/PENUMPANG, SERTIFIKAT, CREW
 * (konteks pesawat-mingguan/pesawat-bulanan + parameter `metrik` yang
 * menentukan kolom mana yang relevan -- pola sama seperti vektor DBD.
 * BEDA dengan susunPromptPesawatDaerahAsal di atas: itu untuk breakdown
 * per pelabuhan/negara asal (belum dipakai UI saat ini), sedangkan yang
 * di bawah ini untuk grafik TREN crew/penumpang/sertifikat yang SUDAH
 * dipakai di halaman Alat Angkut Pesawat sekarang.
 * ======================================================================= */

export function susunPromptPesawatTren(data: DataAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: analisis khusus untuk grafik "${data.labelKonteks}", wilayah: ${data.labelWilayah}, periode: ${data.labelPeriodeSaatIni}.

DATA PERIODE BERJALAN (${data.labelPeriodeSaatIni}) -- HANYA metrik yang relevan dengan grafik ini:
${formatRingkasan(data.ringkasanSaatIni)}

DATA PERIODE SEBELUMNYA (${data.labelPeriodeSebelumnya}), untuk pembanding tren:
${formatRingkasan(data.ringkasanSebelumnya)}

ATURAN WAJIB:
- FOKUS HANYA pada metrik yang ada di "DATA PERIODE BERJALAN" -- JANGAN membahas indikator lain yang tidak tercantum di sana (mis. kalau datanya cuma soal Sertifikat, JANGAN membahas jumlah crew/penumpang).
- HANYA gunakan angka yang benar-benar ada di atas. JANGAN mengarang angka.
- Kalau metriknya sertifikat kesehatan (SKLT/TD Laik/IAOS/KIER/Jenazah), kaitkan lonjakan jumlah dengan implikasi beban kerja pemeriksaan kesehatan penerbangan & kebutuhan kesiapsiagaan petugas -- SKLT (Surat Keterangan Laik Terbang) dan TD Laik relevan dengan kelaikan kesehatan penumpang/crew untuk terbang, IAOS & KIER relevan dengan pengawasan sanitasi pesawat, Jenazah relevan dengan prosedur karantina jenazah.
- Kalau metriknya crew/penumpang, bandingkan arus datang vs berangkat, dan kaitkan lonjakan dengan beban kerja skrining kesehatan serta risiko penumpukan/kerumunan di titik pemeriksaan.
- Bandingkan periode berjalan vs sebelumnya secara kuantitatif (naik/turun berapa unit/persen).
- Tulis dalam Bahasa Indonesia, istilah baku bila relevan.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick) dengan PERSIS 3 field:
{
  "ringkasan": "ringkasan kondisi metrik grafik ini periode berjalan, 2-4 kalimat",
  "anomali": "deteksi anomali/lonjakan pada metrik ini dibanding periode sebelumnya, atau nyatakan aman",
  "rekomendasi": "rekomendasi tindak lanjut singkat khusus metrik ini, 1-3 poin, berbasis angka di atas"
}`;
}

export function susunPromptPrediksiPesawatTren(data: DataAnalisis): string {
  return `${PERSONA_EPIDEMIOLOG}

TUGAS SAAT INI: membuat PREDIKSI tren untuk grafik "${data.labelKonteks}", wilayah: ${data.labelWilayah}, untuk periode SETELAH ${data.labelPeriodeSaatIni}.

DATA PERIODE BERJALAN (${data.labelPeriodeSaatIni}) -- HANYA metrik yang relevan dengan grafik ini:
${formatRingkasan(data.ringkasanSaatIni)}

DATA PERIODE SEBELUMNYA (${data.labelPeriodeSebelumnya}), untuk menghitung arah tren:
${formatRingkasan(data.ringkasanSebelumnya)}

ATURAN WAJIB:
- Kamu HANYA punya 2 titik data -- prediksi harus EKSPLISIT dinyatakan sebagai ekstrapolasi linear sederhana, BUKAN model time-series canggih.
- FOKUS HANYA pada metrik yang ada di "DATA PERIODE BERJALAN" -- jangan membahas indikator lain yang tidak tercantum di sana.
- Hitung arah & besar perubahan dari 2 titik itu, lalu proyeksikan periode berikutnya. JANGAN mengarang angka.
- Kaitkan proyeksi kenaikan (bila ada) dengan kebutuhan kesiapan operasional yang sesuai jenis metriknya (jumlah petugas skrining kesehatan untuk crew/penumpang, atau kapasitas pemeriksaan sertifikat kesehatan penerbangan untuk metrik sertifikat).
- SELALU nyatakan tingkat ketidakpastian prediksi ini secara eksplisit (data cuma 2 titik).
- Tulis dalam Bahasa Indonesia, istilah baku bila relevan.

Balas HANYA dengan JSON valid (tanpa markdown, tanpa backtick) dengan PERSIS 3 field:
{
  "ringkasan": "prediksi arah tren metrik ini untuk periode berikutnya berdasarkan 2 titik data di atas, 2-4 kalimat, sebutkan angka proyeksi perkiraan",
  "anomali": "batasan & tingkat ketidakpastian prediksi ini (data terbatas, bukan model formal), plus hal yang perlu diwaspadai kalau tren berlanjut",
  "rekomendasi": "rekomendasi tindak lanjut pencegahan berbasis proyeksi tren ini, 1-3 poin"
}`;
}

/**
 * Provider tertentu (mis. Gemini dengan responseMimeType json, atau
 * OpenAI-compatible dengan response_format json_object) SEHARUSNYA
 * sudah mengembalikan JSON murni. Tapi beberapa provider gratis suka
 * membungkusnya dengan ```json ... ``` -- fungsi ini menangani kedua
 * kemungkinan itu supaya parsing tidak rapuh.
 */
export function parseHasilAi(teksMentah: string): HasilAnalisisAi {
  const bersih = teksMentah
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(bersih);
  } catch {
    throw new Error('Respons AI bukan JSON yang valid -- tidak bisa ditampilkan sebagai hasil analisis.');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).ringkasan !== 'string' ||
    typeof (parsed as Record<string, unknown>).anomali !== 'string' ||
    typeof (parsed as Record<string, unknown>).rekomendasi !== 'string'
  ) {
    throw new Error('Respons AI tidak memuat field ringkasan/anomali/rekomendasi yang lengkap.');
  }

  const hasil = parsed as HasilAnalisisAi;
  return {
    ringkasan: hasil.ringkasan.trim(),
    anomali: hasil.anomali.trim(),
    rekomendasi: hasil.rekomendasi.trim(),
  };
}