import { getPengguna } from "@/lib/auth/session";
import { getDbClient } from "@/lib/db/client";
import { parseKolomJson } from "@/lib/db/json";
import { SimulasiKapalClient } from "@/components/simulasi-wabah/SimulasiKapalClient";
import { PeranUser } from "@/types/database.types";

const WILAYAH_KAPAL = [
  { value: "Samarinda", label: "Pelabuhan Samarinda" },
  { value: "TanjungSantan", label: "Pelabuhan Tanjung Santan" },
  { value: "TanjungLaut", label: "Pelabuhan Tanjung Laut" },
  { value: "Lhoktuan", label: "Pelabuhan Lhoktuan" },
  { value: "Sangatta", label: "Pelabuhan Sangatta" },
  { value: "Sangkulirang", label: "Pelabuhan Sangkulirang" },
] as const;

type Penyakit = { id: number; kategori: string; r0_default: number };

export default async function HalamanSimulasiKapal() {
  const db = getDbClient();

  const [user, { rows: daftarPenyakit }, { rows: daftarWilayah }, { rows: riwayatMentah }] =
    await Promise.all([
      getPengguna(),
      db.execute("SELECT * FROM referensi_parameter_penyakit ORDER BY kategori"),
      db.execute("SELECT kode, nama FROM wilker_ref ORDER BY nama"),
      db.execute("SELECT * FROM simulasi_wabah_kapal ORDER BY created_at DESC LIMIT 20"),
    ]);

  const riwayatSimulasi = riwayatMentah.map((r) =>
    parseKolomJson(r, [
      "hasil_kurva_kapal",
      "hasil_kurva_tkbm",
      "risiko_petugas",
      "daftar_kota_tujuan_lanjutan",
    ])
  );

  return (
    <SimulasiKapalClient
      sudahLogin={!!user}
      role={(user?.role ?? null) as PeranUser | null}
      daftarPenyakit={daftarPenyakit as Penyakit[]}
      daftarWilayah={WILAYAH_KAPAL as unknown as { value: string; label: string }[]}
      riwayatSimulasi={riwayatSimulasi}
    />
  );
}