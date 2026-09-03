import { DAFTAR_PUSTAKA_KARHUTLA } from '@/lib/karhutla/daftar-pustaka';

function daftarPustakaUntukPrompt() {
  return DAFTAR_PUSTAKA_KARHUTLA.map((r) => `[${r.id}] ${r.sitasi}`).join('\n');
}

export function susunPromptLatarBelakangLaporan(ringkasanData: string, periodeLabel: string) {
  return `Anda seorang epidemiolog menulis Latar Belakang laporan surveilans Karhutla-ISPA periode ${periodeLabel}.
Gunakan HANYA referensi dari daftar berikut untuk sitasi (format [nomor]), JANGAN membuat referensi baru:
${daftarPustakaUntukPrompt()}

Ringkasan data periode ini:
${ringkasanData}

Tulis 3-4 paragraf akademik Bahasa Indonesia, jelaskan urgensi karhutla terhadap kualitas udara & ISPA, sertakan sitasi [nomor] yang relevan dari daftar di atas. Jangan menyertakan Daftar Pustaka di akhir (akan ditambahkan terpisah).`;
}

export function susunPromptPembahasanLaporan(ringkasanData: string, periodeLabel: string) {
  return `Anda seorang epidemiolog menulis bagian Pembahasan laporan surveilans Karhutla-ISPA periode ${periodeLabel}.
Gunakan HANYA referensi dari daftar berikut untuk sitasi (format [nomor]):
${daftarPustakaUntukPrompt()}

Data hasil analisis periode ini (JSON):
${ringkasanData}

Bahas SEMUA aspek berikut secara terintegrasi (jangan lewati satu pun, tapi hanya jika datanya tersedia dalam JSON di atas):
1. Tren dan sebaran titik panas (hotspot)
2. Tren kasus ISPA per wilayah kerja
3. Kualitas udara: PM2.5, PM10, suhu, HCHO, TVOC, dan kelembapan — bandingkan dengan ambang batas baku mutu yang relevan (rujuk sitasi yang sesuai)
4. Perbandingan data SKDR ISPA mingguan (minggu ini vs minggu lalu) per wilayah, apakah ada indikasi peningkatan/alert
5. Korelasi antar-indikator di atas (mis. apakah lonjakan titik panas diikuti kenaikan PM2.5 dan kasus ISPA/SKDR pada wilayah yang sama)

Tulis 5-6 paragraf akademik Bahasa Indonesia, sitasi [nomor] where relevan. Jangan mengarang angka yang tidak ada di data JSON.`;
}