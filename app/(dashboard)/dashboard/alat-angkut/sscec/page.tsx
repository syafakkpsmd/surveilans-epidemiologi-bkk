import Link from "next/link";
import { ArrowLeft, Construction, Clock } from "lucide-react";

export default function SscecPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-4 py-12 text-center">
      {/* KARTU KONTEN UTAMA */}
      <div className="w-full rounded-card border border-border bg-surface p-8 md:p-12 shadow-sm space-y-6">
        
        {/* ICON & BADGE */}
        <div className="flex justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-teal/10 text-teal">
            <Construction className="h-10 w-10 text-teal" />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow">
              <Clock className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* JUDUL & DESKRIPSI */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            BKK Kelas I Samarinda
          </p>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">
            Modul SSCEC / SSCC
          </h1>
          <p className="mx-auto max-w-md text-base font-medium text-slate-600">
            Segmen SSCEC masih dalam tahap pengembangan dan pengumpulan data.
          </p>
        </div>

        {/* CATATAN INFORMASIONAL */}
        <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-muted text-left">
          <p className="font-semibold text-slate-700 mb-1">ℹ️ Informasi Sistem:</p>
          Fitur pemeriksaan dan penerbitan <i>Ship Sanitation Control Exemption Certificate</i> (SSCEC) sedang disinkronkan dengan skema pengumpulan data lapangan. Modul ini akan segera aktif setelah proses integrasi selesai.
        </div>

        {/* TOMBOL NAVIGASI KEMBALI */}
        <div className="pt-4">
          <Link
            href="/dashboard/alat-angkut"
            className="inline-flex items-center gap-2 rounded-control bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Dashboard Alat Angkut
          </Link>
        </div>

      </div>
    </div>
  );
}