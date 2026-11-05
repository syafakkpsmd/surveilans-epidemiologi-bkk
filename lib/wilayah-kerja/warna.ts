// lib/wilayah-kerja/warna.ts
// Palet cadangan untuk grafik per wilayah kerja bila kolom `warna` di wilker_ref kosong.
// Murni (aman untuk komponen 'use client'). Urutannya mengikuti urutan wilayah, jadi warna wilayah yang sama
// konsisten selama urutannya tidak berubah; atur kolom `warna` di pengaturan bila ingin warna tetap.
export const WARNA_SERI_WILKER = ['#0f766e', '#f59e0b', '#6366f1', '#ef4444', '#0ea5e9', '#a855f7', '#10b981', '#e11d48', '#84cc16', '#14b8a6'] as const;
