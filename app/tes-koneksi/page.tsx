import { getRingkasanMingguan } from "@/lib/supabase/queries";

/**
 * HALAMAN SEMENTARA -- hanya untuk verifikasi manual bahwa koneksi
 * Supabase & view sudah benar. HAPUS folder ini setelah Segmen 5
 * (Dashboard) selesai dan sudah terbukti menampilkan data asli di sana.
 */
export default async function TesKoneksiPage() {
  const tahunSekarang = new Date().getFullYear();

  let hasilCop: unknown = null;
  let errorCop: string | null = null;
  let hasilPhqc: unknown = null;
  let errorPhqc: string | null = null;

  try {
    hasilCop = await getRingkasanMingguan("cop", tahunSekarang);
  } catch (err) {
    errorCop = err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui.";
  }

  try {
    hasilPhqc = await getRingkasanMingguan("phqc", tahunSekarang);
  } catch (err) {
    errorPhqc = err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui.";
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "monospace",
        background: "#EEF1F4",
        minHeight: "100vh",
        color: "#1B2733",
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        Tes Koneksi Supabase
      </h1>
      <p style={{ fontSize: 13, color: "#5B7083", marginBottom: 24 }}>
        Halaman sementara -- hapus folder app/tes-koneksi setelah Segmen 5 selesai.
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>
          view_mingguan_ringkasan (COP)
        </h2>
        {errorCop ? (
          <pre style={{ color: "#D62839", background: "#fff", padding: 12, borderRadius: 8 }}>
            ERROR: {errorCop}
          </pre>
        ) : (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#fff",
              padding: 12,
              borderRadius: 8,
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            {JSON.stringify(hasilCop, null, 2)}
          </pre>
        )}
      </section>

      <section>
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>
          view_mingguan_ringkasan_phqc (PHQC)
        </h2>
        {errorPhqc ? (
          <pre style={{ color: "#D62839", background: "#fff", padding: 12, borderRadius: 8 }}>
            ERROR: {errorPhqc}
          </pre>
        ) : (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#fff",
              padding: 12,
              borderRadius: 8,
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            {JSON.stringify(hasilPhqc, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
