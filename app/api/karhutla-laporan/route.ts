import { ImageRun } from 'docx';
import { buatGambarKurvaEpidemik, buatGambarGrafikHarian } from '@/lib/karhutla/chart-laporan';
import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { ambilRingkasanLaporanKarhutla, RingkasanLaporanKarhutla } from '@/lib/supabase/queries-karhutla-server'; // masih perlu ditulis
import { susunPromptLatarBelakangLaporan, susunPromptPembahasanLaporan } from '@/lib/ai/prompt-laporan';
import { DAFTAR_PUSTAKA_KARHUTLA } from '@/lib/karhutla/daftar-pustaka';
import { panggilAI } from '@/lib/ai';

export const maxDuration = 60;

async function panggilAiDenganFallback(promptTeks: string): Promise<string> {
  const supabaseServiceRole = createServiceRoleClient();
  const { data: daftarProviderAktif, error } = await supabaseServiceRole
    .from('pengaturan_ai')
    .select('*')
    .eq('aktif', true)
    .order('urutan_prioritas', { ascending: true });

  if (error || !daftarProviderAktif || daftarProviderAktif.length === 0) {
    throw new Error('Analisis AI belum dikonfigurasi. Hubungi Admin.');
  }

  const pesanErrorPerProvider: string[] = [];
  for (const provider of daftarProviderAktif) {
    try {
         return await panggilAI(provider, promptTeks, { formatJson: false, maxOutputTokens: 4096, maxPromptChars: 30000 });
    } catch (err) {
      const pesan = err instanceof Error ? err.message : 'Gagal tanpa pesan.';
      pesanErrorPerProvider.push(`${provider.nama_tampilan}: ${pesan}`);
    }
  }
  throw new Error(`Semua provider AI gagal dijalankan. Detail: ${pesanErrorPerProvider.join(' | ')}`);
}

export async function POST(request: Request) {
  const { role } = await getStatusAkses();
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang bisa membuat laporan.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body request harus JSON.' }, { status: 400 });
  }

  const { periodeAwal, periodeAkhir, wilayahKeys } = (body ?? {}) as {
    periodeAwal?: string;
    periodeAkhir?: string;
    wilayahKeys?: string[];
  };

  if (!periodeAwal || !periodeAkhir) {
    return NextResponse.json({ error: 'periodeAwal dan periodeAkhir wajib diisi.' }, { status: 400 });
  }

  try {
    const data = await ambilRingkasanLaporanKarhutla(periodeAwal, periodeAkhir, wilayahKeys ?? []);
    const periodeLabel = `${periodeAwal} s.d. ${periodeAkhir}`;
    const ringkasanTeks = JSON.stringify(data);

    const [latarBelakang, pembahasan, gambarKurva, gambarHarian] = await Promise.all([
        panggilAiDenganFallback(susunPromptLatarBelakangLaporan(ringkasanTeks, periodeLabel)),
        panggilAiDenganFallback(susunPromptPembahasanLaporan(ringkasanTeks, periodeLabel)),
        buatGambarKurvaEpidemik(data),
        buatGambarGrafikHarian(data),
    ]);

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'LAPORAN SURVEILANS KARHUTLA & ISPA', heading: HeadingLevel.TITLE }),
          new Paragraph({ text: `Periode: ${periodeLabel}`, spacing: { after: 300 } }),

          new Paragraph({ text: 'I. PENDAHULUAN', heading: HeadingLevel.HEADING_1 }),
          ...latarBelakang.split('\n\n').map((p) => new Paragraph({ text: p, spacing: { after: 200 } })),

          new Paragraph({ text: 'II. METODE', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text: `Data dikumpulkan dari sistem EPIC-AI BKK Kelas I Samarinda periode ${periodeLabel}, mencakup titik panas (NASA FIRMS), kasus ISPA, kualitas udara (PM2.5/PM10/Suhu/HCHO/TVOC/Kelembapan), dan data SKDR Kementerian Kesehatan RI.`,
          }),

          new Paragraph({ text: 'III. HASIL', heading: HeadingLevel.HEADING_1 }),

          new Paragraph({ text: 'Ringkasan Umum', heading: HeadingLevel.HEADING_2 }),
          buatTabelRingkasan(data),

          new Paragraph({ text: 'Data ISPA per Wilayah Kerja', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
          buatTabelIspaPerWilker(data),

          new Paragraph({ text: 'Pengukuran Kualitas Udara per Wilayah Kerja', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
          buatTabelKualitasUdara(data),

          new Paragraph({ text: 'Kurva Epidemik: Kasus ISPA dan PM2.5 dengan Titik Api', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ children: [new ImageRun({ type: 'png', data: gambarKurva, transformation: { width: 600, height: 300 } })] }),

          new Paragraph({ text: 'Grafik Harian: Kasus ISPA dan PM2.5 dengan Titik Api', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ children: [new ImageRun({ type: 'png', data: gambarHarian, transformation: { width: 600, height: 300 } })] }),

          new Paragraph({ text: 'IV. PEMBAHASAN', heading: HeadingLevel.HEADING_1 }),
          ...pembahasan.split('\n\n').map((p) => new Paragraph({ text: p, spacing: { after: 200 } })),
          

          new Paragraph({ text: 'V. DAFTAR PUSTAKA', heading: HeadingLevel.HEADING_1 }),
          ...DAFTAR_PUSTAKA_KARHUTLA.map((r) => new Paragraph({ text: `[${r.id}] ${r.sitasi}` })),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="laporan-karhutla-${periodeAwal}-${periodeAkhir}.docx"`,
      },
    });
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal membuat laporan.';
    return NextResponse.json({ error: pesan }, { status: 500 });
  }
}

function buatBarisTabel(sel: string[]): TableRow {
  return new TableRow({
    children: sel.map((teks) => new TableCell({ children: [new Paragraph(teks)] })),
  });
}

function buatBarisHeader(sel: string[]): TableRow {
  return new TableRow({
    children: sel.map(
      (teks) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: teks, bold: true })] })] })
    ),
  });
}

function buatTabelRingkasan(data: RingkasanLaporanKarhutla) {
  const totalIspa = data.totalIspaAnak + data.totalIspaDewasa;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      buatBarisHeader(['Indikator', 'Nilai']),
      buatBarisTabel(['Total Titik Panas', String(data.totalHotspot)]),
      buatBarisTabel(['Total Kasus ISPA', `${totalIspa} (Anak: ${data.totalIspaAnak}, Dewasa: ${data.totalIspaDewasa})`]),
      buatBarisTabel(['Total Kasus SKDR ISPA (periode)', String(data.totalSkdrPeriode)]),
    ],
  });
}

function buatTabelIspaPerWilker(data: RingkasanLaporanKarhutla) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      buatBarisHeader(['Wilayah Kerja', 'ISPA Anak', 'ISPA Dewasa', 'Total ISPA', 'Titik Panas']),
      ...data.perWilker.map((w) =>
        buatBarisTabel([
          w.nama,
          String(w.kasusIspaAnak),
          String(w.kasusIspaDewasa),
          String(w.kasusIspaAnak + w.kasusIspaDewasa),
          String(w.jumlahHotspot),
        ])
      ),
    ],
  });
}

function buatTabelKualitasUdara(data: RingkasanLaporanKarhutla) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      buatBarisHeader(['Wilayah Kerja', 'PM2.5', 'PM10', 'Suhu (°C)', 'HCHO', 'TVOC', 'Kelembapan (%)', 'Status']),
      ...data.perWilker.map((w) =>
        buatBarisTabel([
          w.nama,
          String(w.pm25Rerata ?? '—'),
          String(w.pm10Rerata ?? '—'),
          String(w.suhuRerata ?? '—'),
          String(w.hchoRerata ?? '—'),
          String(w.tvocRerata ?? '—'),
          String(w.kelembapanRerata ?? '—'),
          w.statusEvaluasi,
        ])
      ),
    ],
  });
}