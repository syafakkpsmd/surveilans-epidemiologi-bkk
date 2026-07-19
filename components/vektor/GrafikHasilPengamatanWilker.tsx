'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function GrafikHasilPengamatanWilker({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="kode_wilker" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="memenuhi_syarat" name="Memenuhi Syarat" fill="#16A34A" />
        <Bar dataKey="tidak_memenuhi_syarat" name="Tidak Memenuhi Syarat" fill="#DC2626" />
      </BarChart>
    </ResponsiveContainer>
  );
}