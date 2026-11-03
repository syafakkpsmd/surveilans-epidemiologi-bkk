"""
upload_to_supabase.py — upsert baris hasil scraping ke tabel
laporan_penyakit_emerging, pakai service_role key (bypass RLS).
"""

from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

_client = None


def get_client():
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


def upsert_baris(baris: list[dict]) -> int:
    """
    Upsert list baris ke laporan_penyakit_emerging.
    Mengandalkan UNIQUE constraint
      (penyakit, negara, jenis_periode, tahun_epid, minggu_epid, bulan, sumber)
    yang sudah dibuat di skema tabel, supaya re-run tidak duplikat.

    Return: jumlah baris yang berhasil di-upsert.
    """
    if not baris:
        return 0

    client = get_client()
    hasil = (
        client.table("laporan_penyakit_emerging")
        .upsert(
            baris,
            on_conflict="penyakit,negara,jenis_periode,tahun_epid,minggu_epid,bulan,sumber",
        )
        .execute()
    )
    jumlah = len(hasil.data) if hasil.data else 0
    print(f"  -> upsert berhasil: {jumlah} baris")
    return jumlah
