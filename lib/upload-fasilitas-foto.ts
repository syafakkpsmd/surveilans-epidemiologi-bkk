export async function uploadFotoFasilitas(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload-fasilitas", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Upload foto gagal");

  const data = await res.json();
  return data.url;
}