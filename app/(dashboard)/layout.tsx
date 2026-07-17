import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import SidebarNav from "@/components/SidebarNav";
import { SidebarProvider } from "@/components/SidebarContext";
import { catatPageLoad } from "@/lib/analytics/log";
import { getUserRole } from "@/lib/auth/get-user-role";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getUserRole();
  catatPageLoad(role).catch((err) => {
    console.error("Gagal mencatat page load:", err);
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />

        <div className="flex flex-1 items-stretch">
          <SidebarNav role={role} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>

        <Footer />
      </div>
    </SidebarProvider>
  );
}