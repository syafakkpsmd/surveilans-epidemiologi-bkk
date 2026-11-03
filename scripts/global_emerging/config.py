"""
config.py — konfigurasi bersama untuk semua scraper modul Global Emerging.
"""

import os

# 13 negara fokus (asal kapal ke wilayah kerja Samarinda) — HARUS SAMA PERSIS
# dengan constraint kolom `negara` di tabel laporan_penyakit_emerging.
DAFTAR_NEGARA_LOKAL = [
    "China", "Filipina", "Hong Kong", "Singapura", "Vietnam", "Malaysia",
    "India", "Korea Selatan", "Taiwan", "Arab Saudi", "Jepang", "Thailand",
    "Bangladesh",
]

# Mapping nama negara versi OWID (bahasa Inggris, sesuai kolom `location`
# di CSV mereka) -> nama lokal yang dipakai di tabel Supabase.
# PENTING: kalau OWID ganti penulisan nama negara, mapping ini yang perlu
# disesuaikan (bukan skema database).
NEGARA_OWID_KE_LOKAL = {
    "China": "China",
    "Philippines": "Filipina",
    "Hong Kong": "Hong Kong",
    "Singapore": "Singapura",
    "Vietnam": "Vietnam",
    "Malaysia": "Malaysia",
    "India": "India",
    "South Korea": "Korea Selatan",
    "Taiwan": "Taiwan",
    "Saudi Arabia": "Arab Saudi",
    "Japan": "Jepang",
    "Thailand": "Thailand",
    "Bangladesh": "Bangladesh",
}

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib di-set sebagai "
        "environment variable (GitHub Secrets saat jalan di Actions)."
    )
