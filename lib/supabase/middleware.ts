import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createHmac } from 'crypto';

const BATAS_INAKTIVITAS_MS = 25 * 60 * 1000; // 25 menit
const NAMA_COOKIE_AKTIVITAS = 'last_activity';
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'min-32-character-secret-key-project';

// --- HELPER SECURITY ---
function makeSignedTimestamp(ms: number): string {
  const val = String(ms);
  const sig = createHmac('sha256', SECRET_KEY).update(val).digest('hex');
  return `${val}.${sig}`;
}

function parseAndVerifyTimestamp(signedVal: string): number | null {
  const parts = signedVal.split('.');
  if (parts.length !== 2) return null;
  const [val, sig] = parts;
  const expectedSig = createHmac('sha256', SECRET_KEY).update(val).digest('hex');
  
  if (sig !== expectedSig) return null; // Tampered!
  const ts = parseInt(val, 10);
  return isNaN(ts) ? null : ts;
}

// --- MAIN FUNCTION ---
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Route auth yang aman dari cek inaktivitas
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth') || 
                      request.nextUrl.pathname === '/login';

  if (user && !isAuthRoute) {
    const rawCookie = request.cookies.get(NAMA_COOKIE_AKTIVITAS)?.value;
    const sekarang = Date.now();

    if (rawCookie) {
      const waktuTerakhir = parseAndVerifyTimestamp(rawCookie);

      // Jika cookie dimanipulasi/invalid ATAU sudah lewat batas inaktivitas -> FORCE LOGOUT
      if (waktuTerakhir === null || (sekarang - waktuTerakhir > BATAS_INAKTIVITAS_MS)) {
        await supabase.auth.signOut();
        
        const finalResponse = NextResponse.next({ request });
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          finalResponse.cookies.set(cookie.name, cookie.value, cookie);
        });

        finalResponse.cookies.delete(NAMA_COOKIE_AKTIVITAS);
        return finalResponse;
      }
    }

    // Set signed cookie baru
    supabaseResponse.cookies.set(NAMA_COOKIE_AKTIVITAS, makeSignedTimestamp(sekarang), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }

  if (!user && request.cookies.has(NAMA_COOKIE_AKTIVITAS)) {
    supabaseResponse.cookies.delete(NAMA_COOKIE_AKTIVITAS);
  }

  return supabaseResponse;
}