'use client';

import { useState, useTransition } from 'react';
import { approveUser, suspendUser, deleteUser, updateUserNama } from '@/lib/auth/admin-actions';
import { Pencil, Check, X } from 'lucide-react';

interface Props {
  id: string;
  namaAwal: string;
  role: string;
  status: string;
}

export default function UserRow({ id, namaAwal, role, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nama, setNama] = useState(namaAwal);

  const simpanNama = () => {
    startTransition(async () => {
      await updateUserNama(id, nama);
      setEditing(false);
    });
  };

  return (
    <tr>
      <td className="px-4 py-3 align-middle">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              autoFocus
              className="w-full rounded-[6px] border border-black/10 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
            />
            <button
              onClick={simpanNama}
              disabled={isPending}
              className="p-1.5 rounded-[6px] bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              title="Simpan"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setNama(namaAwal);
                setEditing(false);
              }}
              className="p-1.5 rounded-[6px] bg-gray-200 text-[#0F2A38] hover:bg-gray-300"
              title="Batal"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[#0F2A38] font-medium">{namaAwal || '(tanpa nama)'}</span>
            <button
              onClick={() => setEditing(true)}
              className="text-[#0F2A38]/40 hover:text-[#0F4C5C]"
              title="Edit nama"
            >
              <Pencil size={13} />
            </button>
          </div>
        )}
      </td>

      <td className="px-4 py-3 align-middle capitalize text-[#0F2A38]/80">{role}</td>

      <td className="px-4 py-3 align-middle">
        <span
          className={
            status === 'approved'
              ? 'text-green-600 font-medium'
              : status === 'suspended'
              ? 'text-[#D62839] font-medium'
              : 'text-amber-600 font-medium'
          }
        >
          {status}
        </span>
      </td>

      <td className="px-4 py-3 align-middle text-right">
        <div className="flex justify-end gap-2">
          {status !== 'approved' ? (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => approveUser(id))}
              className="text-xs px-3 py-1.5 rounded-[6px] bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Setujui
            </button>
          ) : (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => suspendUser(id))}
              className="text-xs px-3 py-1.5 rounded-[6px] bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Suspend
            </button>
          )}
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm('Hapus user ini secara permanen?')) {
                startTransition(() => deleteUser(id));
              }
            }}
            className="text-xs px-3 py-1.5 rounded-[6px] bg-[#D62839] text-white hover:bg-[#B01F30] disabled:opacity-50"
          >
            Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}