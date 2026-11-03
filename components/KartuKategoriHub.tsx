import Link from "next/link";

interface KartuKategoriHubProps {
  judul: string;
  deskripsi: string;
  href?: string;
  statistik?: string;
}

/**
 * Kartu navigasi di hub dashboard utama. Kalau `href` tidak diisi,
 * kartu dianggap "Segera Hadir" -- ditampilkan pudar & tidak bisa
 * diklik, dipakai untuk modul yang belum dibangun (Vektor, PIE, dst).
 */
export function KartuKategoriHub({ judul, deskripsi, href, statistik }: KartuKategoriHubProps) {
  const isi = (
    <div
      className={
        href
          ? "h-full rounded-card bg-surface p-5 transition-shadow hover:shadow-md"
          : "h-full rounded-card border border-dashed border-border bg-surface/50 p-5"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={href ? "font-bold text-ink" : "font-bold text-muted"}>{judul}</h3>
        {!href && (
          <span className="shrink-0 rounded-pill bg-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Segera Hadir
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{deskripsi}</p>
      {statistik && href && <p className="mt-3 text-lg font-bold text-teal">{statistik}</p>}
    </div>
  );

  if (!href) return isi;

  return (
    <Link href={href} className="block h-full">
      {isi}
    </Link>
  );
}
