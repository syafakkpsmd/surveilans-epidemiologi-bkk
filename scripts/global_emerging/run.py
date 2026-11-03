"""
run.py — orchestrator utama.
Dipanggil oleh GitHub Actions, dua kali per run: mode mingguan & bulanan.

Cara pakai manual (dari folder scripts/global_emerging):
  export SUPABASE_URL=...
  export SUPABASE_SERVICE_ROLE_KEY=...
  python run.py mingguan
  python run.py bulanan
"""

import sys
from sources import owid_covid, owid_mpox
from upload_to_supabase import upsert_baris

# Daftar sumber yang aktif. Tambahkan modul baru di sini kalau nanti ada
# sumber tambahan (mis. sources/ecdc_cdtr.py untuk penyakit lain) —
# setiap modul HARUS punya fungsi ambil_data(jenis) yang me-return list
# baris siap upsert, mengikuti pola owid_covid.py / owid_mpox.py.
SUMBER_AKTIF = [
    owid_covid,
    owid_mpox,
]


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("mingguan", "bulanan"):
        print("Pemakaian: python run.py [mingguan|bulanan]")
        sys.exit(1)

    jenis = sys.argv[1]
    total_upsert = 0
    ada_gagal = False

    for modul in SUMBER_AKTIF:
        nama_modul = modul.__name__
        try:
            print(f"\n=== Menjalankan {nama_modul} ({jenis}) ===")
            baris = modul.ambil_data(jenis)
            jumlah = upsert_baris(baris)
            total_upsert += jumlah
        except Exception as e:
            # Satu sumber gagal TIDAK menghentikan sumber lain — supaya
            # kalau OWID Mpox berubah format kolom misalnya, data Covid-19
            # tetap ter-update.
            print(f"[GAGAL] {nama_modul}: {e}")
            ada_gagal = True

    print(f"\n=== Selesai. Total baris ter-upsert: {total_upsert} ===")

    if ada_gagal:
        # Exit code 1 supaya GitHub Actions menandai run ini "failed" dan
        # kirim notifikasi — meski sebagian sumber berhasil.
        sys.exit(1)


if __name__ == "__main__":
    main()
