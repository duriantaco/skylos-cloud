'use client'

import { createClient } from '@/utils/supabase/client'
import { Github } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    console.log('[login] starting OAuth, redirectTo:', `${location.origin}/auth/callback`)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        skipBrowserRedirect: false,
      },
    })
    console.log('[login] signInWithOAuth result:', { url: data?.url, error: error?.message ?? null })
    if (error) alert(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#02040a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
       {/* Background Glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gray-500/10 rounded-full blur-[120px] pointer-events-none"></div>

       <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 relative z-10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to Skylos</h1>
            <p className="text-slate-400 text-sm">Sign in to manage your organization policies.</p>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
                <span className="animate-pulse">Redirecting...</span>
            ) : (
                <>
                    <Github className="w-5 h-5" />
                    Continue with GitHub
                </>
            )}
          </button>

          <p className="text-center text-xs text-slate-600 mt-6">
            By clicking continue, you agree to our Terms of Service and Privacy Policy.
          </p>
       </div>
    </div>
  )
}
