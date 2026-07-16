"""
sources/owid_mpox.py
Sumber: Our World in Data — data mpox dari WHO (kasus terkonfirmasi) &
Africa CDC (kasus suspek). URL didokumentasikan resmi di
https://github.com/owid/monkeypox (README repo tsb). Update per jam oleh OWID.
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
    df = pd.read_csv(URL_CSV)

    # CATATAN: kalau kolom di CSV asli namanya beda dari asumsi di bawah
    # (mis. 'new_cases' vs 'new_confirmed_cases'), scraper akan error
    # KeyError saat pertama kali dijalankan — cek nama kolom asli dengan
    # print(df.columns.tolist()) kalau itu terjadi, lalu sesuaikan di sini.
    kolom_kasus = "new_cases" if "new_cases" in df.columns else "new_confirmed_cases"
    kolom_kematian = "new_deaths" if "new_deaths" in df.columns else "new_confirmed_deaths"

    df = df[df["location"].isin(NEGARA_OWID_KE_LOKAL.keys())].copy()
    df["date"] = pd.to_datetime(df["date"])

    if not FULL_BACKFILL:
        batas = pd.Timestamp.today() - pd.Timedelta(days=HARI_TERAKHIR)
        df = df[df["date"] >= batas]

    df[kolom_kasus] = df[kolom_kasus].fillna(0)
    df[kolom_kematian] = df[kolom_kematian].fillna(0)

    baris_hasil = []

    if jenis == "mingguan":
        df[["tahun_epid", "minggu_epid"]] = df["date"].apply(
            lambda d: pd.Series(_epiweek_dari_tanggal(d))
        )
        grup = df.groupby(["location", "tahun_epid", "minggu_epid"], as_index=False).agg(
            jumlah_kasus=(kolom_kasus, "sum"), jumlah_kematian=(kolom_kematian, "sum")
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
            jumlah_kasus=(kolom_kasus, "sum"), jumlah_kematian=(kolom_kematian, "sum")
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
