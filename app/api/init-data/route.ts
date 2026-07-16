import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Menggunakan alias @/ yang umum di Next.js untuk akses ke folder root
import dataMingguan from '@/lib/data/data_mingguan.json';

const supabase = createClient(
  process.env.SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
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