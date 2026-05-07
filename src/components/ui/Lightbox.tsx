'use client'

import { useEffect, useState } from 'react'

interface LightboxMedia {
  url: string
  type?: 'image' | 'video'
}

interface LightboxProps {
  items: LightboxMedia[]
  initialIndex?: number
  onClose: () => void
}

export function Lightbox({ items, initialIndex = 0, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex)

  useEffect(() => {
    setIdx(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + items.length) % items.length)
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % items.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items.length, onClose])

  const cur = items[idx]
  const isVideo = cur?.type === 'video' || /\.(mp4|mov|webm|avi)$/i.test(cur?.url ?? '')

  return (
    <div id="lightbox" className="open">
      <div className="lb-top">
        <span className="lb-counter" style={{ color: 'rgba(255,255,255,.65)', fontSize: 13 }}>
          {idx + 1} / {items.length}
        </span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4l10 10M14 4L4 14" />
          </svg>
        </button>
      </div>

      <div className="lb-wrap">
        <button className="lb-nav" style={{ left: '.5rem' }} onClick={() => setIdx(i => (i - 1 + items.length) % items.length)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
        </button>

        <div id="lb-main">
          {isVideo
            ? <video src={cur.url} className="lb-video" controls autoPlay />
            : <img src={cur.url} className="lb-img" alt="" />
          }
        </div>

        <button className="lb-nav" style={{ right: '.5rem' }} onClick={() => setIdx(i => (i + 1) % items.length)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
        </button>
      </div>

      {items.length > 1 && (
        <div className="lb-strip">
          {items.map((it, i) => {
            const isV = it.type === 'video' || /\.(mp4|mov|webm|avi)$/i.test(it.url)
            return (
              <div key={i} className={`lb-th${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)}>
                {isV
                  ? <video src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                }
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
