import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { NavbarClient } from "./NavbarClient";

export async function Navbar() {
  const { sudahLogin, role } = await getStatusAkses();
  return <NavbarClient sudahLogin={sudahLogin} role={role} />;
}
