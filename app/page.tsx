import { redirect } from "next/navigation";

export default function RootPage() {
  // Tamu langsung ke dashboard, tanpa wajib login (lihat KONTEKS PROYEK).
  redirect("/dashboard");
}
