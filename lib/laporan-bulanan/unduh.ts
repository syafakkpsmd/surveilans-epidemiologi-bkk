/** Memicu unduhan berkas di browser. Hanya dipanggil dari Client Component. */
export function unduhBerkas(data: Blob | Uint8Array, nama: string, mime: string): void {
  // Salin ke ArrayBuffer baru agar cocok dengan tipe BlobPart di semua versi TypeScript.
  const blob = data instanceof Blob ? data : new Blob([new Uint8Array(data).buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
