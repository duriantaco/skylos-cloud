'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      console.log('[auth/callback] checking session...')
      console.log('[auth/callback] hash:', window.location.hash ? 'present' : 'empty')
      console.log('[auth/callback] search:', window.location.search || 'empty')

      // With implicit flow, Supabase JS auto-detects the hash fragment
      // and sets the session. We just need to wait for it.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      console.log('[auth/callback] getSession:', {
        user: session?.user?.email ?? null,
        error: sessionError?.message ?? null,
      })

      if (session) {
        console.log('[auth/callback] session found, redirecting to dashboard')
        router.replace('/dashboard')
        return
      }

      // If no session yet, try listening for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[auth/callback] onAuthStateChange:', event, session?.user?.email)
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          router.replace('/dashboard')
        }
      })

      // Timeout after 5 seconds
      setTimeout(() => {
        subscription.unsubscribe()
        console.error('[auth/callback] timed out waiting for session')
        setError('Authentication timed out. Please try again.')
      }, 5000)
    }

    handleCallback()
  }, [router])

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
