import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client untuk dipakai di Server Component, Server Action, atau
 * Route Handler. HARUS dipanggil ulang di setiap request (async function),
 * karena bergantung pada cookies() yang scope-nya per-request di Next.js.
 *
 * Next.js 15: cookies() sekarang async, jadi fungsi ini juga async dan
 * WAJIB di-await di pemanggilnya:
 *   const supabase = await createClient();
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // setAll dipanggil dari Server Component (bukan Server Action/
            // Route Handler) akan gagal karena Server Component tidak boleh
            // menulis cookie. Ini AMAN diabaikan selama middleware.ts sudah
            // menangani refresh session di setiap request.
          }
        },
      },
    }
  );
}
