import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('[auth/callback] hit', { code: code?.slice(0, 8), origin, next })
  console.log('[auth/callback] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[auth/callback] ANON_KEY present:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  console.log('[auth/callback] ANON_KEY prefix:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20))

  if (!code) {
    console.log('[auth/callback] no code param, redirecting to login')
    return NextResponse.redirect(`${origin}/login?error=no-code`)
  }

  const redirectUrl = `${origin}${next}`
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.headers.get('cookie')
            ?.split('; ')
            .map((c) => {
              const [name, ...rest] = c.split('=')
              return { name, value: rest.join('=') }
            }) ?? []
          console.log('[auth/callback] getAll cookies:', cookies.map(c => c.name))
          return cookies
        },
        setAll(cookiesToSet) {
          console.log('[auth/callback] setAll cookies:', cookiesToSet.map(c => c.name))
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession FAILED:', error.message, error.status)
    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
  }

  console.log('[auth/callback] session OK, user:', data.user?.email, 'redirecting to:', redirectUrl)
  console.log('[auth/callback] response cookies being sent:', [...response.cookies.getAll()].map(c => c.name))

  return response
}
