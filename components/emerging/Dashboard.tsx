"use client";
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Users, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Mengambil data dari API yang kita buat sebelumnya
    fetch('/api/data-surveilans') // Pastikan Anda buat route GET ini di Supabase
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Surveilans Epidemiologi</h1>
      
      {/* Kartu Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border rounded-lg flex items-center gap-4">
          <Activity className="text-blue-600" />
          <div>
            <p className="text-sm text-gray-600">Total Kasus</p>
            <p className="text-xl font-bold">{data.reduce((acc, curr) => acc + curr.jumlah_kasus, 0)}</p>
          </div>
        </div>
      </div>

      {/* Grafik Tren */}
      <div className="h-96 bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Tren Kasus Mingguan</h2>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="minggu_epidemiologi" label={{ value: 'Minggu', position: 'bottom' }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="jumlah_kasus" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}