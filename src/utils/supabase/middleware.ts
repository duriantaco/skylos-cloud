import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = request.cookies.getAll();
          console.log('[supabase/middleware] getAll cookies:', all.map(c => c.name));
          return all;
        },
        setAll(cookiesToSet) {
          console.log('[supabase/middleware] setAll cookies:', cookiesToSet.map(c => c.name));
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  console.log('[supabase/middleware] getUser:', { user: user?.email ?? null, error: error?.message ?? null });

  return supabaseResponse;
}
