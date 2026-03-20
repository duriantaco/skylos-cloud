'use client'

import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { buildTopologyFromScan, type CityTopology } from '@/lib/city-layout'

// Dynamic import to avoid SSR issues with Three.js
const CityScene = dynamic(() => import('@/components/city/CityScene'), { ssr: false })

type ScanRow = {
  id: string
  result: Record<string, unknown> | null
  project_id: string
  branch: string
  commit_hash: string
}

export default function CityViewPage() {
  const params = useParams()
  const router = useRouter()
  const scanId = params.id as string

  const [scan, setScan] = useState<ScanRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [deadFromFindings, setDeadFromFindings] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error: fetchErr } = await supabase
        .from('scans')
        .select('id, result, project_id, branch, commit_hash')
        .eq('id', scanId)
        .single()

      if (fetchErr || !data) {
        setError(fetchErr?.message ?? 'Scan not found')
        setLoading(false)
        return
      }

      // Also fetch dead code findings for this scan as fallback
      const { data: deadFindings } = await supabase
        .from('findings')
        .select('message, file_path')
        .eq('scan_id', scanId)
        .eq('category', 'DEAD_CODE')

      if (deadFindings?.length) {
        const names = new Set<string>()
        for (const f of deadFindings) {
          const match = f.message?.match(/Dead code:\s*(.+)/)
          if (match) names.add(match[1])
        }
        setDeadFromFindings(names)
      }

      setScan(data)
      setLoading(false)
    }
    load()
  }, [scanId, router])

  const topology = useMemo<CityTopology | null>(() => {
    if (!scan?.result) return null

    const result = scan.result as Record<string, unknown>
    const definitions = (result.definitions ?? {}) as Record<string, {
      name: string; file: string; line: number; type: string;
      loc?: number; complexity?: number;
      calls?: string[]; called_by?: string[];
      dead?: boolean;
    }>

    // Collect dead names from unused lists (if stored) and findings fallback
    const deadNames = new Set<string>(deadFromFindings)
    for (const key of ['unused_functions', 'unused_imports', 'unused_classes', 'unused_variables', 'unused_parameters']) {
      const items = (result[key] ?? []) as { name?: string }[]
      for (const item of items) {
        if (item.name) deadNames.add(item.name)
      }
    }

    return buildTopologyFromScan(definitions, deadNames)
  }, [scan, deadFromFindings])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">
        Loading city...
      </div>
    )
  }

  if (error || !topology) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-gray-400 gap-4">
        <div>{error ?? 'No definitions data. Re-upload scan with latest skylos to enable City View.'}</div>
        <Link href={`/dashboard/scans/${scanId}`} className="text-blue-400 hover:underline">
          Back to scan
        </Link>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <Link
          href={`/dashboard/scans/${scanId}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-white font-semibold">Code City</h1>
        <span className="text-gray-500 text-sm">
          {scan?.branch} @ {scan?.commit_hash?.slice(0, 7)}
        </span>
      </div>

      {/* 3D Scene */}
      <div className="flex-1">
        <CityScene topology={topology} />
      </div>
    </div>
  )
}
