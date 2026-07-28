import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import DashboardNasionalEmerging from '@/components/nasional-emerging/DashboardNasionalEmerging';

export default async function NasionalEmergingPage() {
  const { sudahLogin, role } = await getStatusAkses();
  return <DashboardNasionalEmerging sudahLogin={sudahLogin} role={role} />;
}