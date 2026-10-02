"use client";

/**
 * components/TopNav.tsx
 *
 * Menu navigasi horizontal di bawah banner (gaya situs WHO), pengganti
 * SidebarNav.
 *  - Desktop (>= md): bilah berisi nama kelompok menu saja. Klik satu kelompok
 *    -> panel lebar penuh terbuka di bawahnya berisi kegiatan/halamannya.
 *    Klik lagi, klik di luar, tekan Esc, atau pilih halaman -> panel menutup.
 *  - Mobile (< md): tombol hamburger di Navbar membuka laci di kiri berisi
 *    kelompok yang bisa dilipat (accordion).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, Home } from "lucide-react";
import type { PeranAkses } from "@/lib/auth/get-user-role";
import { useSidebar } from "@/components/SidebarContext";
import {
  ADMIN_GROUP,
  HREF_BERANDA,
  NAV_GROUPS,
  adalahInternal,
  cariHrefAktif,
  hrefSamaDenganAktif,
  type NavGroup,
  type NavItem,
} from "@/components/nav/menu-data";

const targetLuar = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

export default function TopNav({ role }: { role: PeranAkses }) {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  const groups = useMemo(() => (role === "admin" ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS), [role]);
  const hrefAktif = useMemo(() => cariHrefAktif(pathname, groups), [pathname, groups]);

  const aktif = (href?: string) => hrefSamaDenganAktif(href, hrefAktif);
  const itemAktif = (item: NavItem) =>
    item.children ? item.children.some((c) => aktif(c.href)) || aktif(item.href) : aktif(item.href);
  const grupAktif = (g: NavGroup) => g.items.some(itemAktif);

  // Panel desktop. Disimpan bersama pathname-nya, jadi otomatis dianggap
  // tertutup begitu pindah halaman (tanpa useEffect + setState).
  const [buka, setBuka] = useState<{ path: string; judul: string } | null>(null);
  const judulTerbuka = buka && buka.path === pathname ? buka.judul : null;
  const grupTerbuka = groups.find((g) => g.title === judulTerbuka) ?? null;

  const wadah = useRef<HTMLElement>(null);

  // Mode ringkas: true setelah halaman digulir melewati banner.
  const penanda = useRef<HTMLDivElement>(null);
  const [menempel, setMenempel] = useState(false);
  useEffect(() => {
    const el = penanda.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const pengamat = new IntersectionObserver(
      ([e]) => setMenempel(!e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, []);
  const pemicu = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!judulTerbuka) return;
    const saatKetuk = (e: PointerEvent) => {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(null);
    };
    const saatEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      pemicu.current[judulTerbuka]?.focus();
      setBuka(null);
    };
    document.addEventListener("pointerdown", saatKetuk);
    document.addEventListener("keydown", saatEsc);
    return () => {
      document.removeEventListener("pointerdown", saatKetuk);
      document.removeEventListener("keydown", saatEsc);
    };
  }, [judulTerbuka]);

  // Accordion mobile: kelompok yang berisi halaman aktif terbuka otomatis.
  const [lipat, setLipat] = useState<Record<string, boolean>>({});
  const mobileTerbuka = (g: NavGroup) => lipat[g.title] ?? grupAktif(g);

  return (
    <>
      {/* ===================== DESKTOP ===================== */}
      {/* Penanda 1px tepat di atas bilah: begitu keluar dari layar, bilah sudah menempel. */}
      <div ref={penanda} aria-hidden="true" className="-mb-px hidden h-px md:block" />
      <nav
        ref={wadah}
        aria-label="Menu utama"
        className="sticky top-0 z-50 hidden bg-linear-to-r from-slate-900 to-indigo-950 text-white shadow-md md:block"
      >
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-stretch px-2">
          {/* Logo: muncul hanya setelah halaman digulir (saat banner sudah hilang). */}
          <Link
            href={HREF_BERANDA}
            prefetch={false}
            aria-label="EPIC-AI BKK Kelas I Samarinda, ke Beranda"
            inert={!menempel}
            className={`hidden items-center gap-2 self-center overflow-hidden transition-all duration-300 motion-reduce:transition-none xl:flex ${
              menempel ? "mr-2 max-w-40 opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-kemenkesri.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-bkk.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
          </Link>

          <Link
            href={HREF_BERANDA}
            prefetch={false}
            aria-label="Beranda"
            aria-current={aktif(HREF_BERANDA) ? "page" : undefined}
            tabIndex={menempel ? -1 : undefined}
            className={`flex items-center overflow-hidden border-b-4 py-3 transition-all duration-300 hover:bg-white/10 motion-reduce:transition-none ${
              menempel ? "px-4 xl:max-w-0 xl:px-0 xl:opacity-0" : "max-w-20 px-4"
            } ${aktif(HREF_BERANDA) ? "border-cyan-400 bg-white/10" : "border-transparent"}`}
          >
            <Home size={22} aria-hidden="true" />
          </Link>

          {groups.map((g) => {
            const terbuka = g.title === judulTerbuka;
            const menyala = terbuka || grupAktif(g);
            return (
              <button
                key={g.title}
                ref={(el) => {
                  pemicu.current[g.title] = el;
                }}
                type="button"
                aria-expanded={terbuka}
                aria-controls="panel-menu-utama"
                aria-haspopup="true"
                onClick={() => setBuka(terbuka ? null : { path: pathname, judul: g.title })}
                className={`flex items-center gap-1 border-b-4 px-2.5 py-3 text-[13px] font-semibold transition-colors hover:bg-white/10 xl:gap-1.5 xl:px-3.5 xl:text-sm ${
                  menyala ? "border-cyan-400" : "border-transparent"
                } ${terbuka ? "bg-white/10" : ""}`}
              >
                {g.singkat}
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`shrink-0 transition-transform ${terbuka ? "rotate-180" : ""}`}
                />
              </button>
            );
          })}
        </div>

        {grupTerbuka && (
          <div
            id="panel-menu-utama"
            role="region"
            aria-label={grupTerbuka.title}
            className="absolute inset-x-0 top-full max-h-[75vh] overflow-y-auto border-t-4 border-cyan-400 bg-white text-slate-800 shadow-2xl"
          >
            <div className="mx-auto max-w-7xl px-4 py-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {grupTerbuka.title}
              </p>
              <ul className="grid gap-x-6 gap-y-1.5 md:grid-cols-2 lg:grid-cols-3">
                {grupTerbuka.items.map((item) => (
                  <li key={item.label}>
                    <ItemPanel item={item} aktif={aktif} itemAktif={itemAktif(item)} onPilih={() => setBuka(null)} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </nav>

      {/* ===================== MOBILE ===================== */}
      {isOpen && <div onClick={close} className="fixed inset-0 z-65 bg-black/50 md:hidden" aria-hidden="true" />}
      <nav
        aria-label="Menu utama (ponsel)"
        inert={!isOpen}
        className={[
          // Laci menutupi seluruh tinggi layar (di atas header z-60), supaya tidak
          // tertimpa panel header yang ikut membesar saat hamburger dibuka.
          "fixed inset-y-0 left-0 z-70 flex w-72 flex-col gap-1 overflow-y-auto bg-linear-to-b from-slate-900 to-indigo-950 px-3 py-4 text-slate-300 transition-transform duration-200 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Menu</span>
          <button
            type="button"
            onClick={close}
            aria-label="Tutup menu"
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <Link
          href={HREF_BERANDA}
          prefetch={false}
          onClick={close}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
            aktif(HREF_BERANDA) ? "bg-white/10 text-white ring-1 ring-inset ring-cyan-400/40" : "hover:bg-white/5 hover:text-white"
          }`}
        >
          <Home size={18} aria-hidden="true" /> Beranda
        </Link>

        {groups.map((g) => {
          const terbuka = mobileTerbuka(g);
          return (
            <div key={g.title}>
              <button
                type="button"
                aria-expanded={terbuka}
                onClick={() => setLipat((p) => ({ ...p, [g.title]: !terbuka }))}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${
                  grupAktif(g) ? "text-white" : "hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex-1">{g.title}</span>
                <ChevronRight size={16} aria-hidden="true" className={`opacity-60 transition-transform ${terbuka ? "rotate-90" : ""}`} />
              </button>
              {terbuka && (
                <ul className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                  {g.items.map((item) =>
                    item.children ? (
                      <li key={item.label}>
                        {adalahInternal(item.href) ? (
                          <Link
                            href={item.href}
                            prefetch={item.prefetch ?? false}
                            onClick={close}
                            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold ${
                              aktif(item.href) ? "bg-white/10 text-cyan-300" : "text-slate-200 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <item.icon size={16} aria-hidden="true" className="shrink-0 opacity-80" /> {item.label}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-2 px-2 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <item.icon size={14} aria-hidden="true" /> {item.label}
                          </span>
                        )}
                        <ul className="ml-4 flex flex-col">
                          {item.children.map((c) => (
                            <li key={c.href}>
                              <Link
                                href={c.href}
                                prefetch={c.prefetch ?? false}
                                onClick={close}
                                className={`block rounded-md px-2 py-1.5 text-sm ${aktif(c.href) ? "text-cyan-300" : "text-slate-400 hover:text-white"}`}
                              >
                                {c.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ) : (
                      <li key={item.label}>
                        <Link
                          href={item.href!}
                          prefetch={adalahInternal(item.href) ? (item.prefetch ?? false) : undefined}
                          onClick={adalahInternal(item.href) ? close : undefined}
                          {...targetLuar(item.href!)}
                          className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
                            aktif(item.href) ? "bg-white/10 text-cyan-300" : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <item.icon size={16} aria-hidden="true" className="shrink-0 opacity-80" />
                          <span className="flex-1">{item.label}</span>
                          {!adalahInternal(item.href) && <ExternalLink size={12} aria-hidden="true" className="opacity-50" />}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}

// -------------------------------------------------------- Isi panel desktop

function ItemPanel({
  item,
  aktif,
  itemAktif,
  onPilih,
}: {
  item: NavItem;
  aktif: (href?: string) => boolean;
  itemAktif: boolean;
  onPilih: () => void;
}) {
  const Ikon = item.icon;
  const kotakIkon = (menyala: boolean) =>
    `grid h-8 w-8 shrink-0 place-items-center rounded-md ${menyala ? "bg-teal-600 text-white" : "bg-teal-50 text-teal-700"}`;

  // Item bercabang (mis. Vektor Anopheles): judul + daftar anak langsung terlihat.
  if (item.children) {
    return (
      <div className="px-3 py-2">
        {adalahInternal(item.href) ? (
          // Induk yang punya href: seluruh judul bisa diklik menuju halaman induknya.
          <Link
            href={item.href}
            prefetch={item.prefetch ?? false}
            onClick={onPilih}
            aria-current={aktif(item.href) ? "page" : undefined}
            className={`-mx-1 flex items-center gap-3 rounded-lg px-1 py-1 text-sm font-semibold transition-colors hover:bg-slate-100 ${
              aktif(item.href) ? "text-teal-700" : "text-slate-900"
            }`}
          >
            <span className={kotakIkon(itemAktif)}>
              <Ikon size={16} aria-hidden="true" />
            </span>
            <span className="flex-1">{item.label}</span>
            <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-slate-400" />
          </Link>
        ) : (
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
            <span className={kotakIkon(itemAktif)}>
              <Ikon size={16} aria-hidden="true" />
            </span>
            {item.label}
          </div>
        )}
        <ul className="ml-11 mt-1 flex flex-col">
          {item.children.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                prefetch={c.prefetch ?? false}
                onClick={onPilih}
                aria-current={aktif(c.href) ? "page" : undefined}
                className={`block rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 ${
                  aktif(c.href) ? "font-semibold text-teal-700" : "text-slate-600"
                }`}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const internal = adalahInternal(item.href);
  return (
    <Link
      href={item.href!}
      prefetch={internal ? (item.prefetch ?? false) : undefined}
      onClick={internal ? onPilih : undefined}
      {...targetLuar(item.href!)}
      aria-current={itemAktif ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 ${
        itemAktif ? "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200" : "text-slate-700"
      }`}
    >
      <span className={kotakIkon(itemAktif)}>
        <Ikon size={16} aria-hidden="true" />
      </span>
      <span className="flex-1">{item.label}</span>
      {!internal && <ExternalLink size={14} aria-hidden="true" className="shrink-0 text-slate-400" />}
    </Link>
  );
}
