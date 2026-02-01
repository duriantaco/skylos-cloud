'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'

export default function CreateWorkspaceModal({ 
  userEmail, 
  userId 
}: { 
  userEmail: string
  userId: string 
}) {
  const router = useRouter()
  const [name, setName] = useState(`${userEmail.split('@')[0]}'s Workspace`)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Workspace name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      
      const { error: rpcError } = await supabase.rpc('init_workspace', {
        p_user_id: userId,
        p_user_email: userEmail,
        p_org_name: name.trim()
      })

      if (rpcError) {
        // If RPC doesn't support p_org_name, fall back to basic version
        if (rpcError.message.includes('p_org_name')) {
          const { error: fallbackError } = await supabase.rpc('init_workspace', {
            p_user_id: userId,
            p_user_email: userEmail,
          })
          if (fallbackError) throw fallbackError
          
          // Update org name separately
          const { data: member } = await supabase
            .from('organization_members')
            .select('org_id')
            .eq('user_id', userId)
            .single()
          
          if (member?.org_id) {
            await supabase
              .from('organizations')
              .update({ name: name.trim() })
              .eq('id', member.org_id)
          }
        } else {
          throw rpcError
        }
      }

      router.refresh()
    } catch (e: any) {
      console.error('Workspace creation error:', e)
      setError(e.message || 'Failed to create workspace')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-500 to-purple-600 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome to Skylos!</h2>
          <p className="text-indigo-100 mt-2 text-sm">Let's set up your workspace</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Workspace Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workspace"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) handleCreate()
            }}
          />
          
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}

          <p className="mt-3 text-xs text-slate-500">
            You can change this later in settings.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full py-3 px-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Workspace'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}