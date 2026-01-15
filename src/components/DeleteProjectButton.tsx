'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

type Props = {
  projectId: string
  projectName: string
  redirectTo?: string
}

export default function DeleteProjectButton({
  projectId,
  projectName,
  redirectTo = "/dashboard/projects",
}: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        setShowModal(false)
        router.push(redirectTo)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to delete project')
      }
    } catch {
      alert('Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowModal(true)
        }}
        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        title={`Delete ${projectName}`}
        type="button"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <ConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectName}"? This will permanently delete all scans, findings, and suppressions. This action cannot be undone.`}
        confirmText="Delete Project"
        confirmStyle="danger"
        isLoading={isDeleting}
      />
    </>
  )
}
