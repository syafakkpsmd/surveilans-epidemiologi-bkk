export function Footer() {
  const tahun = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border bg-surface px-4 py-4 text-center text-xs text-muted">
      BKK Kelas I Samarinda · Ditjen P2, Kementerian Kesehatan RI · {tahun}
    </footer>
  );
}
