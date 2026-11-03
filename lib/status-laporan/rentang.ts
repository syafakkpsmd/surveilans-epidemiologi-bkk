/**
 * lib/status-laporan/rentang.ts
 *
 * Kebalikan dari hitungMingguEpidemiologi() di lib/epi-week.ts: dari
 * (tahun epid, minggu epid) jadi rentang tanggal Minggu s/d Sabtu.
 * Aturannya SAMA PERSIS dengan lib/epi-week.ts (dan SQL mmwr_week):
 * minggu-1 = minggu yang memuat >= 4 hari di tahun itu, minggu mulai Minggu.
 * Dipakai untuk menyaring tabel Turso (yang tidak punya fungsi mmwr_week)
 * per tanggal kegiatan.
 */

function mulaiMingguSatu(tahun: number): Date {
  const jan1 = new Date(Date.UTC(tahun, 0, 1));
  const dow = jan1.getUTCDay(); // 0 = Minggu
  const mulai = new Date(jan1);
  if (dow <= 3) {
    mulai.setUTCDate(jan1.getUTCDate() - dow);
  } else {
    mulai.setUTCDate(jan1.getUTCDate() + (7 - dow));
  }
  return mulai;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function rentangTanggalMingguEpid(
  tahunEpid: number,
  mingguEpid: number,
): { awal: string; akhir: string } {
  const mulai = mulaiMingguSatu(tahunEpid);
  const awal = new Date(mulai);
  awal.setUTCDate(mulai.getUTCDate() + (mingguEpid - 1) * 7);
  const akhir = new Date(awal);
  akhir.setUTCDate(awal.getUTCDate() + 6);
  return { awal: iso(awal), akhir: iso(akhir) };
}

/** "14 - 20 September 2026" atau "28 Desember 2025 - 3 Januari 2026". */
export function labelRentangTanggal(awal: string, akhir: string): string {
  const a = new Date(`${awal}T00:00:00Z`);
  const b = new Date(`${akhir}T00:00:00Z`);
  const fmt = (d: Date, opsi: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', ...opsi }).format(d);

  if (a.getUTCFullYear() !== b.getUTCFullYear()) {
    return `${fmt(a, { day: 'numeric', month: 'long', year: 'numeric' })} - ${fmt(b, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  if (a.getUTCMonth() !== b.getUTCMonth()) {
    return `${fmt(a, { day: 'numeric', month: 'long' })} - ${fmt(b, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${a.getUTCDate()} - ${fmt(b, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
