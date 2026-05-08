'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: number
  scrollable?: boolean
  confirmClose?: boolean
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 560, scrollable = true, confirmClose = false }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmClose) {
          if (window.confirm('Bạn chưa lưu thay đổi. Bạn có muốn thoát không?')) onClose()
        } else {
          onClose()
        }
      }
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, confirmClose])

  if (!open) return null

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== overlayRef.current) return
    if (confirmClose) {
      if (window.confirm('Bạn chưa lưu thay đổi. Bạn có muốn thoát không?')) onClose()
    } else {
      onClose()
    }
  }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-hdr">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>
        <div className={scrollable ? 'modal-scroll' : 'modal-body'}>
          {children}
        </div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
