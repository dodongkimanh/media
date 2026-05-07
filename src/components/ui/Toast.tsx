'use client'

import { useEffect, useRef } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!message) return
    const el = ref.current
    if (!el) return
    requestAnimationFrame(() => el.classList.add('show'))
    const t = setTimeout(() => {
      el.classList.remove('show')
      setTimeout(onClose, 300)
    }, 2800)
    return () => clearTimeout(t)
  }, [message, onClose])

  return (
    <div ref={ref} className={`toast${type === 'error' ? ' error' : ''}`}>
      {message}
    </div>
  )
}
