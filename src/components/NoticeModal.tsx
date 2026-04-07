'use client'

import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

type NoticeTone = 'info' | 'success' | 'warning' | 'error'

type Props = {
  isOpen: boolean
  onClose: () => void
  title: string
  message: React.ReactNode
  buttonText?: string
  tone?: NoticeTone
}

const TONE_STYLES: Record<NoticeTone, {
  icon: typeof Info
  iconWrap: string
  iconColor: string
  button: string
}> = {
  info: {
    icon: Info,
    iconWrap: 'bg-sky-100',
    iconColor: 'text-sky-600',
    button: 'bg-slate-900 hover:bg-slate-800 text-white',
  },
  success: {
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  warning: {
    icon: TriangleAlert,
    iconWrap: 'bg-amber-100',
    iconColor: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  error: {
    icon: AlertCircle,
    iconWrap: 'bg-red-100',
    iconColor: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700 text-white',
  },
}

export default function NoticeModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  tone = 'info',
}: Props) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose()
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const styles = TONE_STYLES[tone]
  const Icon = styles.icon

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${styles.iconWrap}`}>
                <Icon className={`h-5 w-5 ${styles.iconColor}`} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-400 transition hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5">
            <div className="text-sm text-slate-600">{message}</div>
          </div>

          <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 p-5">
            <button
              onClick={onClose}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${styles.button}`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
