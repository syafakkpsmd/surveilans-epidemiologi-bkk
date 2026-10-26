import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { pakaiMariaDbUntukPengguna } from "@/lib/db/hybrid";

export async function createClient() {
  const cookieStore = await cookies();

  const klien = createServerClient<Database>(  // 👈 tambahkan <Database> di sini
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // aman diabaikan, sudah ditangani middleware
          }
        },
      },
    }
  );
  // DATA_BACKEND=mariadb: .from()/.rpc() ke MariaDB (RLS ditiru di server); .auth tetap Supabase.
  return pakaiMariaDbUntukPengguna(klien);
}
