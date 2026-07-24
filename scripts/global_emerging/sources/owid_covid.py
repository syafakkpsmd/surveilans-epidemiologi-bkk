"""
sources/owid_covid.py
Sumber: Our World in Data — data.covid diproses dari WHO COVID-19 Dashboard.
URL stabil, didokumentasikan resmi di https://docs.owid.io/projects/etl/api/covid/
Update harian.
"""

import os
import sys
import pandas as pd
from epiweeks import Week

sys.path.append("..")
from config import NEGARA_OWID_KE_LOKAL

URL_CSV = "https://catalog.ourworldindata.org/garden/covid/latest/compact/compact.csv"
PENYAKIT = "Covid-19"
SUMBER = "OWID (WHO COVID-19 Dashboard)"

# Default: hanya proses 90 hari terakhir tiap run (cukup untuk minggu/bulan
# berjalan + koreksi data terlambat), supaya tidak upload ulang histori
# bertahun-tahun tiap minggu. Untuk backfill data lama sekali saja,
# jalankan manual dengan env FULL_BACKFILL=true.
FULL_BACKFILL = os.environ.get("FULL_BACKFILL", "false").lower() == "true"
HARI_TERAKHIR = 90


def _epiweek_dari_tanggal(tanggal: pd.Timestamp) -> tuple[int, int]:
    w = Week.fromdate(tanggal.date())
    return w.year, w.week


def ambil_data(jenis: str) -> list[dict]:
    """
    jenis: 'mingguan' atau 'bulanan'
    Return: list baris siap upsert ke laporan_penyakit_emerging.
    """
    print(f"[owid_covid] Mengunduh {URL_CSV} ...")
    df_penuh = pd.read_csv(URL_CSV, nrows=5)
    kolom_tersedia = df_penuh.columns.tolist()
    print(f"[owid_covid] Kolom terdeteksi: {kolom_tersedia}")

    def cari_kolom(kandidat: list[str]) -> str:
        for k in kandidat:
            if k in kolom_tersedia:
                return k
        raise KeyError(
            f"Tidak ada kolom yang cocok dari kandidat {kandidat}. "
            f"Kolom yang tersedia di CSV: {kolom_tersedia}"
        )

    kolom_lokasi = cari_kolom(["location", "country", "Entity"])
    kolom_tanggal = cari_kolom(["date", "Day", "year"])
    kolom_kasus = cari_kolom(["new_cases", "cases_new", "new_confirmed"])
    kolom_kematian = cari_kolom(["new_deaths", "deaths_new", "new_confirmed_deaths"])

    df = pd.read_csv(
        URL_CSV,
        usecols=[kolom_lokasi, kolom_tanggal, kolom_kasus, kolom_kematian],
    )
    df = df.rename(columns={
        kolom_lokasi: "location",
        kolom_tanggal: "date",
        kolom_kasus: "new_cases",
        kolom_kematian: "new_deaths",
    })
    df = df[df["location"].isin(NEGARA_OWID_KE_LOKAL.keys())].copy()
    df["date"] = pd.to_datetime(df["date"])

    if not FULL_BACKFILL:
        batas = pd.Timestamp.today() - pd.Timedelta(days=HARI_TERAKHIR)
        df = df[df["date"] >= batas]
        print(f"[owid_covid] Mode normal: hanya proses data sejak {batas.date()}. "
              f"Untuk backfill penuh, set env FULL_BACKFILL=true.")

    df["new_cases"] = df["new_cases"].fillna(0)
    df["new_deaths"] = df["new_deaths"].fillna(0)

    baris_hasil = []

    if jenis == "mingguan":
        df[["tahun_epid", "minggu_epid"]] = df["date"].apply(
            lambda d: pd.Series(_epiweek_dari_tanggal(d))
        )
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
    else:  # bulanan
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

    print(f"[owid_covid] {len(baris_hasil)} baris ({jenis}) siap upsert.")
    return baris_hasil
