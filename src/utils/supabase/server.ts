import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = cookieStore.getAll();
          console.log('[supabase/server] getAll cookies:', all.map(c => c.name));
          return all;
        },
        setAll(cookiesToSet) {
          try {
            console.log('[supabase/server] setAll cookies:', cookiesToSet.map(c => c.name));
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (e) {
            console.log('[supabase/server] setAll FAILED (Server Component):', (e as Error).message);
          }
        },
      },
    }
  );
}
