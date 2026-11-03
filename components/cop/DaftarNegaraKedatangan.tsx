"use client";

const PALET_NEGARA = [
  "#0F4C5C", "#2F9E44", "#F0A202", "#D62839", "#7C3AED", "#0EA5E9", "#DB2777", "#B45309",
];

interface DaftarNegaraKedatanganProps {
  data: { nilai: string; jumlah: number }[];
}

export function DaftarNegaraKedatangan({ data }: DaftarNegaraKedatanganProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">Tidak ada data untuk periode ini.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.jumlah));

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((d, i) => {
        const warna = PALET_NEGARA[i % PALET_NEGARA.length];
        return (
          <div key={d.nilai}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink">
                <span className="h-2 w-2 rounded-full" style={{ background: warna }} />
                {d.nilai}
              </span>
              <span className="font-semibold text-ink">{d.jumlah}</span>
            </div>
            <div className="h-2.5 rounded-full bg-bg">
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(d.jumlah / max) * 100}%`, background: warna }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}