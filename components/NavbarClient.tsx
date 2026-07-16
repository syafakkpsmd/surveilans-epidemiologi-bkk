"use client";

import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { LiveClock } from "./LiveClock";
import { LiveBadge } from "./LiveBadge";
import type { PeranUser } from "@/types/database.types";
import { useSidebar } from "@/components/SidebarContext";

interface NavbarClientProps {
  sudahLogin: boolean;
  role: PeranUser | null;
}

export function NavbarClient({ sudahLogin, role }: NavbarClientProps) {
  const { isOpen, toggle, close } = useSidebar();

  return (
    // sticky top-0 + z-50 -- navbar tetap terlihat saat halaman di-scroll ke bawah
    <header className="sticky top-0 z-[60] bg-gradient-to-r from-blue-950 via-violet-900 to-emerald-700 text-white shadow-md">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:py-4">
        {/* KIRI: logo Kemenkes */}
        <Link href="/dashboard" className="col-start-1 flex shrink-0 items-center gap-3">
          <img
            src="/logo-kemenkes.png"
            alt="Logo Kementerian Kesehatan RI"
            className="h-20 w-20 object-contain"
          />
          <img
            src="/logo-bkk.png"
            alt="Logo BKK Kelas I Samarinda"
            className="h-18 w-18 object-contain"
          />
        </Link>

        {/* TENGAH: teks sambutan -- absolute + left-1/2 -translate-x-1/2 supaya
           benar-benar center relatif ke lebar navbar penuh, bukan cuma sisa
           ruang antara logo & grup kanan (yang lebarnya beda-beda). */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center leading-tight md:flex">
          <span className="text-[14px] font-bold tracking-widest text-white">
            Welcome to
          </span>
          <span className="text-lg font-bold text-yellow-300 md:text-2xl">
            EPIC-AI Samarinda Quarantine Office
          </span>
          <span className="text-[14px] font-normal tracking-widest text-white">
            Epidemiological Predictive Intelligence Center - Artificial Intelligence Analysis
          </span>
        </div>

        {/* KANAN: 2 baris -- atas ADMIN+Logout, bawah LIVE+jam */}
        <div className="hidden flex-col items-end gap-1.5 md:flex">
          <AreaAuth sudahLogin={sudahLogin} role={role} />
          <div className="flex items-center gap-3">
            <LiveBadge />
            <LiveClock />
          </div>
        </div>

        {/* Hamburger mobile */}
        <button
          type="button"
          className="rounded-control p-2 text-white/80 hover:text-white md:hidden"
          onClick={toggle}
          aria-label={isOpen ? "Tutup menu" : "Buka menu"}
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-3 border-t border-white/10 px-4 py-3 md:hidden">
          {/* Teks sambutan versi ringkas untuk mobile */}
          <div className="text-center leading-tight">
            <p className="text-sm font-bold">EPIC-AI Samarinda Quarantine Office</p>
            <p className="text-[11px] text-white/70">
              Epidemiological Predictive Intelligence Center
            </p>
          </div>
          <AreaAuth sudahLogin={sudahLogin} role={role} />
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <LiveBadge />
            <LiveClock />
          </div>
        </div>
      )}
    </header>
  );
}

function AreaAuth({ sudahLogin, role }: { sudahLogin: boolean; role: PeranUser | null }) {
  if (!sudahLogin) {
    return (
      <Link
        href="/login"
        className="rounded-pill bg-white px-4 py-1.5 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
      >
        Login
      </Link>
    );
  }

  const labelRole = role === "admin" ? "Admin" : role === "petugas" ? "Petugas" : "Pengguna";

  return (
    <div className="flex items-center gap-3">
      <span className="rounded-pill bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
        {labelRole}
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-pill border border-white/30 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Logout
        </button>
      </form>
    </div>
  );
}