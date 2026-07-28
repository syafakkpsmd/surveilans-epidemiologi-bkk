import PeraturanClient from "@/components/peraturan/PeraturanClient";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";

export default async function PeraturanPage() {
  const { role } = await getStatusAkses();
  return <PeraturanClient bolehKelola={role === "admin" || role === "petugas"} />;
}