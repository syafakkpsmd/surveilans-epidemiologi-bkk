import { ambilDataSiaos } from '@/lib/turso/queriesSiaos';
import SiaosClient from './SiaosClient';

// Data selalu diambil langsung dari Turso saat request, tidak di-cache statis
export const dynamic = 'force-dynamic';

export default async function SiaosPage() {
  const data = await ambilDataSiaos();

  return <SiaosClient data={data} />;
}