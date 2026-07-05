export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted">
        BKK Kelas I Samarinda
      </div>
      <h1 className="text-2xl font-bold text-ink">
        Surveilans Epidemiologi
      </h1>
      <p className="max-w-md text-sm text-muted">
        Scaffold Segmen 1 berhasil berjalan. Halaman ini akan diganti dengan
        redirect ke /login atau /dashboard setelah Segmen 3 (Autentikasi)
        selesai.
      </p>
    </main>
  );
}
