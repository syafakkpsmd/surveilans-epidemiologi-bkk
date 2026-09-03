import type { RingkasanLaporanKarhutla } from '@/lib/supabase/queries-karhutla-server';

async function ambilGambarChart(config: object): Promise<Buffer> {
  const res = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chart: config, width: 800, height: 400, backgroundColor: 'white' }),
  });
  if (!res.ok) throw new Error(`QuickChart gagal (HTTP ${res.status}): ${await res.text()}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Poin 3: Kurva Epidemik — Kasus ISPA & PM2.5 vs Titik Api, sepanjang periode. */
export async function buatGambarKurvaEpidemik(data: RingkasanLaporanKarhutla): Promise<Buffer> {
  const label = data.trenHarian.map((t) => t.tanggal.slice(5)); // "MM-DD"
  return ambilGambarChart({
    type: 'line',
    data: {
      labels: label,
      datasets: [
        { label: 'Kasus ISPA', data: data.trenHarian.map((t) => t.totalIspa), borderColor: '#3ee8ff', yAxisID: 'y', fill: false },
        { label: 'PM2.5 (µg/m³)', data: data.trenHarian.map((t) => t.pm25Rerata), borderColor: '#2fe7c4', yAxisID: 'y', fill: false },
        { label: 'Titik Panas', data: data.trenHarian.map((t) => t.jumlahHotspot), borderColor: '#ff7086', yAxisID: 'y1', fill: false },
      ],
    },
    options: {
      title: { display: true, text: 'Kurva Epidemik: Kasus ISPA & PM2.5 dengan Titik Api' },
      scales: {
        yAxes: [
          { id: 'y', position: 'left', ticks: { beginAtZero: true } },
          { id: 'y1', position: 'right', ticks: { beginAtZero: true }, gridLines: { drawOnChartArea: false } },
        ],
      },
    },
  });
}

/** Poin 4: sama datanya, tapi ditegaskan sbg "Grafik Harian" (bar utk hotspot, line utk ISPA/PM2.5). */
export async function buatGambarGrafikHarian(data: RingkasanLaporanKarhutla): Promise<Buffer> {
  const label = data.trenHarian.map((t) => t.tanggal.slice(5));
  return ambilGambarChart({
    type: 'bar',
    data: {
      labels: label,
      datasets: [
        { type: 'bar', label: 'Titik Panas', data: data.trenHarian.map((t) => t.jumlahHotspot), backgroundColor: '#ff708688' },
        { type: 'line', label: 'Kasus ISPA', data: data.trenHarian.map((t) => t.totalIspa), borderColor: '#3ee8ff', fill: false },
        { type: 'line', label: 'PM2.5 (µg/m³)', data: data.trenHarian.map((t) => t.pm25Rerata), borderColor: '#2fe7c4', fill: false },
      ],
    },
    options: { title: { display: true, text: 'Grafik Harian: Kasus ISPA & PM2.5 dengan Titik Api' } },
  });
}