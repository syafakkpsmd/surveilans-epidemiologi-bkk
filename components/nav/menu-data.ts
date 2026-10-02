/**
 * components/nav/menu-data.ts
 *
 * Data menu + logika "menu aktif" yang dipakai TopNav. Isi NAV_GROUPS disalin
 * dari SidebarNav.tsx versi terbaru. Kalau menambah/mengubah menu, cukup ubah
 * file ini. `singkat` = label pendek yang tampil di bilah atas (judul penuh
 * tetap tampil di dalam panel).
 */

import type { ElementType } from "react";
import {
  Ship, PlaneTakeoff, Bug, Rat, Zap, Droplets, Plane, Wind, CircleDot, Building2,
  ShieldAlert, Siren, Newspaper, Globe, TrendingUp, Database, Microscope, Users,
  BarChart3, MapPin, ClipboardCheck, BuildingIcon, Table2, Book, Flame, Droplet,
  BellRing, Package, PersonStanding,
} from "lucide-react";

export type NavChild = { label: string; href: string; prefetch?: boolean };

export type NavItem = {
  label: string;
  href?: string;
  icon: ElementType;
  children?: NavChild[];
  prefetch?: boolean;
};

export type NavGroup = { title: string; singkat: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Surveilans Alat Angkut",
    singkat: "Alat Angkut",
    items: [
      {
        label: "Alat Angkut Kapal",
        href: "/dashboard/alat-angkut", // item bercabang yang judulnya juga bisa diklik
        icon: Ship,
        prefetch: false,
        children: [
          { label: "Kapal dalam Karantina", href: "/cop", prefetch: false },
          { label: "Keberangkatan Kapal", href: "/phqc", prefetch: false },
          { label: "Pengawasan Rat Guard", href: "/dashboard/alat-angkut/rat-guard", prefetch: false },
        ],
      },
      { label: "Alat Angkut Pesawat", href: "/dashboard/alat-angkut/pesawat", icon: PlaneTakeoff, prefetch: false },
    ],
  },
  {
    title: "Surveilans Penyakit",
    singkat: "Penyakit",
    items: [
      { label: "Migrasi Malaria", href: "/dashboard/malaria", icon: Plane, prefetch: false },
      { label: "Surveilans TB", href: "/dashboard/tb", icon: Wind, prefetch: false },
      { label: "Surveilans HIV", href: "/dashboard/hiv", icon: CircleDot, prefetch: false },
      { label: "Kunjungan Poliklinik", href: "/dashboard/poliklinik", icon: Building2, prefetch: false },
      { label: "PIE Nasional", href: "/dashboard/nasional-emerging", icon: ShieldAlert, prefetch: false },
      { label: "PIE Global", href: "/dashboard/global-emerging", icon: ShieldAlert, prefetch: false },
      { label: "SKDR BKK SMD", href: "/dashboard/skdr", icon: BellRing, prefetch: false },
      { label: "KLB", href: "https://epic-outbreak-ai.vercel.app/", icon: Siren },
    ],
  },
  {
    title: "Pelaku Perjalanan",
    singkat: "Travelers",
    items: [
      { label: "Lalu Lintas Orang", href: "/dashboard/abk-crew-penumpang", icon: Users, prefetch: false },
      { label: "Ijin Angkut Orang Sakit", href: "/dashboard/siaos", icon: PersonStanding, prefetch: false },
      { label: "Kier Kesehatan", href: "/dashboard/kier", icon: PersonStanding, prefetch: false },
      { label: "SKLT", href: "/dashboard/sklt", icon: ClipboardCheck, prefetch: false },
    ],
  },
  {
    title: "Surveilans Vektor",
    singkat: "Vektor",
    items: [
      { label: "Vektor Aedes", href: "/dashboard/vektor/aedes", icon: Bug, prefetch: false },
      { label: "Vektor Tikus", href: "/dashboard/vektor/tikus", icon: Rat, prefetch: false },
      {
        label: "Vektor Anopheles",
        icon: Zap,
        children: [
          { label: "Nyamuk Dewasa", href: "/dashboard/vektor/anopheles?tipe=dewasa", prefetch: false },
          { label: "Larva", href: "/dashboard/vektor/anopheles/larva?tipe=larva", prefetch: false },
        ],
      },
      {
        label: "Vektor Diare",
        icon: Droplets,
        children: [
          { label: "Diare Lalat", href: "/dashboard/vektor/diare-lalat", prefetch: false },
          { label: "Diare Kecoa", href: "/dashboard/vektor/diare-kecoa", prefetch: false },
        ],
      },
    ],
  },
  {
    title: "Surveilans Lingkungan",
    singkat: "Lingkungan",
    items: [
      { label: "Surveilans TPP", href: "/dashboard/tpp", icon: Building2, prefetch: false },
      { label: "Surveilans TTU", href: "/dashboard/ttu", icon: BuildingIcon, prefetch: false },
      { label: "Surveilans PAB", href: "/dashboard/pab", icon: Droplet, prefetch: false },
      { label: "ISPA KARHUTLA", href: "/dashboard/karhutla", icon: Flame, prefetch: false },
    ],
  },
  {
    title: "Klinik Binaan BKK",
    singkat: "Klinik Binaan",
    items: [
      { label: "Klinik Binaan", href: "/dashboard/klinik", icon: Building2, prefetch: false },
      { label: "Pengawasan Klinik", href: "/dashboard/pengawasan-klinik", icon: ClipboardCheck, prefetch: false },
      { label: "Stok Vaksin", href: "/dashboard/stok-vaksin", icon: Package, prefetch: false },
    ],
  },
  {
    title: "Media Informasi",
    singkat: "Informasi",
    items: [
      { label: "BULETIN SURVEILANS", href: "/dashboard/buletin", icon: Newspaper, prefetch: false },
      { label: "Peta Wilayah Kerja", href: "/dashboard/peta", icon: MapPin, prefetch: false },
      {
        label: "Monitoring Laporan",
        icon: ClipboardCheck,
        children: [
          { label: "Alat Angkut & Vektor", href: "/dashboard/status-laporan", prefetch: false },
          { label: "Lalu Lintas Orang", href: "/dashboard/status-laporan/lalu-lintas-orang", prefetch: false },
          { label: "Ketepatan Laporan", href: "/dashboard/ketepatan-laporan", prefetch: false },
        ],
      },
    ],
  },
  {
    title: "Tautan",
    singkat: "Tautan",
    items: [
      { label: "Download Peraturan", href: "/peraturan", icon: Book, prefetch: false },
      { label: "LMS Kemenkes", href: "https://lms.kemkes.go.id/", icon: Building2 },
      { label: "e-Office Kemenkes", href: "https://auth-eoffice.kemkes.go.id/", icon: Building2 },
      { label: "e-Kinerja Kemenkes", href: "https://ekinerja-portal-eoffice.kemkes.go.id/", icon: TrendingUp },
      { label: "SRIKANDI", href: "https://srikandi.arsip.go.id/auth/login/", icon: Database },
      { label: "SINKARKES", href: "https://sinkarkes.kemkes.go.id/", icon: Database },
      { label: "Penyakit Infeksi Emerging", href: "https://infeksiemerging.kemkes.go.id/", icon: Microscope },
      { label: "SKDR", href: "https://skdr.kemkes.go.id/auth/", icon: Database },
      { label: "Kementerian Kesehatan", href: "https://www.kemkes.go.id/", icon: Building2 },
      { label: "TEPHINET", href: "https://www.tephinet.org/", icon: Globe },
      { label: "CDC", href: "https://www.cdc.gov", icon: ShieldAlert },
      { label: "WHO", href: "https://www.who.int/", icon: Globe },
    ],
  },
  {
    title: "Simulasi Wabah",
    singkat: "Simulasi",
    items: [
      { label: "Kapal", href: "/dashboard/simulasi-wabah/kapal", icon: Ship },
      { label: "Pesawat", href: "/dashboard/simulasi-wabah/pesawat", icon: PlaneTakeoff },
    ],
  },
  {
    title: "Data",
    singkat: "Data",
    items: [
      { label: "Bank Data BKK", href: "https://bankdata.bkksamarinda.com/", icon: Database },
      { label: "Tabel Vektor dan Lingkungan", href: "/dashboard/master-tabel", icon: Table2, prefetch: false },
      { label: "Tabel Klinik", href: "/dashboard/klinik/tabel", icon: Table2, prefetch: false },
      { label: "Tabel Lalu Lintas Orang", href: "/lalu-lintas-orang", icon: Table2, prefetch: false },
    ],
  },
];

export const ADMIN_GROUP: NavGroup = {
  title: "Admin",
  singkat: "Admin",
  items: [
    { label: "Verifikasi User", href: "/admin/users", icon: Users, prefetch: false },
    { label: "Statistik Kunjungan", href: "/admin/statistik", icon: BarChart3, prefetch: false },
  ],
};

export const HREF_BERANDA = "/dashboard";

// ----------------------------------------------------------- Menu aktif

/** Buang query string dan garis miring di akhir ("/a/b/?x=1" -> "/a/b"). */
const dasar = (href: string) => href.split("?")[0].replace(/\/+$/, "") || "/";

export const adalahInternal = (href?: string): href is string => !!href && href.startsWith("/");

function semuaHrefInternal(groups: NavGroup[]): string[] {
  const hasil: string[] = [HREF_BERANDA];
  for (const g of groups) {
    for (const item of g.items) {
      if (adalahInternal(item.href)) hasil.push(dasar(item.href));
      for (const c of item.children ?? []) if (adalahInternal(c.href)) hasil.push(dasar(c.href));
    }
  }
  return hasil;
}

/** Href dengan kecocokan terpanjang menang (mis. /dashboard/alat-angkut/pesawat
 * mengalahkan /dashboard/alat-angkut). Beranda hanya cocok persis. */
export function cariHrefAktif(pathname: string, groups: NavGroup[]): string | null {
  const path = dasar(pathname);
  let terbaik: string | null = null;
  for (const href of semuaHrefInternal(groups)) {
    const cocok = href === HREF_BERANDA ? path === href : path === href || path.startsWith(href + "/");
    if (cocok && (!terbaik || href.length > terbaik.length)) terbaik = href;
  }
  return terbaik;
}

export function hrefSamaDenganAktif(href: string | undefined, hrefAktif: string | null): boolean {
  return adalahInternal(href) && dasar(href) === hrefAktif;
}
