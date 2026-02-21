'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')

      console.log('[auth/callback] client-side hit', {
        code: code?.slice(0, 8) ?? null,
        hasAccessToken: !!accessToken,
        url: window.location.href,
      })

      if (code) {
        console.log('[auth/callback] exchanging code for session...')
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error('[auth/callback] exchange FAILED:', error.message)
          setError(error.message)
          return
        }

        console.log('[auth/callback] session OK, user:', data.user?.email)
        router.replace('/dashboard')
        return
      }

      if (accessToken) {
        console.log('[auth/callback] implicit flow, session should be set')
        router.replace('/dashboard')
        return
      }

      console.error('[auth/callback] no code and no access_token')
      setError('No authentication code received')
    }

    handleCallback()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4">
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-white mb-2">Authentication Error</h1>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <a
            href="/login"
            className="inline-block bg-white text-black font-semibold py-2 px-6 rounded-lg hover:bg-slate-200 transition"
          >
            Try Again
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Signing you in...</p>
      </div>
    </div>
  )
}
