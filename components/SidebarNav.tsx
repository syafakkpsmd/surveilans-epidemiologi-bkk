"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Ship,
  PlaneTakeoff,
  Bug,
  Rat,
  Zap,
  Droplets,
  Plane,
  Wind,
  CircleDot,
  Building2,
  ShieldAlert,
  Siren,
  Newspaper,
  ChevronRight,
  Globe,
  TrendingUp,
  Database,
  Microscope,
  Users,
  BarChart3,
  MapPin,
  ClipboardCheck,
} from "lucide-react";
import { useSidebar } from "@/components/SidebarContext";

// ----------------------------------------------------------------------------
// KONFIGURASI NAVIGASI
// Path disinkronkan dengan KartuKategoriHub di app/(dashboard)/dashboard/page.tsx
// Tambah/ubah item di sini saja -- tidak perlu sentuh logika render di bawah.
// ----------------------------------------------------------------------------

type NavChild = {
  label: string;
  href: string;
};

type NavItem = {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavChild[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Alat Angkut",
    items: [
      { label: "Beranda", href: "/dashboard", icon: Compass },
      { label: "Alat Angkut Kapal", href: "/dashboard/alat-angkut", icon: Ship },
      { label: "Alat Angkut Pesawat", href: "/dashboard/alat-angkut/pesawat", icon: PlaneTakeoff },
    ],
  },
  {
    title: "Vektor",
    items: [
      { label: "Vektor Aedes", href: "/dashboard/vektor/aedes", icon: Bug },
      { label: "Vektor Tikus", href: "/dashboard/vektor/tikus", icon: Rat },
      {
        label: "Vektor Anopheles",
        icon: Zap,
        children: [
          { label: "Nyamuk Dewasa", href: "/dashboard/vektor/anopheles?tipe=dewasa" },
          { label: "Larva", href: "/dashboard/vektor/anopheles?tipe=larva" },
        ],
      },
      {
        label: "Vektor Diare",
        icon: Droplets,
        children: [
          { label: "Diare Lalat", href: "/dashboard/vektor/diare-lalat" },
          { label: "Diare Kecoa", href: "/dashboard/vektor/diare-kecoa" },
        ],
      },
    ],
  },
  {
    title: "Surveilans",
    items: [
      { label: "Migrasi Malaria", href: "/dashboard/malaria", icon: Plane },
      { label: "Surveilans TB", href: "/dashboard/tb", icon: Wind },
      { label: "Surveilans HIV", href: "/dashboard/hiv", icon: CircleDot },
      { label: "TPP/TTU/PAB", href: "/dashboard/tpp", icon: Building2 },
      { label: "PIE Nasional", href: "/dashboard/emerging", icon: ShieldAlert },
      { label: "PIE Global", href: "/dashboard/global-emerging", icon: ShieldAlert },
      { label: "KLB", href: "https://script.google.com/macros/s/AKfycbx0LK83R7rZ0UGblcVKqKlwUJ8Jk3EdF9sV_l2JTMXzbAzjyj-ZZJ-WNIfiaHqJ5OMesQ/exec", icon: Siren },
    ],
  },
  {
    title: "Informasi Lainnya",
    items: [
      { label: "Buletin Surveilans", href: "/dashboard/buletin", icon: Newspaper },
      { label: "Peta Wilayah Kerja", href: "/dashboard/peta", icon: MapPin },
      { label: "Bank Data BKK", href: "https://bankdata.bkksamarinda.com/", icon: Database },
      { label: "LMS Kemenkes", href: "https://lms.kemkes.go.id/", icon: Building2 },
      { label: "e-Office Kemenkes", href: "https://auth-eoffice.kemkes.go.id/", icon: Building2 },
      { label: "e-Kinerja Kemenkes", href: "https://ekinerja-portal-eoffice.kemkes.go.id/", icon: TrendingUp },
      { label: "SINKARKES", href: "https://sinkarkes.kemkes.go.id/", icon: Database },
      { label: "Penyakit Infeksi Emerging", href: "https://infeksiemerging.kemkes.go.id/", icon: Microscope },
      { label: "SKDR", href: "https://skdr.kemkes.go.id/auth/", icon: Database },
      { label: "Kementerian Kesehatan", href: "https://www.kemkes.go.id/", icon: Building2 },
      { label: "TEPHINET", href: "https://www.tephinet.org/", icon: Globe },
      { label: "CDC", href: "https://www.cdc.gov", icon: ShieldAlert },
      { label: "WHO", href: "https://www.who.int/", icon: Globe },
      { label: "Status Laporan", href: "/dashboard/status-laporan", icon: ClipboardCheck },
    ],
  },
];

// Grup khusus Admin -- dirender terpisah, hanya kalau role === 'admin'
const ADMIN_GROUP: NavGroup = {
  title: "Admin",
  items: [
    { label: "Verifikasi User", href: "/admin/users", icon: Users },
    { label: "Statistik Kunjungan", href: "/admin/statistik", icon: BarChart3 },
  ],
};

type SidebarNavProps = {
  role?: "tamu" | "petugas" | "admin";
};

/**
 * Kumpulkan semua href (item + children, termasuk URL eksternal http/https
 * yang otomatis diabaikan) dari grup nav yang sedang dirender, dalam bentuk
 * basePath (tanpa query string).
 */
function kumpulkanSemuaHref(groups: NavGroup[]): string[] {
  const hasil: string[] = [];
  for (const grup of groups) {
    for (const item of grup.items) {
      if (item.href && item.href.startsWith("/")) {
        hasil.push(item.href.split("?")[0]);
      }
      if (item.children) {
        for (const child of item.children) {
          if (child.href.startsWith("/")) {
            hasil.push(child.href.split("?")[0]);
          }
        }
      }
    }
  }
  return hasil;
}

/**
 * Cari href PALING SPESIFIK (paling panjang) yang cocok dengan pathname
 * saat ini. Ini mencegah menu induk (mis. "/dashboard/alat-angkut") ikut
 * ter-highlight ketika yang aktif sebenarnya adalah menu anak yang
 * kebetulan satu prefix folder (mis. "/dashboard/alat-angkut/pesawat"),
 * padahal keduanya dimaksudkan sebagai menu SEJAJAR, bukan parent-child.
 */
function cariHrefPalingCocok(pathname: string, semuaHref: string[]): string | null {
  let terbaik: string | null = null;

  for (const href of semuaHref) {
    let cocok = false;
    if (href === "/dashboard") {
      cocok = pathname === "/dashboard";
    } else {
      cocok = pathname === href || pathname.startsWith(href + "/");
    }

    if (cocok && (!terbaik || href.length > terbaik.length)) {
      terbaik = href;
    }
  }

  return terbaik;
}

export default function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { isOpen, close } = useSidebar();

  const toggleExpand = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const groupsToRender = role === "admin" ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS;

  // Dihitung sekali per render dari pathname saat ini -- dipakai oleh
  // isActive/isParentActive di bawah supaya hanya SATU menu yang paling
  // spesifik yang ter-highlight, bukan semua menu yang prefix-nya cocok.
  const hrefAktifTerbaik = useMemo(() => {
    const semuaHref = kumpulkanSemuaHref(groupsToRender);
    return cariHrefPalingCocok(pathname, semuaHref);
  }, [pathname, groupsToRender]);

  const isActive = (href?: string) => {
    if (!href || !href.startsWith("/")) return false;
    const basePath = href.split("?")[0];
    return basePath === hrefAktifTerbaik;
  };

  const isParentActive = (item: NavItem) => {
    if (!item.children) return isActive(item.href);
    return item.children.some((c) => isActive(c.href));
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
        />
      )}

      <nav
        className={[
          "z-[70] flex w-64 shrink-0 flex-col gap-6 self-stretch overflow-y-auto bg-gradient-to-b from-slate-900 to-indigo-950 px-3 py-6 text-slate-300",
          "fixed inset-y-0 left-0 h-screen transition-transform duration-200",
          "md:relative md:inset-auto md:h-auto md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {groupsToRender.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <span className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.title}
            </span>

            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isParentActive(item);
              const hasChildren = !!item.children?.length;
              const open = expanded[item.label];

              const rowClasses = [
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white ring-1 ring-inset ring-cyan-400/40"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ");

              const rowContent = (
                <>
                  <Icon size={18} className="shrink-0 opacity-90" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {hasChildren && (
                    <ChevronRight
                      size={16}
                      className={`opacity-60 transition-transform ${open ? "rotate-90" : ""}`}
                    />
                  )}
                </>
              );

              if (hasChildren) {
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.label)}
                      className={rowClasses + " w-full appearance-none border-0 bg-transparent p-0 px-3 py-2.5 text-left"}
                    >
                      {rowContent}
                    </button>
                    {open && (
                      <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3">
                        {item.children!.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={close}
                            className={[
                              "rounded-md px-2 py-1.5 text-sm transition-colors",
                              isActive(child.href)
                                ? "text-cyan-300"
                                : "text-slate-400 hover:text-white",
                            ].join(" ")}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  onClick={close}
                  prefetch={item.href === "/dashboard/tpp" ? false : undefined}
                  className={rowClasses}
                >
                  {rowContent}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}