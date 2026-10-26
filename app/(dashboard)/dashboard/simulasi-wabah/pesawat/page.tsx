import { getPengguna } from "@/lib/auth/session";
import { getDbClient } from "@/lib/db/client";
import { parseKolomJson } from "@/lib/db/json";
import { SimulasiPesawatClient } from "@/components/simulasi-wabah/SimulasiPesawatClient";

type Penyakit = { id: number; kategori: string; r0_default: number };
type Wilker = { kode: string; nama: string };

export default async function HalamanSimulasiPesawat() {
  const db = getDbClient();

  const [user, { rows: daftarPenyakit }, { rows: daftarWilker }, { rows: riwayatMentah }] =
    await Promise.all([
      getPengguna(),
      db.execute("SELECT * FROM referensi_parameter_penyakit ORDER BY kategori"),
      db.execute("SELECT kode, nama FROM wilker_ref WHERE jenis = 'Bandara' ORDER BY nama"),
      db.execute("SELECT * FROM simulasi_wabah_pesawat ORDER BY created_at DESC LIMIT 20"),
    ]);

  const riwayatSimulasi = riwayatMentah.map((r) =>
    parseKolomJson(r, ["daftar_kota_tujuan_lanjutan", "risiko_ground_crew"])
  );

  return (
    <SimulasiPesawatClient
      sudahLogin={!!user}
      role={user?.role ?? null}
      daftarPenyakit={daftarPenyakit as Penyakit[]}
      daftarWilker={daftarWilker as Wilker[]}
      riwayatSimulasi={riwayatSimulasi}
    />
  );
}