/**
 * generateWarnaNegara
 * ---------------------
 * Terpisah dari TrenNegaraChart.tsx (yang "use client") supaya bisa
 * dipanggil langsung dari Server Component (page.tsx) saat membangun
 * seriesNegara. Fungsi biasa dari file "use client" tidak boleh
 * dieksekusi langsung di server -- hanya boleh dipakai sebagai
 * komponen/props.
 */
export function generateWarnaNegara(indeks: number): string {
  const hue = (indeks * 47) % 360;
  return `hsl(${hue} 65% 45%)`;
}