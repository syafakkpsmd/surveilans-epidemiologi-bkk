import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dataMingguan from '@/lib/data/data_mingguan.json';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.local (server-side, tanpa prefix NEXT_PUBLIC_).'
    );
  }
  return createClient(url, key);
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  try {
    // Memasukkan data ke Supabase
    // .upsert akan memperbarui data jika minggu/penyakit sudah ada
    // atau menambah baru jika belum ada
    const { data, error } = await supabase
      .from('penyakit_emerging')
      .upsert(dataMingguan, { 
        onConflict: 'tahun, minggu_epidemiologi, nama_penyakit' 
      });

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Data surveilans berhasil di-import ke database!",
      total_data: dataMingguan.length 
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: "Terjadi kesalahan sistem", 
      error: error 
    }, { status: 500 });
  }
}