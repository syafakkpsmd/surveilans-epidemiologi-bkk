"""
sources/owid_mpox.py
Sumber: Our World in Data — data mpox dari WHO (kasus terkonfirmasi) &
Africa CDC (kasus suspek). URL resmi (dikonfirmasi dari README repo
owid/monkeypox, per Juli 2026):
https://catalog.ourworldindata.org/explorers/who/latest/monkeypox/monkeypox.csv

CATATAN: ini format "Explorer" OWID, strukturnya bisa beda dari CSV data
biasa (kemungkinan pakai kolom Entity/Day, bukan location/date, atau ada
kolom anotasi tercampur). Kode di bawah dibuat defensif: deteksi nama
kolom otomatis dulu, dan buang kolom duplikat/anotasi yang bisa bikin
error "Columns must be same length as key".
"""

import os
import sys
import pandas as pd
from epiweeks import Week

sys.path.append("..")
from config import NEGARA_OWID_KE_LOKAL

URL_CSV = "https://catalog.ourworldindata.org/explorers/who/latest/monkeypox/monkeypox.csv"
PENYAKIT = "Mpox"
SUMBER = "OWID (WHO Mpox Dashboard)"

FULL_BACKFILL = os.environ.get("FULL_BACKFILL", "false").lower() == "true"
HARI_TERAKHIR = 90


def _epiweek_dari_tanggal(tanggal: pd.Timestamp) -> tuple[int, int]:
    w = Week.fromdate(tanggal.date())
    return w.year, w.week


def ambil_data(jenis: str) -> list[dict]:
    print(f"[owid_mpox] Mengunduh {URL_CSV} ...")

    # Baca header dulu saja untuk deteksi struktur kolom sebenarnya,
    # tanpa memuat seluruh file (bisa besar & formatnya tidak pasti).
    df_cek = pd.read_csv(URL_CSV, nrows=5, low_memory=False)
    kolom_tersedia = df_cek.columns.tolist()
    print(f"[owid_mpox] Kolom terdeteksi: {kolom_tersedia}")

    def cari_kolom(kandidat: list[str]):
        for k in kandidat:
            if k in kolom_tersedia:
                return k
        return None

    kolom_lokasi = cari_kolom(["location", "country", "Entity"])
    kolom_tanggal = cari_kolom(["date", "Day", "year", "Year"])
    kolom_kasus = cari_kolom([
        "new_cases", "new_confirmed_cases", "new_cases_confirmed",
        "confirmed_cases_new", "New confirmed cases",
    ])
    kolom_kematian = cari_kolom([
        "new_deaths", "new_confirmed_deaths", "new_deaths_confirmed",
        "confirmed_deaths_new", "New confirmed deaths",
    ])

    if not all([kolom_lokasi, kolom_tanggal, kolom_kasus, kolom_kematian]):
        raise KeyError(
            "Tidak semua kolom yang dibutuhkan ketemu di CSV mpox. "
            f"lokasi={kolom_lokasi}, tanggal={kolom_tanggal}, "
            f"kasus={kolom_kasus}, kematian={kolom_kematian}. "
            f"Kolom yang tersedia: {kolom_tersedia}. "
            "Sesuaikan daftar kandidat nama kolom di owid_mpox.py."
        )

    kolom_dipakai = [kolom_lokasi, kolom_tanggal, kolom_kasus, kolom_kematian]
    df = pd.read_csv(URL_CSV, usecols=kolom_dipakai, low_memory=False)

    # Buang kolom duplikat kalau ada (penyebab umum error "Columns must
    # be same length as key" saat assignment multi-kolom nanti).
    df = df.loc[:, ~df.columns.duplicated()]

    df = df.rename(columns={
        kolom_lokasi: "location",
        kolom_tanggal: "date",
        kolom_kasus: "new_cases",
        kolom_kematian: "new_deaths",
    })

    df = df[df["location"].isin(NEGARA_OWID_KE_LOKAL.keys())].copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])

    if not FULL_BACKFILL:
        batas = pd.Timestamp.today() - pd.Timedelta(days=HARI_TERAKHIR)
        df = df[df["date"] >= batas]

    df["new_cases"] = pd.to_numeric(df["new_cases"], errors="coerce").fillna(0)
    df["new_deaths"] = pd.to_numeric(df["new_deaths"], errors="coerce").fillna(0)

    baris_hasil = []

    if df.empty:
        print("[owid_mpox] Tidak ada baris tersisa setelah filter negara/tanggal.")
        return baris_hasil

    if jenis == "mingguan":
        hasil_epiweek = df["date"].apply(lambda d: _epiweek_dari_tanggal(d))
        df["tahun_epid"] = [t for t, _ in hasil_epiweek]
        df["minggu_epid"] = [m for _, m in hasil_epiweek]
        grup = df.groupby(["location", "tahun_epid", "minggu_epid"], as_index=False).agg(
            jumlah_kasus=("new_cases", "sum"), jumlah_kematian=("new_deaths", "sum")
        )
        for _, r in grup.iterrows():
            baris_hasil.append({
                "penyakit": PENYAKIT,
                "negara": NEGARA_OWID_KE_LOKAL[r["location"]],
                "jenis_periode": "mingguan",
                "tahun_epid": int(r["tahun_epid"]),
                "minggu_epid": int(r["minggu_epid"]),
                "bulan": 0,
                "jumlah_kasus": int(r["jumlah_kasus"]),
                "jumlah_kematian": int(r["jumlah_kematian"]),
                "sumber": SUMBER,
            })
    else:
        df["tahun_epid"] = df["date"].dt.year
        df["bulan"] = df["date"].dt.month
        grup = df.groupby(["location", "tahun_epid", "bulan"], as_index=False).agg(
            jumlah_kasus=("new_cases", "sum"), jumlah_kematian=("new_deaths", "sum")
        )
        for _, r in grup.iterrows():
            baris_hasil.append({
                "penyakit": PENYAKIT,
                "negara": NEGARA_OWID_KE_LOKAL[r["location"]],
                "jenis_periode": "bulanan",
                "tahun_epid": int(r["tahun_epid"]),
                "minggu_epid": 0,
                "bulan": int(r["bulan"]),
                "jumlah_kasus": int(r["jumlah_kasus"]),
                "jumlah_kematian": int(r["jumlah_kematian"]),
                "sumber": SUMBER,
            })

    print(f"[owid_mpox] {len(baris_hasil)} baris ({jenis}) siap upsert.")
    return baris_hasil
