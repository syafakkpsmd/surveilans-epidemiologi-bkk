import { History, Globe, Crown, UserCheck } from 'lucide-react';

export interface RecentActivity {
  tgl: string;
  role: string;
  ket: string;
  daerah: string;
}

interface Props {
  logs: RecentActivity[];
}

export default function AktivitasTerakhirList({ logs }: Props) {
  return (
    <div className="bg-white rounded-[10px] border border-black/5 p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <History size={18} className="text-[#0F4C5C]" />
        <h2 className="text-sm font-semibold text-[#0F2A38]">10 Aktivitas Terakhir</h2>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-100 flex-1">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1E2B58] text-white">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Waktu</th>
              <th className="py-2.5 px-3 font-semibold">Tipe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs && logs.length > 0 ? (
              logs.map((log, idx) => {
                const isAdmin = log.role === 'admin' || log.ket === 'admin';
                const isPetugas = log.role === 'petugas';

                return (
                  <tr key={idx} className="hover:bg-slate-50 text-[#0F2A38]/80 transition-colors">
                    <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                      {log.tgl}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        {isAdmin ? (
                          <>
                            <Crown size={14} className="text-amber-500" />
                            <span className="font-medium text-amber-700">Admin</span>
                          </>
                        ) : isPetugas ? (
                          <>
                            <UserCheck size={14} className="text-emerald-500" />
                            <span className="font-medium text-emerald-700">Petugas</span>
                          </>
                        ) : (
                          <>
                            <Globe size={14} className="text-sky-500" />
                            <span>Halaman</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={2} className="py-6 text-center text-slate-400">
                  Belum ada catatan aktivitas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}