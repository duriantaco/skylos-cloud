'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Trash2, Download, MoreVertical } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

type Props = {
  scanId: string
  scanCommit?: string | null
  onDeleted?: () => void
  showLabels?: boolean
}

export default function ScanActions({ scanId, scanCommit, onDeleted, showLabels = false }: Props) {
  const router = useRouter()
  const btnRef = useRef<HTMLButtonElement | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState('Successfully deleted.')

  const [pos, setPos] = useState<{ top: number; left: number; placement: 'down' | 'up' }>({
    top: 0,
    left: 0,
    placement: 'down',
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!showMenu) 
        return
    const el = btnRef.current
    if (!el) 
        return

    const rect = el.getBoundingClientRect()
    const menuW = 180
    const menuH = 160

    const spaceBelow = window.innerHeight - rect.bottom
    const placement: 'down' | 'up' = spaceBelow < menuH + 8 ? 'up' : 'down'

    const top = placement === 'down'
      ? rect.bottom + 6
      : rect.top - menuH - 6

    const left = Math.min(rect.right - menuW, window.innerWidth - menuW - 8)

    setPos({ top, left, placement })

    const onRecalc = () => {
      const r = el.getBoundingClientRect()
      const sb = window.innerHeight - r.bottom
      const plc: 'down' | 'up' = sb < menuH + 8 ? 'up' : 'down'
      const t = plc === 'down' ? r.bottom + 6 : r.top - menuH - 6
      const l = Math.min(r.right - menuW, window.innerWidth - menuW - 8)
      setPos({ top: t, left: l, placement: plc })
    }

    window.addEventListener('scroll', onRecalc, true)
    window.addEventListener('resize', onRecalc)
    return () => {
      window.removeEventListener('scroll', onRecalc, true)
      window.removeEventListener('resize', onRecalc)
    }
  }, [showMenu])

  useEffect(() => {
    if (!showMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showMenu])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/scans/${scanId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(data.error || 'Failed to delete scan')
        return
      }

      if (data?.success === true && data?.deleted) {
        setSuccessMsg(`Successfully deleted scan ${String(data.deleted).slice(0, 8)}.`)
        setShowModal(false)
        setShowSuccess(true)

        onDeleted?.()
        router.refresh()
      } else {
        alert('Delete did not confirm. Please retry.')
      }
    } catch {
      alert('Failed to delete scan')
    } finally {
      setIsDeleting(false)
      setShowModal(false)
    }
  }

  const handleExport = (format: 'json' | 'csv') => {
    window.open(`/api/scans/${scanId}/export?format=${format}`, '_blank')
    setShowMenu(false)
  }

  const menu = (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />

      {/* Menu */}
      <div
        className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[180px]"
        style={{ top: pos.top, left: pos.left }}
      >
        <button
          onClick={() => handleExport('json')}
          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </button>
        <button
          onClick={() => handleExport('csv')}
          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <hr className="my-1 border-slate-100" />
        <button
          onClick={() => { setShowMenu(false); setShowModal(true) }}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Scan
        </button>
      </div>
    </>
  )

  return (
    <>
      {!showLabels ? (
        <>
          <div className="relative">
            <button
              ref={btnRef}
              onClick={() => setShowMenu(v => !v)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              title="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {mounted && showMenu ? createPortal(menu, document.body) : null}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            title="Export as JSON"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition"
            title="Delete scan"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleDelete}
        title="Delete Scan"
        message={`Are you sure you want to delete this scan${scanCommit ? ` (${scanCommit.slice(0, 8)})` : ''}? All findings for this scan will be permanently deleted.`}
        confirmText="Delete Scan"
        confirmStyle="danger"
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        onConfirm={() => setShowSuccess(false)}
        title="Deleted"
        message={successMsg}
        confirmText="OK"
        isLoading={false}
      />
    </>
  )
}
