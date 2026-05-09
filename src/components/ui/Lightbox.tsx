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

type ShareStatus = 'idle' | 'loading' | 'done' | 'copied' | 'error'

export function Lightbox({ items, initialIndex = 0, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex)
  const [downloading, setDownloading] = useState(false)
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle')

  useEffect(() => { setIdx(initialIndex) }, [initialIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + items.length) % items.length)
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % items.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items.length, onClose])

  useEffect(() => { setShareStatus('idle') }, [idx])

  const cur = items[idx]
  const isVideo = cur?.type === 'video' || /\.(mp4|mov|webm|avi)$/i.test(cur?.url ?? '')

  async function handleDownload() {
    if (!cur?.url) return
    setDownloading(true)
    try {
      const res = await fetch(cur.url)
      const blob = await res.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = cur.url.split('/').pop()?.split('?')[0] ?? (isVideo ? 'video' : 'image')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objUrl)
    } catch {
      window.open(cur.url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    if (!cur?.url || shareStatus === 'loading') return
    setShareStatus('loading')
    try {
      const res = await fetch(cur.url)
      const blob = await res.blob()
      const rawName = cur.url.split('/').pop()?.split('?')[0] ?? (isVideo ? 'video.mp4' : 'image.jpg')
      const title = isVideo ? 'Video' : 'Ảnh'
      const file = new File([blob], rawName, { type: blob.type })

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title })
        setShareStatus('done')
        setTimeout(() => setShareStatus('idle'), 2500)
        return
      }
      if (navigator.share) {
        await navigator.share({ url: cur.url, title })
        setShareStatus('done')
        setTimeout(() => setShareStatus('idle'), 2500)
        return
      }
      await navigator.clipboard.writeText(cur.url)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2500)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setShareStatus('idle')
        return
      }
      try {
        await navigator.clipboard.writeText(cur.url)
        setShareStatus('copied')
      } catch {
        setShareStatus('error')
      }
      setTimeout(() => setShareStatus('idle'), 2500)
    }
  }

  const shareLoading = shareStatus === 'loading'
  const shareDone    = shareStatus === 'done' || shareStatus === 'copied'

  const shareLabel =
    shareStatus === 'loading' ? 'Đang tải...' :
    shareStatus === 'done'    ? 'Đã chia sẻ!' :
    shareStatus === 'copied'  ? 'Đã copy link!' :
    shareStatus === 'error'   ? 'Không thể share' : ''

  const shareLabelColor = shareStatus === 'error' ? '#f87171' : '#4ade80'

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,.12)',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 12,
    transition: 'background .15s',
    flexShrink: 0,
  }

  return (
    <div id="lightbox" className="open">
      {/* Counter top-left */}
      <div style={{
        position: 'absolute',
        top: 'max(.75rem, env(safe-area-inset-top))',
        left: '1rem',
        color: 'rgba(255,255,255,.7)',
        fontSize: 13,
        zIndex: 2,
        pointerEvents: 'none',
      }}>
        {idx + 1} / {items.length}
      </div>

      {/* Image / video area */}
      <div className="lb-wrap">
        <button className="lb-nav" style={{ left: '.5rem' }}
          onClick={() => setIdx(i => (i - 1 + items.length) % items.length)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
        </button>

        <div id="lb-main">
          {isVideo
            ? <video src={cur.url} className="lb-video" controls autoPlay />
            : <img src={cur.url} className="lb-img" alt="" />
          }
        </div>

        <button className="lb-nav" style={{ right: '.5rem' }}
          onClick={() => setIdx(i => (i + 1) % items.length)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
        </button>
      </div>

      {/* Thumbnails strip */}
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

      {/* Bottom center toolbar */}
      <div style={{
        position: 'absolute',
        bottom: 'calc(max(1.2rem, env(safe-area-inset-bottom)) + ' + (items.length > 1 ? '72px' : '0px') + ')',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '.5rem',
        background: 'rgba(0,0,0,.55)',
        backdropFilter: 'blur(8px)',
        borderRadius: 16,
        padding: '.4rem .5rem',
        zIndex: 3,
      }}>
        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{ ...btnStyle, opacity: downloading ? .45 : 1 }}
          title="Tải xuống"
        >
          {downloading ? <Spinner /> : (
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M10 3v9M6.5 8.5L10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 14.5h12" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          disabled={shareLoading}
          style={{ ...btnStyle, opacity: shareLoading ? .45 : 1 }}
          title="Chia sẻ"
        >
          {shareLoading ? <Spinner /> : shareDone ? (
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="#4ade80" strokeWidth="1.8">
              <path d="M4 10l5 5 7-8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="15" cy="4" r="2.2"/>
              <circle cx="15" cy="16" r="2.2"/>
              <circle cx="5" cy="10" r="2.2"/>
              <path d="M7.1 8.9l5.8-3.3M7.1 11.1l5.8 3.3" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,.2)', margin: '0 .1rem' }} />

        {/* Close */}
        <button
          onClick={onClose}
          style={btnStyle}
          title="Đóng (Esc)"
        >
          <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M4 4l10 10M14 4L4 14"/>
          </svg>
        </button>

        {/* Feedback label */}
        {shareLabel !== '' && (
          <span style={{ fontSize: 12, color: shareLabelColor, whiteSpace: 'nowrap', paddingRight: '.25rem' }}>
            {shareLabel}
          </span>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ animation: 'spin .8s linear infinite' }}>
      <circle cx="9" cy="9" r="7" strokeOpacity=".25"/>
      <path d="M9 2a7 7 0 0 1 7 7" strokeLinecap="round"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  )
}
