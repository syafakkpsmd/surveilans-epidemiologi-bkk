// lib/wilayah-kerja/peta.ts
// Turunan murni (aman untuk 'use client') dari daftar wilayah untuk modul Peta Wilayah Kerja.
import type { JenisWilker, Wilayah } from './index';

export interface WilkerPeta {
  kode: string;
  nama: string;
  /** Nama pendek (mis. "APT Pranoto"), dipakai di label ringkas. */
  namaPendek: string;
  jenis: JenisWilker;
  pusat: { lat: number; lng: number };
  zoomDetail: number;
}

/** Wilayah yang tampil di peta: yang aktif, ditambah kantor induk (jenis Kantor) walau tidak ikut surveilans. Terurut. */
export function opsiWilkerPeta(daftar: readonly Wilayah[]): WilkerPeta[] {
  return daftar
    .filter((w) => (w.aktif || w.jenis === 'Kantor') && (w.petaLat ?? w.lat) != null && (w.petaLng ?? w.lng) != null)
    .sort((a, b) => a.urutan - b.urutan || a.kode.localeCompare(b.kode))
    .map((w) => ({
      kode: w.kode,
      nama: w.jenis === 'Kantor' ? w.nama : w.namaPeta,
      namaPendek: w.namaPendek,
      jenis: w.jenis,
      pusat: { lat: (w.petaLat ?? w.lat) as number, lng: (w.petaLng ?? w.lng) as number },
      zoomDetail: w.zoom,
    }));
}

/** Titik tengah tampilan "semua wilayah": wilayah pertama yang bukan kantor induk (bila ada), jika tidak yang pertama. */
export function pusatOverviewPeta(opsi: readonly WilkerPeta[]): [number, number] {
  const w = opsi.find((x) => x.jenis !== 'Kantor') ?? opsi[0];
  return w ? [w.pusat.lat, w.pusat.lng] : [0, 117];
}
